import { env } from 'cloudflare:workers';
export function database(): D1Database { return (env as unknown as { DB: D1Database }).DB; }
export class ApiError extends Error { status: number; constructor(status: number, message: string) { super(message); this.status = status; } }
export function failure(error: unknown) { return Response.json({ error: error instanceof ApiError ? error.message : 'La sauvegarde est temporairement indisponible.' }, { status: error instanceof ApiError ? error.status : 503 }); }
export async function body(request: Request): Promise<Record<string, unknown>> {
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) throw new ApiError(403, 'Origine non autorisée.');
  const length = Number(request.headers.get('content-length'));
  if (length > 64000) throw new ApiError(413, 'Envoi trop volumineux.');
  const reader = request.body?.getReader(); const chunks: Uint8Array[] = []; let size = 0;
  if (reader) { while (true) { const { done, value } = await reader.read(); if (done) break; size += value.byteLength; if (size > 64000) { await reader.cancel(); throw new ApiError(413, 'Envoi trop volumineux.'); } chunks.push(value); } }
  const bytes = new Uint8Array(size); let offset = 0; for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  const raw = new TextDecoder().decode(bytes); if (raw.length > 64000) throw new ApiError(413, 'Envoi trop volumineux.');
  try { const value = JSON.parse(raw); if (!value || Array.isArray(value) || typeof value !== 'object') throw new Error(); return value; } catch { throw new ApiError(400, 'Données invalides.'); }
}
export async function hash(value: string) { return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))), b => b.toString(16).padStart(2, '0')).join(''); }
export type PlayerRecord = { id: string; pseudo: string };
export async function player(request: Request): Promise<PlayerRecord | null> {
  const token = request.headers.get('cookie')?.match(/(?:^|;\s*)mortille_guest=([a-f0-9]{64})(?:;|$)/)?.[1];
  if (!token) return null;
  return database().prepare('SELECT id, pseudo FROM arcade_players WHERE token_hash = ?').bind(await hash(token)).first<PlayerRecord>();
}
export async function requirePlayer(request: Request) { const found = await player(request); if (!found) throw new ApiError(401, 'Choisis ton pseudo pour sauvegarder.'); return found; }
