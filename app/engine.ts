import { drawSprite } from './sprites';
import type { GameId } from './catalog';
export type Input = {
  held: Set<string>;
  pressed: Set<string>;
  pointer: { x: number; y: number; active: boolean };
};
export type Snapshot = {
  score: number;
  health: number;
  objective: string;
  result: null | 'won' | 'lost';
};
export type Engine = {
  update: (dt: number, input: Input) => void;
  draw: (c: CanvasRenderingContext2D) => void;
  snapshot: () => Snapshot;
  world?: () => any;
};
export const W = 960,
  H = 600;
const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));
const hit = (a: any, b: any) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const down = (i: Input, ...keys: string[]) => keys.some((k) => i.held.has(k));
const press = (i: Input, ...keys: string[]) =>
  keys.some((k) => i.pressed.has(k));
const text = (
  c: CanvasRenderingContext2D,
  s: string,
  x: number,
  y: number,
  size = 18,
  color = '#e7eee3',
) => {
  c.fillStyle = color;
  c.font = `600 ${size}px monospace`;
  c.textAlign = 'center';
  c.fillText(s, x, y);
};
function rect(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
  r = 5,
) {
  c.fillStyle = color;
  c.beginPath();
  c.roundRect(x, y, w, h, r);
  c.fill();
}
function circle(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  color: string,
) {
  c.fillStyle = color;
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
  c.fill();
}
function energy(c: CanvasRenderingContext2D, x: number, y: number, r = 9) {
  drawSprite(c, 'energy', x, y, r / 6);
}
function yeti(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  s = 1,
  face = 1,
) {
  drawSprite(
    c,
    'gorilla',
    x,
    y - 13,
    s * 2,
    Math.floor(performance.now() / 120) % 4,
    face < 0,
  );
}
function base(c: CanvasRenderingContext2D, t = 0) {
  c.fillStyle = '#10272f';
  c.fillRect(0, 0, W, H);
  c.strokeStyle = '#234149';
  c.lineWidth = 1;
  for (let x = 0; x < W; x += 40) {
    c.beginPath();
    c.moveTo(x, 0);
    c.lineTo(x, H);
    c.stroke();
  }
  for (let y = 0; y < H; y += 40) {
    c.beginPath();
    c.moveTo(0, y);
    c.lineTo(W, y);
    c.stroke();
  }
  for (let i = 0; i < 24; i++)
    circle(c, (i * 173) % W, (i * 97 + t * 5) % H, 1, '#426169');
}
function landscape(c: CanvasRenderingContext2D, cam = 0) {
  const g = c.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#6aafbe');
  g.addColorStop(0.8, '#d0e4ce');
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);
  circle(c, 800 - cam * 0.07, 95, 48, '#f5db97');
  for (let i = 0; i < 15; i++) {
    let x = i * 200 - cam * 0.23;
    rect(
      c,
      x,
      270 - (i % 3) * 50,
      145,
      300,
      ['#9abfae', '#a5c9b6', '#b2cebd'][i % 3],
      9,
    );
    for (let j = 0; j < 3; j++)
      for (let k = 0; k < 3; k++)
        rect(
          c,
          x + 20 + j * 37,
          295 - (i % 3) * 50 + k * 52,
          18,
          27,
          '#d2e2cc',
          3,
        );
  }
  c.fillStyle = '#b9d2b9';
  c.fillRect(0, 485, W, 115);
}
function drone(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  color = '#f38e78',
) {
  drawSprite(c, 'drone', x, y, 2, Math.floor(performance.now() / 200) % 2);
}
export function createEngine(
  id: GameId,
  sound: (n?: number) => void = () => {},
): Engine {
  const st: Snapshot = { score: 0, health: 3, objective: '', result: null };
  let world: (() => any) | undefined;
  let t = 0;
  let update: (dt: number, i: Input) => void = () => {};
  let draw: (c: CanvasRenderingContext2D) => void = () => {};
  const win = () => {
    st.result = 'won';
    sound(880);
  };
  const lose = () => {
    st.result = 'lost';
    sound(110);
  };
  const hurt = () => {
    st.health--;
    sound(140);
    if (st.health <= 0) lose();
  };
  if (id === 'mario' || id === 'strike') {
    const strike = id === 'strike';
    const p = {
      x: 70,
      y: 385,
      w: 32,
      h: 45,
      vx: 0,
      vy: 0,
      ground: false,
      face: 1,
    };
    let cam = 0,
      immune = 0,
      shot = 0;
    const platforms = [
      { x: 0, y: 480, w: 460, h: 120 },
      { x: 560, y: 460, w: 340, h: 140 },
      { x: 990, y: 440, w: 420, h: 160 },
      { x: 1500, y: 480, w: 420, h: 120 },
      { x: 2030, y: 440, w: 350, h: 160 },
      { x: 2460, y: 460, w: 360, h: 140 },
      { x: 2910, y: 480, w: 620, h: 120 },
      ...Array.from({ length: 10 }, (_, i) => ({
        x: 220 + i * 280,
        y: 340 - (i % 2) * 45,
        w: 120,
        h: 24,
      })),
    ];
    const coins = Array.from({ length: 26 }, (_, i) => ({
      x: 155 + i * 123,
      y: i % 2 ? 290 : 405,
      got: false,
    }));
    const enemies = Array.from({ length: strike ? 12 : 8 }, (_, i) => ({
      x: 340 + i * (strike ? 245 : 370),
      y: 405,
      base: 340 + i * (strike ? 245 : 370),
      dead: false,
    }));
    const bullets: { x: number; y: number; dir: number }[] = [];
    let kills = 0;
    world = () => ({
      player: p,
      platforms,
      coins,
      enemies,
      bullets,
      cam,
      immune,
      time: t,
    });
    update = (dt, i) => {
      immune -= dt;
      shot -= dt;
      const move =
        Number(down(i, 'ArrowRight', 'd')) -
        Number(down(i, 'ArrowLeft', 'q', 'a'));
      p.vx = move * 260;
      if (move) p.face = move;
      if (press(i, strike ? 'ArrowUp' : ' ', 'z', 'w', 'jump') && p.ground) {
        p.vy = -600;
        p.ground = false;
        sound(420);
      }
      if (strike && down(i, ' ', 'fire') && shot <= 0) {
        bullets.push({ x: p.x + 16, y: p.y + 20, dir: p.face });
        shot = 0.23;
        sound(300);
      }
      const old = p.y + p.h;
      p.x = clamp(p.x + p.vx * dt, 0, 3450);
      p.vy += 1500 * dt;
      p.y += p.vy * dt;
      p.ground = false;
      for (const a of platforms) {
        if (
          p.x + p.w > a.x &&
          p.x < a.x + a.w &&
          old <= a.y + 3 &&
          p.y + p.h >= a.y &&
          p.vy >= 0
        ) {
          p.y = a.y - p.h;
          p.vy = 0;
          p.ground = true;
        }
      }
      if (p.y > H + 100) {
        hurt();
        p.x = Math.max(
          30,
          platforms.filter((a) => a.h > 50 && a.x < p.x).at(-1)!.x + 35,
        );
        p.y = 260;
        p.vy = 0;
        immune = 2;
      }
      for (const coin of coins)
        if (
          !coin.got &&
          Math.hypot(p.x + 16 - coin.x, p.y + 20 - coin.y) < 33
        ) {
          coin.got = true;
          st.score += 100;
          sound(740);
        }
      enemies.forEach((e, j) => {
        e.x = e.base + Math.sin(t * 1.3 + j) * 55;
        e.y = 390 + Math.sin(t * 2 + j) * 25;
        if (!e.dead && hit(p, { x: e.x - 18, y: e.y - 14, w: 36, h: 28 })) {
          if (!strike && p.vy > 50 && p.y + p.h < e.y + 14) {
            e.dead = true;
            st.score += 200;
            p.vy = -410;
            sound(560);
          } else if (immune <= 0) {
            hurt();
            immune = 2;
            p.vy = -240;
          }
        }
      });
      for (const b of bullets) {
        b.x += b.dir * 620 * dt;
        for (const e of enemies)
          if (!e.dead && Math.abs(b.x - e.x) < 28 && Math.abs(b.y - e.y) < 28) {
            e.dead = true;
            b.x = -10000;
            kills++;
            st.score += 250;
            sound(650);
          }
      }
      for (let j = bullets.length - 1; j >= 0; j--)
        if (Math.abs(bullets[j].x - p.x) > 1000) bullets.splice(j, 1);
      cam = clamp(p.x - 290, 0, 2570);
      if (strike) {
        st.objective = `Drones neutralisés : ${kills} / 12`;
        if (kills === 12) win();
      } else {
        st.objective = `Quartier rénové : ${Math.floor(p.x / 34.5)} %`;
        if (p.x > 3370) {
          st.score += 500;
          win();
        }
      }
    };
    draw = (c) => {
      landscape(c, cam);
      c.save();
      c.translate(-cam, 0);
      for (const a of platforms) {
        rect(c, a.x, a.y, a.w, a.h, '#455e54', 3);
        rect(c, a.x, a.y, a.w, 8, '#a7ce8d', 3);
        for (let x = a.x + 15; x < a.x + a.w; x += 45)
          rect(c, x, a.y + 16, 22, 5, '#6b8671', 1);
      }
      for (const a of coins)
        if (!a.got) energy(c, a.x, a.y + Math.sin(t * 3 + a.x) * 4);
      for (const e of enemies) if (!e.dead) drone(c, e.x, e.y);
      for (const b of bullets) rect(c, b.x - 7, b.y - 3, 14, 6, '#fcde89', 3);
      if (immune <= 0 || Math.sin(t * 30) > 0)
        yeti(c, p.x + 16, p.y + 31, 1, p.face);
      drawSprite(c, 'house', 3400, 391, 8);
      c.restore();
    };
  } else if (id === 'pong') {
    let py = 235,
      ai = 235,
      bx = 480,
      by = 300,
      vx = 330,
      vy = 150,
      a = 0,
      b = 0,
      wait = 0.6;
    st.health = 7;
    st.objective = 'Premier à 7 points';
    const reset = (dir: number) => {
      bx = 480;
      by = 300;
      vx = dir * 330;
      vy = 140 * (Math.random() > 0.5 ? 1 : -1);
      wait = 0.7;
    };
    update = (dt, i) => {
      if (i.pointer.active) py = clamp(i.pointer.y - 65, 25, 445);
      else
        py = clamp(
          py +
            (Number(down(i, 'ArrowDown', 's')) -
              Number(down(i, 'ArrowUp', 'z', 'w'))) *
              420 *
              dt,
          25,
          445,
        );
      ai = clamp(ai + clamp(by - ai - 65, -1, 1) * 235 * dt, 25, 445);
      wait -= dt;
      if (wait > 0) return;
      bx += vx * dt;
      by += vy * dt;
      if (by < 20 || by > 580) {
        by = clamp(by, 20, 580);
        vy *= -1;
        sound(280);
      }
      if (vx < 0 && bx < 66 && bx > 35 && by > py - 8 && by < py + 138) {
        bx = 66;
        vx = Math.min(660, -vx * 1.05);
        vy = (by - py - 65) * 5;
        sound(430);
      }
      if (vx > 0 && bx > 894 && bx < 925 && by > ai - 8 && by < ai + 138) {
        bx = 894;
        vx = -Math.min(660, vx * 1.05);
        vy = (by - ai - 65) * 5;
        sound(390);
      }
      if (bx < 0) {
        b++;
        st.health = 7 - b;
        reset(1);
      }
      if (bx > 960) {
        a++;
        st.score = a * 100;
        reset(-1);
      }
      st.objective = `VOUS ${a} — ${b} MACHINE`;
      if (a >= 7) win();
      if (b >= 7) lose();
    };
    draw = (c) => {
      base(c, t);
      c.setLineDash([10, 15]);
      c.strokeStyle = '#4b6c6e';
      c.beginPath();
      c.moveTo(480, 25);
      c.lineTo(480, 575);
      c.stroke();
      c.setLineDash([]);
      text(c, String(a), 370, 110, 72, '#365859');
      text(c, String(b), 590, 110, 72, '#365859');
      rect(c, 40, py, 18, 130, '#a7e0c5', 8);
      rect(c, 902, ai, 18, 130, '#f1b581', 8);
      circle(c, bx, by, 10, '#eff3db');
    };
  } else if (id === 'snake') {
    const size = 24,
      ox = 120,
      oy = 36,
      cols = 30,
      rows = 22;
    let body = [
        { x: 10, y: 10 },
        { x: 9, y: 10 },
        { x: 8, y: 10 },
      ],
      dir = { x: 1, y: 0 },
      next = { x: 1, y: 0 },
      acc = 0,
      n = 0;
    let food = { x: 19, y: 10 };
    const newFood = () => {
      const free = [];
      for (let x = 0; x < cols; x++)
        for (let y = 0; y < rows; y++)
          if (!body.some((b) => b.x === x && b.y === y)) free.push({ x, y });
      food = free[Math.floor(Math.random() * free.length)];
    };
    st.health = 1;
    update = (dt, i) => {
      for (const [key, x, y] of [
        ['ArrowUp', 0, -1],
        ['z', 0, -1],
        ['w', 0, -1],
        ['ArrowDown', 0, 1],
        ['s', 0, 1],
        ['ArrowLeft', -1, 0],
        ['q', -1, 0],
        ['a', -1, 0],
        ['ArrowRight', 1, 0],
        ['d', 1, 0],
      ] as [string, number, number][]) {
        if (press(i, key) && !(x === -dir.x && y === -dir.y)) next = { x, y };
      }
      acc += dt;
      if (acc > 0.15 - Math.min(n * 0.003, 0.07)) {
        acc = 0;
        dir = next;
        const h = { x: body[0].x + dir.x, y: body[0].y + dir.y };
        const eat = h.x === food.x && h.y === food.y;
        if (
          h.x < 0 ||
          h.y < 0 ||
          h.x >= cols ||
          h.y >= rows ||
          body
            .slice(0, eat ? undefined : -1)
            .some((b) => b.x === h.x && b.y === h.y)
        ) {
          lose();
          return;
        }
        body.unshift(h);
        if (eat) {
          n++;
          st.score += 100;
          sound(600 + n * 15);
          if (n === 20) win();
          else newFood();
        } else body.pop();
      }
      st.objective = `Cellules connectées : ${n} / 20`;
    };
    draw = (c) => {
      base(c, t);
      rect(c, ox - 8, oy - 8, cols * size + 16, rows * size + 16, '#658879', 9);
      rect(c, ox, oy, cols * size, rows * size, '#17332f', 4);
      for (let x = 0; x < cols; x++)
        for (let y = 0; y < rows; y++)
          if ((x + y) % 2 === 0)
            rect(c, ox + x * size, oy + y * size, size, size, '#1c3933', 0);
      body.forEach((b, j) =>
        rect(
          c,
          ox + b.x * size + 2,
          oy + b.y * size + 2,
          20,
          20,
          j ? '#87b98b' : '#d1e7a4',
          6,
        ),
      );
      energy(c, ox + food.x * size + 12, oy + food.y * size + 12, 8);
      const h = body[0];
      circle(
        c,
        ox + h.x * size + 12 + dir.x * 5 - dir.y * 4,
        oy + h.y * size + 12 + dir.y * 5 + dir.x * 4,
        2,
        '#19342d',
      );
      circle(
        c,
        ox + h.x * size + 12 + dir.x * 5 + dir.y * 4,
        oy + h.y * size + 12 + dir.y * 5 - dir.x * 4,
        2,
        '#19342d',
      );
    };
  } else if (id === 'doctor') {
    let n = 0,
      pos = 0,
      feedback = '',
      flash = 0,
      cool = 0;
    st.objective = 'Réparations : 0 / 10';
    update = (dt, i) => {
      cool -= dt;
      flash -= dt;
      pos = (Math.sin(t * (2.2 + n * 0.22)) + 1) / 2;
      if (press(i, ' ', 'fire', 'jump') && cool <= 0) {
        cool = 0.65;
        const width = Math.max(0.09, 0.19 - n * 0.008);
        if (Math.abs(pos - 0.5) < width / 2) {
          n++;
          st.score += 200;
          feedback = 'TEMPÉRATURE STABILISÉE';
          sound(720);
          if (n >= 10) win();
        } else {
          hurt();
          feedback = 'SURCHAUFFE — RÉESSAYEZ';
        }
        flash = 1.2;
      }
      st.objective = `Réparations : ${n} / 10`;
    };
    draw = (c) => {
      base(c, t);
      drawSprite(c, 'boiler', 480, 210, 11);
      text(c, `CHAUDIÈRE ${n + 1}`, 480, 54, 16, '#afdebf');
      rect(c, 170, 397, 620, 36, '#294951', 18);
      const width = Math.max(0.09, 0.19 - n * 0.008) * 620;
      rect(c, 480 - width / 2, 397, width, 36, '#acd19c', 6);
      rect(c, 170 + pos * 620 - 5, 384, 10, 62, '#f3dc9c', 5);
      text(c, 'ARRÊTEZ LE CURSEUR DANS LA ZONE VERTE', 480, 480, 16, '#afc5b7');
      if (flash > 0)
        text(
          c,
          feedback,
          480,
          533,
          17,
          feedback.startsWith('SUR') ? '#efa48b' : '#c8e2aa',
        );
      else text(c, 'ESPACE / TOUCHER', 480, 533, 16, '#e2d3a6');
    };
  } else if (id === 'invaders') {
    let px = 480,
      shot = 0,
      wave = 1,
      dir = 1,
      spawn = 0,
      immune = 0;
    let enemies: { x: number; y: number; alive: boolean }[] = [],
      bullets: { x: number; y: number; enemy: boolean }[] = [];
    const reset = () => {
      enemies = Array.from({ length: 24 }, (_, i) => ({
        x: 170 + (i % 8) * 85,
        y: 65 + Math.floor(i / 8) * 55,
        alive: true,
      }));
      bullets = [];
    };
    reset();
    update = (dt, i) => {
      px = clamp(
        px +
          (Number(down(i, 'ArrowRight', 'd')) -
            Number(down(i, 'ArrowLeft', 'a', 'q'))) *
            410 *
            dt,
        35,
        925,
      );
      shot -= dt;
      immune -= dt;
      spawn -= dt;
      if (down(i, ' ', 'fire') && shot <= 0) {
        bullets.push({ x: px, y: 520, enemy: false });
        shot = 0.19;
        sound(350);
      }
      let edge = false;
      for (const e of enemies)
        if (e.alive) {
          e.x += dir * (38 + wave * 12) * dt;
          if (e.x < 40 || e.x > 920) edge = true;
          if (e.y > 490) lose();
        }
      if (edge) {
        dir *= -1;
        enemies.forEach((e) => {
          e.y += 23;
          e.x = clamp(e.x, 41, 919);
        });
      }
      if (spawn <= 0) {
        const living = enemies.filter((e) => e.alive);
        if (living.length) {
          const e = living[Math.floor(Math.random() * living.length)];
          bullets.push({ x: e.x, y: e.y + 20, enemy: true });
        }
        spawn = 0.8 / wave;
      }
      for (const b of bullets) {
        b.y += (b.enemy ? 220 + wave * 35 : -600) * dt;
        if (!b.enemy) {
          for (const e of enemies)
            if (
              e.alive &&
              Math.abs(b.x - e.x) < 25 &&
              Math.abs(b.y - e.y) < 19
            ) {
              e.alive = false;
              b.y = -200;
              st.score += 100;
              sound(620);
            }
        } else if (
          immune <= 0 &&
          Math.abs(b.x - px) < 25 &&
          b.y > 510 &&
          b.y < 553
        ) {
          hurt();
          immune = 1.5;
          b.y = 800;
        }
      }
      bullets = bullets.filter((b) => b.y > -30 && b.y < 630);
      if (enemies.every((e) => !e.alive)) {
        if (wave === 3) win();
        else {
          wave++;
          reset();
        }
      }
      st.objective = `Vague ${wave} / 3 · ${enemies.filter((e) => e.alive).length} gaspilleurs`;
    };
    draw = (c) => {
      base(c, t);
      for (const e of enemies) if (e.alive) drone(c, e.x, e.y, '#b3a5e7');
      for (const b of bullets)
        rect(c, b.x - 3, b.y - 8, 6, 16, b.enemy ? '#f2a182' : '#d9edae', 3);
      if (immune <= 0 || Math.sin(t * 30) > 0) {
        drawSprite(c, 'ship', px, 532, 2.8);
      }
      rect(c, 20, 570, 920, 2, '#59847b', 0);
    };
  } else if (id === 'pac') {
    const map = [
      '#####################',
      '#.........#.........#',
      '#.###.###.#.###.###.#',
      '#...................#',
      '#.###.#.#####.#.###.#',
      '#.....#...#...#.....#',
      '#####.###.#.###.#####',
      '#.....#.......#.....#',
      '#.###.#.#####.#.###.#',
      '#...#...........#...#',
      '###.#.###.#.###.#.###',
      '#.........#.........#',
      '#.###.###.#.###.###.#',
      '#...................#',
      '#####################',
    ];
    const cell = 34,
      ox = 123,
      oy = 45;
    const dots = new Set<string>();
    map.forEach((r, y) =>
      r.split('').forEach((v, x) => {
        if (v === '.') dots.add(`${x},${y}`);
      }),
    );
    let p = { x: 1, y: 1 },
      dir = { x: 0, y: 0 },
      next = { x: 0, y: 0 },
      acc = 0,
      gacc = 0,
      immune = 0;
    const ghosts = [
      { x: 19, y: 13 },
      { x: 19, y: 1 },
      { x: 1, y: 13 },
    ];
    const walk = (x: number, y: number) =>
      map[y]?.[x] !== undefined && map[y][x] !== '#';
    dots.delete('1,1');
    const total = dots.size;
    update = (dt, i) => {
      immune -= dt;
      for (const [k, x, y] of [
        ['ArrowUp', 0, -1],
        ['z', 0, -1],
        ['w', 0, -1],
        ['ArrowDown', 0, 1],
        ['s', 0, 1],
        ['ArrowLeft', -1, 0],
        ['q', -1, 0],
        ['a', -1, 0],
        ['ArrowRight', 1, 0],
        ['d', 1, 0],
      ] as [string, number, number][]) {
        if (press(i, k)) next = { x, y };
      }
      acc += dt;
      gacc += dt;
      if (acc > 0.13) {
        acc = 0;
        if (walk(p.x + next.x, p.y + next.y)) dir = next;
        if (walk(p.x + dir.x, p.y + dir.y))
          p = { x: p.x + dir.x, y: p.y + dir.y };
        if (dots.delete(`${p.x},${p.y}`)) {
          st.score += 10;
          sound(550);
        }
        if (dots.size === 0) win();
      }
      if (gacc > 0.31) {
        gacc = 0;
        ghosts.forEach((g, n) => {
          const options = [
            { x: 0, y: -1 },
            { x: 0, y: 1 },
            { x: 1, y: 0 },
            { x: -1, y: 0 },
          ]
            .map((d) => ({ x: g.x + d.x, y: g.y + d.y }))
            .filter((q) => walk(q.x, q.y));
          options.sort(
            (a, b) =>
              Math.hypot(a.x - p.x, a.y - p.y) -
              Math.hypot(b.x - p.x, b.y - p.y),
          );
          const q =
            options[
              Math.random() < (n === 0 ? 0.25 : 0.45)
                ? Math.floor(Math.random() * options.length)
                : 0
            ];
          if (q) {
            g.x = q.x;
            g.y = q.y;
          }
        });
      }
      for (const g of ghosts)
        if (g.x === p.x && g.y === p.y && immune <= 0) {
          hurt();
          p = { x: 1, y: 1 };
          dir = { x: 0, y: 0 };
          next = dir;
          immune = 3;
        }
      st.objective = `Énergie récupérée : ${total - dots.size} / ${total}`;
    };
    draw = (c) => {
      base(c, t);
      map.forEach((r, y) =>
        r.split('').forEach((v, x) => {
          if (v === '#') {
            rect(
              c,
              ox + x * cell + 2,
              oy + y * cell + 2,
              cell - 4,
              cell - 4,
              '#466e76',
              7,
            );
            rect(
              c,
              ox + x * cell + 5,
              oy + y * cell + 4,
              cell - 10,
              4,
              '#698c89',
              2,
            );
          }
        }),
      );
      for (const d of dots) {
        const [x, y] = d.split(',').map(Number);
        circle(c, ox + x * cell + 17, oy + y * cell + 17, 3, '#e6d498');
      }
      if (immune <= 0 || Math.sin(t * 25) > 0) {
        drawSprite(
          c,
          'pac',
          ox + p.x * cell + 17,
          oy + p.y * cell + 17,
          2,
          Math.floor(t * 8) % 2,
          dir.x < 0,
        );
      }
      ghosts.forEach((g, n) => {
        drone(
          c,
          ox + g.x * cell + 17,
          oy + g.y * cell + 17,
          ['#dd9185', '#b8a2d8', '#7ebccb'][n],
        );
      });
    };
  } else if (id === 'tetris') {
    const cols = 10,
      rows = 20,
      cell = 26,
      ox = 350,
      oy = 40;
    const grid = Array.from({ length: rows }, () => Array(cols).fill(0));
    const shapes = [
      [[1, 1, 1, 1]],
      [
        [1, 1],
        [1, 1],
      ],
      [
        [0, 1, 0],
        [1, 1, 1],
      ],
      [
        [1, 0, 0],
        [1, 1, 1],
      ],
      [
        [0, 0, 1],
        [1, 1, 1],
      ],
      [
        [0, 1, 1],
        [1, 1, 0],
      ],
      [
        [1, 1, 0],
        [0, 1, 1],
      ],
    ];
    const colors = [
      '',
      '#83c4cf',
      '#e8d38a',
      '#c49ccf',
      '#7c9fc9',
      '#e9ae79',
      '#a3cfa4',
      '#e49999',
    ];
    let shape = shapes[0],
      piece = 1,
      x = 3,
      y = 0,
      acc = 0,
      repeat = 0,
      lines = 0;
    const valid = (s = shape, px = x, py = y) =>
      s.every((r, dy) =>
        r.every(
          (v, dx) =>
            !v ||
            (px + dx >= 0 &&
              px + dx < cols &&
              py + dy < rows &&
              (py + dy < 0 || grid[py + dy][px + dx] === 0)),
        ),
      );
    const spawnPiece = () => {
      piece = 1 + Math.floor(Math.random() * 7);
      shape = shapes[piece - 1].map((r) => r.slice());
      x = 3;
      y = 0;
      if (!valid()) lose();
    };
    spawnPiece();
    const land = () => {
      shape.forEach((r, dy) =>
        r.forEach((v, dx) => {
          if (v && y + dy >= 0) grid[y + dy][x + dx] = piece;
        }),
      );
      let cleared = 0;
      for (let r = rows - 1; r >= 0; r--)
        if (grid[r].every(Boolean)) {
          grid.splice(r, 1);
          grid.unshift(Array(cols).fill(0));
          r++;
          cleared++;
        }
      if (cleared) {
        lines += cleared;
        st.score += [0, 100, 300, 500, 800][cleared];
        sound(600 + cleared * 100);
      }
      if (lines >= 10) win();
      else spawnPiece();
    };
    update = (dt, i) => {
      repeat -= dt;
      const move =
        Number(down(i, 'ArrowRight', 'd')) -
        Number(down(i, 'ArrowLeft', 'a', 'q'));
      if (
        move &&
        (repeat <= 0 || press(i, 'ArrowRight', 'ArrowLeft', 'a', 'q', 'd'))
      ) {
        if (valid(shape, x + move, y)) x += move;
        repeat = 0.12;
      }
      if (press(i, 'ArrowUp', 'z', 'w', 'jump')) {
        const rotated = shape[0].map((_, n) =>
          shape.map((r) => r[n]).reverse(),
        );
        for (const offset of [0, -1, 1, -2, 2])
          if (valid(rotated, x + offset, y)) {
            shape = rotated;
            x += offset;
            break;
          }
      }
      if (press(i, ' ', 'fire')) {
        while (valid(shape, x, y + 1)) {
          y++;
          st.score += 2;
        }
        land();
        acc = 0;
        return;
      }
      acc += dt;
      if (
        acc >
        (down(i, 'ArrowDown', 's') ? 0.05 : Math.max(0.17, 0.65 - lines * 0.04))
      ) {
        acc = 0;
        if (valid(shape, x, y + 1)) y++;
        else land();
      }
      st.objective = `Lignes isolées : ${lines} / 10`;
    };
    draw = (c) => {
      base(c, t);
      rect(
        c,
        ox - 9,
        oy - 9,
        cols * cell + 18,
        rows * cell + 18,
        '#405961',
        10,
      );
      rect(c, ox, oy, cols * cell, rows * cell, '#0d242d', 0);
      for (let r = 0; r < rows; r++)
        for (let col = 0; col < cols; col++) {
          c.strokeStyle = '#1c3942';
          c.strokeRect(ox + col * cell, oy + r * cell, cell, cell);
          if (grid[r][col]) {
            rect(
              c,
              ox + col * cell + 1,
              oy + r * cell + 1,
              cell - 2,
              cell - 2,
              colors[grid[r][col]],
              3,
            );
            rect(
              c,
              ox + col * cell + 4,
              oy + r * cell + 3,
              cell - 8,
              3,
              '#ffffff44',
              1,
            );
          }
        }
      let gy = y;
      while (valid(shape, x, gy + 1)) gy++;
      shape.forEach((r, dy) =>
        r.forEach((v, dx) => {
          if (v) {
            c.strokeStyle = colors[piece];
            c.strokeRect(
              ox + (x + dx) * cell + 3,
              oy + (gy + dy) * cell + 3,
              cell - 6,
              cell - 6,
            );
            rect(
              c,
              ox + (x + dx) * cell + 1,
              oy + (y + dy) * cell + 1,
              cell - 2,
              cell - 2,
              colors[piece],
              3,
            );
          }
        }),
      );
      text(c, 'ISOLATION', 190, 150, 18, '#a9c8b6');
      text(c, `${Math.min(lines * 10, 100)} %`, 190, 203, 36, '#cda6d9');
      rect(c, 140, 232, 100, 8, '#284751', 4);
      rect(c, 140, 232, Math.min(lines * 10, 100), 8, '#cda6d9', 4);
      text(c, '10 LIGNES', 755, 190, 16, '#c5d6c6');
      text(c, 'UN BÂTIMENT', 755, 223, 14, '#829f98');
      text(c, 'BIEN ISOLÉ.', 755, 247, 14, '#829f98');
    };
  }
  return {
    update: (dt, i) => {
      if (st.result) return;
      t += dt;
      update(dt, i);
    },
    draw,
    snapshot: () => ({ ...st }),
    world,
  };
}
