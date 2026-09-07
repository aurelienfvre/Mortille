import { HEIGHT, WIDTH, STEP, type Event, type Player } from './simulation';

export type PixelParticle = { x: number; y: number; vx: number; vy: number; gravity: number; life: number; total: number; size: number; color: number };
const powerColor = { none: 0xffe1a2, turbo: 0x60dec5, ember: 0xffaa55, cloud: 0xdaf1ff, cobalt: 0x7caaff };

/** Render-only effects, advanced by simulation ticks so pausing freezes them. */
export function stepFeedback(particles: PixelParticle[], events: Event[], player: Player, ticks: number) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    if (--p.life <= 0) { particles.splice(i, 1); continue; }
    p.x += p.vx * STEP; p.y += p.vy * STEP; p.vy += p.gravity * STEP;
  }
  const burst = (count: number, x: number, y: number, color: number, impact: boolean) => {
    for (let i = 0; i < count; i++) {
      const noise = ((ticks * 13 + i * 37) % 101) / 100;
      const angle = impact ? Math.PI + Math.PI * (i + .5) / count : Math.PI * 2 * i / count;
      const speed = impact ? 25 + noise * 65 : 20 + noise * 30;
      const life = impact ? 15 + Math.floor(noise * 8) : 24 + Math.floor(noise * 12);
      particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        gravity: impact ? 190 : -15, life, total: life, size: i % 3 ? 2 : 3, color });
    }
  };
  const x = player.x + WIDTH / 2, feet = player.y + HEIGHT;
  if (events.includes('pound')) burst(14, x, feet - 1, player.power === 'cobalt' ? powerColor.cobalt : 0xd8bb8d, true);
  else if (events.includes('land')) burst(5, x, feet - 1, 0xd8bb8d, true);
  if (events.includes('equip')) burst(12, x, player.y + HEIGHT / 2, powerColor[player.power], false);
  if (events.includes('coin') || events.includes('secret')) burst(events.includes('secret') ? 12 : 4, x, player.y + 12, 0xffdf7c, false);
  if (particles.length > 96) particles.splice(0, particles.length - 96);
}
