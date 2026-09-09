import {minibossControls} from './miniboss-controls.mjs';
import {createLevelParty,levelCompanions,stepPartyControls} from '../../app/mariomortille/party.ts';
import { REPLAY_VERSION } from '../../app/mariomortille/scoring.ts';
import { quartierLevels } from '../../app/mariomortille/levels.ts';
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFile } from 'node:fs/promises';
import { registerHooks } from 'node:module';
import { Miniflare } from 'miniflare';
import { leaderboardQuery, progressQuery } from '../../db/ranking.ts';
import { firstLevel } from '../../app/mariomortille/first-level.ts';
import { createState, tick, WIDTH, HEIGHT } from '../../app/mariomortille/simulation.ts';
import { encodeControls, encodeReplay } from '../../app/mariomortille/replay-codec.ts';
registerHooks({ resolve(specifier, context, next) { if (specifier === 'cloudflare:workers') return { url: 'data:text/javascript,export const env = globalThis.__arcadeTestEnv', shortCircuit: true }; return next(specifier, context); } });
globalThis.__arcadeTestEnv = {};
const session = await import('../../app/api/arcade/session/route.ts');
const runs = await import('../../app/api/arcade/runs/route.ts');
const board = await import('../../app/api/arcade/leaderboard/route.ts');
function request(path, data, cookie) { return new Request(`http://arcade.test/api/arcade/${path}`, { method: data === undefined ? 'GET' : 'POST', headers: { ...(cookie ? { cookie } : {}), origin: 'http://arcade.test', 'content-type': 'application/json' }, ...(data === undefined ? {} : { body: JSON.stringify(data) }) }); }
// The exported env captures an object so bindings can be filled after module loading.
test('D1 migration, cookie ownership, authoritative finish, idempotence and coherent rankings', async () => {
  const mf = new Miniflare({ modules: true, script: 'export default { fetch() { return new Response("ok") } }', d1Databases: ['DB'] });
  try {
    const db = await mf.getD1Database('DB'); globalThis.__arcadeTestEnv.DB = db;
    for (const file of ['0000_clammy_supernaut.sql', '0001_dark_the_executioner.sql']) {
      const migration = await readFile(new URL(`../../drizzle/${file}`, import.meta.url), 'utf8');
      for (const sql of migration.split('--> statement-breakpoint').map(s => s.trim()).filter(Boolean)) await db.prepare(sql).run();
    }
    const guestResponse = await session.POST(request('session', { pseudo: 'Replay test' })); assert.equal(guestResponse.status, 200);
    const cookie = guestResponse.headers.get('set-cookie').split(';')[0];
    assert.match(guestResponse.headers.get('set-cookie'), /HttpOnly/);
    const guest = (await guestResponse.json()).player;
    const unauthorized = await runs.POST(request('runs', { action: 'start', gameId: 'mario', levelId: firstLevel.id })); assert.equal(unauthorized.status, 401);
    const start = await runs.POST(request('runs', { action: 'start', gameId: 'mario', levelId: firstLevel.id }, cookie)); assert.equal(start.status, 200);
    const { runId } = await start.json();
    const state = createState(firstLevel), party=createLevelParty(state,firstLevel,levelCompanions(firstLevel)), inputBytes = [], floor = new Map();
    for (const t of firstLevel.tiles) if (t.kind === 'ground') floor.set(t.x / 16, Math.min(floor.get(t.x / 16) ?? Infinity, t.y));
    while (!state.won && inputBytes.length < 10800) {
      const p = state.player, h = floor.get(Math.floor((p.x + WIDTH + 34) / 16));
      const obstacle = firstLevel.tiles.some(t => t.kind !== 'ground' && t.x >= p.x + WIDTH && t.x < p.x + WIDTH + 38 && t.y < p.y + HEIGHT && t.y + 16 > p.y);
      const enemy = state.enemies.some(e => !e.defeated && e.x > p.x && e.x - p.x < 64 && Math.abs(e.y + 20 - p.y - HEIGHT) < 20);
      let controls = { direction: 1, run: true, jump: true, jumpPressed: p.grounded && (h === undefined || h < p.y + HEIGHT - 3 || obstacle || enemy), powerPressed: p.power === 'turbo' && (!state.enemies.some(e => !e.defeated && e.x > p.x && e.x - p.x < 420) || state.enemies.some(e => !e.defeated && e.x > p.x && e.x - p.x < 90)), downPressed: false };
      controls=minibossControls(state,controls); inputBytes.push(encodeControls(controls)); stepPartyControls(party,state,firstLevel,controls);
    }
    assert.ok(state.won);
    const payload = { action: 'finish', runId, inputs: encodeReplay(inputBytes), score: 99999999 };
    assert.equal((await runs.POST(request('runs', payload, cookie))).status, 400, 'cannot submit the complete level immediately');
    await db.prepare('UPDATE arcade_runs SET started_at = ? WHERE id = ?').bind(Date.now() - state.ticks / 60 * 1000, runId).run();
    const before = performance.now();
    const finish = await runs.POST(request('runs', payload, cookie)); assert.equal(finish.status, 200); const actual = await finish.json();
    assert.equal(actual.score, state.score); assert.equal(actual.ticks, state.ticks);
    console.log(`Authoritative first-level replay: ${(performance.now() - before).toFixed(1)} ms for ${state.ticks} ticks.`);
    const retry = await runs.POST(request('runs', { action: 'finish', runId, inputs: 'bad' }, cookie)); assert.deepEqual(await retry.json(), actual, 'finish retry returns immutable saved result');
    const other = await session.POST(request('session', { pseudo: 'Other player' })); const otherCookie = other.headers.get('set-cookie').split(';')[0];
    assert.equal((await runs.POST(request('runs', payload, otherCookie))).status, 404);
    for (const [id, score, ticks, secrets, version] of [['high', 99999, 9000, 1, REPLAY_VERSION], ['fast', 5000, 7000, 3, REPLAY_VERSION], ['legacy', 999999, 1, 3, REPLAY_VERSION - 1]]) {
      await db.prepare('INSERT INTO arcade_runs(id, player_id, game_id, level_id, started_at, finished_at, score, ticks, secrets, replay_version) VALUES(?,?,?,?,?,?,?,?,?,?)').bind(id, guest.id, 'mario', firstLevel.id, 1, 2, score, ticks, secrets, version).run();
    }
    const scoreRows = await db.prepare(leaderboardQuery('score')).bind('mario', firstLevel.id, REPLAY_VERSION).all();
    assert.deepEqual(scoreRows.results, [{ pseudo: 'Replay test', score: 99999, ticks: 9000, secrets: 1 }]);
    const timeRows = await db.prepare(leaderboardQuery('time')).bind('mario', firstLevel.id, REPLAY_VERSION).all();
    assert.deepEqual(timeRows.results, [{ pseudo: 'Replay test', score: 5000, ticks: 7000, secrets: 3 }]);
    const progress = await db.prepare(progressQuery).bind(guest.id, REPLAY_VERSION).all(); assert.equal(progress.results[0].ticks, 9000);
    assert.equal((await board.GET(request('leaderboard?game=mario&level=missing'))).status, 400);
    // Current-version data must reach the public routes, not only direct SQL tests.
    const apiBoard = await board.GET(request(`leaderboard?game=mario&level=${firstLevel.id}`));
    assert.equal(apiBoard.status, 200); assert.deepEqual((await apiBoard.json()).entries, scoreRows.results);
    const apiProgress = await session.GET(request('session', undefined, cookie));
    assert.equal(apiProgress.status, 200); assert.equal((await apiProgress.json()).progress[0].ticks, 9000);
    const nextLevel = quartierLevels[1].id;
    assert.equal((await runs.POST(request('runs', { action: 'start', gameId: 'mario', levelId: nextLevel }, cookie))).status, 200, 'current victory unlocks next level');
    // Historical victories preserve campaign access without importing old competitive results.
    const oldPlayer = (await other.json()).player;
    await db.prepare('INSERT INTO arcade_runs(id, player_id, game_id, level_id, started_at, finished_at, score, ticks, secrets, replay_version) VALUES(?,?,?,?,?,?,?,?,?,?)').bind('previous-version-only', oldPlayer.id, 'mario', firstLevel.id, 1, 2, 9999999, 1, 3, REPLAY_VERSION - 1).run();
    assert.equal((await runs.POST(request('runs', { action: 'start', gameId: 'mario', levelId: nextLevel }, otherCookie))).status, 200, 'old victory preserves access to next level');
    const oldSession = await session.GET(request('session', undefined, otherCookie)); assert.deepEqual((await oldSession.json()).progress, [{gameId:'mario',levelId:firstLevel.id,score:null,ticks:null,secrets:null}]);
    const stillLocked = quartierLevels[2].id;
    await db.prepare('INSERT INTO arcade_runs(id, player_id, game_id, level_id, started_at, replay_version) VALUES(?,?,?,?,?,?)').bind('unfinished-legacy', oldPlayer.id, 'mario', nextLevel, 1, REPLAY_VERSION-1).run();
    assert.equal((await runs.POST(request('runs', {action:'start',gameId:'mario',levelId:stillLocked}, otherCookie))).status,403,'unfinished historical runs cannot unlock a stage');
    const newRun = await db.prepare('SELECT replay_version FROM arcade_runs WHERE player_id = ? AND level_id = ? AND id != ?').bind(oldPlayer.id,nextLevel,'unfinished-legacy').first();
    assert.equal(newRun.replay_version,REPLAY_VERSION,'unlocked run uses current simulation');
    assert.equal((await runs.POST(request('runs', { action: 'finish', runId: 'previous-version-only', inputs: payload.inputs }, otherCookie))).status, 409, 'old finish cannot silently return an obsolete result');
    const finalBoard = await board.GET(request(`leaderboard?game=mario&level=${firstLevel.id}`)); assert.deepEqual((await finalBoard.json()).entries, scoreRows.results);
    assert.ok(await db.prepare('SELECT id FROM arcade_runs WHERE id = ?').bind('previous-version-only').first(), 'history is preserved');
    const large = await runs.POST(request('runs', { inputs: 'a'.repeat(64001) }, cookie)); assert.equal(large.status, 413);
  } finally { delete globalThis.__arcadeTestEnv.DB; await mf.dispose(); }
});
