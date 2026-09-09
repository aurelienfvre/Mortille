import { unlockQuery } from '../../../../db/ranking';
import { database, body, requirePlayer, failure, ApiError } from '../../../../db/runtime';
import { quartierLevels } from '../../../mariomortille/levels';
import { calculateResult, REPLAY_VERSION } from '../../../mariomortille/scoring';
export async function POST(request: Request) {
  try {
    const data = await body(request), guest = await requirePlayer(request), db = database();
    if (data.action === 'start') {
      if (data.gameId !== 'mario') throw new ApiError(400, 'Jeu inconnu.');
      const index = quartierLevels.findIndex(l => l.id === data.levelId); if (index < 0) throw new ApiError(400, 'Niveau inconnu.');
      if (index > 0) { const unlocked = await db.prepare(unlockQuery).bind(guest.id, 'mario', quartierLevels[index - 1].id, REPLAY_VERSION).first(); if (!unlocked) throw new ApiError(403, 'Termine le niveau précédent.'); }
      const recent = await db.prepare('SELECT COUNT(*) AS count FROM arcade_runs WHERE player_id = ? AND started_at > ?').bind(guest.id, Date.now() - 60000).first<{ count: number }>();
      if ((recent?.count ?? 0) >= 12) throw new ApiError(429, 'Attends quelques secondes avant de relancer.');
      const id = crypto.randomUUID(); await db.prepare('INSERT INTO arcade_runs (id, player_id, game_id, level_id, started_at, replay_version) VALUES (?, ?, ?, ?, ?, ?)').bind(id, guest.id, 'mario', data.levelId, Date.now(), REPLAY_VERSION).run();
      return Response.json({ runId: id });
    }
    if (data.action !== 'finish' || typeof data.runId !== 'string') throw new ApiError(400, 'Action inconnue.');
    const run = await db.prepare('SELECT id, level_id, started_at, finished_at, score, ticks, secrets, replay_version FROM arcade_runs WHERE id = ? AND player_id = ?').bind(data.runId, guest.id).first<{ id: string; level_id: string; started_at: number; finished_at: number | null; score: number; ticks: number; secrets: number; replay_version: number }>();
    if (!run) throw new ApiError(404, 'Partie introuvable.');
    if (run.replay_version !== REPLAY_VERSION) throw new ApiError(409, 'Le jeu a changé : relance une partie pour enregistrer ton score.');
    if (run.finished_at !== null) return Response.json({ score: run.score, ticks: run.ticks, secrets: run.secrets });
    const level = quartierLevels.find(l => l.id === run.level_id); if (!level) throw new ApiError(400, 'Niveau indisponible.');
    let result; try { result = calculateResult(level, data, Date.now() - run.started_at); } catch (e) { throw new ApiError(400, (e as Error).message); }
    await db.prepare('UPDATE arcade_runs SET finished_at = ?, score = ?, ticks = ?, secrets = ? WHERE id = ? AND player_id = ? AND finished_at IS NULL').bind(Date.now(), result.score, result.ticks, result.secrets, run.id, guest.id).run();
    const saved = await db.prepare('SELECT score, ticks, secrets FROM arcade_runs WHERE id = ? AND player_id = ?').bind(run.id, guest.id).first();
    return Response.json(saved);
  } catch (e) { return failure(e); }
}
