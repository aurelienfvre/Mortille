import { REPLAY_VERSION } from '../../../mariomortille/scoring';
import { database, failure, ApiError } from '../../../../db/runtime';
import { leaderboardQuery } from '../../../../db/ranking';
import { quartierLevels } from '../../../mariomortille/levels';
export async function GET(request: Request) {
  try {
    const url = new URL(request.url), game = url.searchParams.get('game') ?? 'mario', level = url.searchParams.get('level');
    if (game !== 'mario' || !quartierLevels.some(l => l.id === level)) throw new ApiError(400, 'Classement inconnu.');
    const order = url.searchParams.get('order') ?? 'score';
    if (order !== 'score' && order !== 'time') throw new ApiError(400, 'Tri inconnu.');
    const results = await database().prepare(leaderboardQuery(order)).bind(game, level, REPLAY_VERSION).all();
    return Response.json({ entries: results.results }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) { return failure(e); }
}
