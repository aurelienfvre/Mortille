import { REPLAY_VERSION } from '../../../mariomortille/scoring';
import { progressQuery } from '../../../../db/ranking';
import { database, body, player, hash, failure, ApiError } from '../../../../db/runtime';
export async function GET(request: Request) {
  try {
    const guest = await player(request); if (!guest) return Response.json({ player: null, progress: [] }, { headers: { 'Cache-Control': 'no-store' } });
    const progress = await database().prepare(progressQuery).bind(guest.id, REPLAY_VERSION).all();
    return Response.json({ player: guest, progress: progress.results }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) { return failure(e); }
}
export async function POST(request: Request) {
  try {
    const data = await body(request); const pseudo = typeof data.pseudo === 'string' ? data.pseudo.trim().normalize('NFC') : '';
    if (!/^[\p{L}\p{N} _-]{2,20}$/u.test(pseudo)) throw new ApiError(400, 'Pseudo : 2 à 20 lettres, chiffres, espaces, tirets ou underscores.');
    const existing = await player(request);
    if (existing) { await database().prepare('UPDATE arcade_players SET pseudo = ? WHERE id = ?').bind(pseudo, existing.id).run(); return Response.json({ player: { ...existing, pseudo } }); }
    const token = Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2, '0')).join('');
    const id = crypto.randomUUID();
    await database().prepare('INSERT INTO arcade_players (id, token_hash, pseudo, created_at) VALUES (?, ?, ?, ?)').bind(id, await hash(token), pseudo, Date.now()).run();
    return Response.json({ player: { id, pseudo } }, { headers: { 'Set-Cookie': `mortille_guest=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=31536000${new URL(request.url).protocol === 'https:' ? '; Secure' : ''}`, 'Cache-Control': 'no-store' } });
  } catch (e) { return failure(e); }
}
