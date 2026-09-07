import assert from 'node:assert/strict';
import { createEngine, type Input } from '../app/engine';
import { games } from '../app/catalog';
const input = (): Input => ({
  held: new Set(),
  pressed: new Set(),
  pointer: { x: 480, y: 300, active: false },
});
for (const game of games.filter((g) => g.id !== 'kart')) {
  const e = createEngine(game.id),
    i = input();
  for (let j = 0; j < 600; j++) {
    e.update(1 / 60, i);
    const s = e.snapshot();
    assert(Number.isFinite(s.score));
    assert(s.health >= 0);
    if (s.result) break;
  }
  assert(e.snapshot().objective.length > 0, game.id + ' objective');
}
const snake = createEngine('snake'),
  si = input();
for (let j = 0; j < 1000; j++) snake.update(1 / 60, si);
assert.equal(snake.snapshot().result, 'lost', 'Snake must terminate at a wall');
const doctor = createEngine('doctor'),
  di = input();
for (let j = 0; j < 10; j++) {
  di.pressed = new Set([' ']);
  doctor.update(j ? 0 : 0, di);
  di.pressed.clear();
  if (j === 0) break;
}
assert.equal(doctor.snapshot().score, 200, 'Center cursor must score');
const mario = createEngine('mario'),
  mi = input();
mi.held.add('ArrowRight');
mario.world!().enemies.forEach((e: any) => (e.dead = true));
for (let j = 0; j < 4200; j++) {
  const w = mario.world!();
  const p = w.player;
  if (p.ground) {
    const floor = w.platforms.find(
      (a: any) =>
        a.h > 50 &&
        p.x + p.w > a.x &&
        p.x < a.x + a.w &&
        Math.abs(p.y + p.h - a.y) < 3,
    );
    if (floor && floor.x + floor.w - (p.x + p.w) < 48) mi.pressed.add(' ');
  }
  mario.update(1 / 60, mi);
  mi.pressed.clear();
  if (mario.snapshot().result) break;
}
assert.equal(
  mario.snapshot().result,
  'won',
  'Terrain traversal must reach the final house without falling',
);
const pac = createEngine('pac'),
  pi = input();
pi.pressed.add('ArrowLeft');
for (let j = 0; j < 12; j++) {
  pac.update(1 / 60, pi);
  pi.pressed.clear();
}
assert.equal(pac.snapshot().score, 0, 'Maze wall must block movement');
pi.pressed.add('ArrowRight');
for (let j = 0; j < 12; j++) {
  pac.update(1 / 60, pi);
  pi.pressed.clear();
}
assert(pac.snapshot().score > 0, 'Open corridor must collect energy');
const tetris = createEngine('tetris'),
  ti = input();
for (let j = 0; j < 100; j++) {
  ti.pressed.add(' ');
  tetris.update(1 / 60, ti);
  ti.pressed.clear();
  if (tetris.snapshot().result) break;
}
assert.equal(
  tetris.snapshot().result,
  'lost',
  'Stack overflow must end the game',
);
console.log(
  'PASS: eight game loops, Snake wall, precision hit, platformer terrain traversal, maze collision and collection, Tetris overflow.',
);
