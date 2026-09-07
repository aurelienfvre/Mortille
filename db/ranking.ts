/** ROW_NUMBER keeps the score, time and secrets from the same actual run. */
export function leaderboardQuery(order: 'score' | 'time') {
  const sort = order === 'time' ? 'ticks ASC, score DESC' : 'score DESC, ticks ASC';
  return `WITH ranked AS (
    SELECT r.player_id, r.score, r.ticks, r.secrets, r.finished_at, r.id,
      ROW_NUMBER() OVER (PARTITION BY r.player_id ORDER BY ${sort}, r.finished_at ASC, r.id ASC) AS best
    FROM arcade_runs r WHERE r.game_id = ? AND r.level_id = ? AND r.finished_at IS NOT NULL AND r.replay_version = ?
  ) SELECT p.pseudo, r.score, r.ticks, r.secrets FROM ranked r JOIN arcade_players p ON p.id = r.player_id
    WHERE r.best = 1 ORDER BY ${sort}, r.finished_at ASC, r.id ASC LIMIT 50`;
}
export const progressQuery = `WITH ranked AS (
  SELECT game_id, level_id, score, ticks, secrets,
    ROW_NUMBER() OVER (PARTITION BY game_id, level_id ORDER BY score DESC, ticks ASC, finished_at ASC, id ASC) AS best
  FROM arcade_runs WHERE player_id = ? AND finished_at IS NOT NULL AND replay_version = ?
) SELECT game_id AS gameId, level_id AS levelId, score, ticks, secrets FROM ranked WHERE best = 1 ORDER BY game_id, level_id`;
