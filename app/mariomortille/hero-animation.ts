import type { Player, Controls } from './simulation';
import { menuIdleFrame } from './menu-art';

export type HeroMotion = { lastX: number; distance: number; idleMs: number; gliding: boolean };
export const makeHeroMotion = (x: number): HeroMotion => ({ lastX: x, distance: 0, idleMs: 0, gliding: false });
export function advanceHeroMotion(motion: HeroMotion, player: Player, input?: Controls) {
  motion.gliding = player.power === 'cloud' && !player.grounded && !player.pound && player.vy > 0 && Boolean(input?.jump);
  const delta = Math.abs(player.x - motion.lastX);
  // Checkpoint respawn must not fast-forward the stride by thousands of pixels.
  if (delta > 24) { motion.distance = 0; motion.idleMs = 0; }
  else if (player.grounded && Math.abs(player.vx) > 8) { motion.distance += delta; motion.idleMs = 0; }
  else if (player.grounded) motion.idleMs += 1000 / 60;
  motion.lastX = player.x;
}
export function heroPose(motion: HeroMotion, player: Player): string {
  // The impact uses the current PNG body, never an atlas damage frame.
  if (player.power === 'none' && player.invulnerable > 72) return `hero-hurt-${player.invulnerable > 86 ? '01' : player.invulnerable > 80 ? '02' : player.invulnerable > 76 ? '03' : '04'}`;
  const frame = (action: string, index: number) => `hero-${action}-${String(index).padStart(2, '0')}`;
  // Timing follows simulation counters; a paused game cannot advance a cast.
  if (player.power === 'cobalt') {
    if (player.pound > 1) return frame('cobalt-pound', player.pound > 7 ? 3 : 4);
    if (player.pound === 1) return frame('cobalt-pound', 5);
    if (player.landing) return frame('cobalt-pound', player.landing > 3 ? 6 : player.landing > 1 ? 7 : 8);
  }
  if (player.power === 'turbo' && player.boost) return frame('turbo-dash', Math.min(8, 1 + Math.floor((22 - player.boost) * 8 / 22)));
  // The projectile leaves immediately: start at the extended casting hand,
  // then follow through and lower it during the actual cooldown.
  if (player.power === 'ember' && player.cooldown) return frame('ember-cast', [4, 5, 6, 7, 8][Math.min(4, Math.floor((22 - player.cooldown) / 4))]);
  if (motion.gliding && player.power === 'cloud') return frame('cloud-glide', 5);
  const prefix = player.power === 'none' ? 'hero-' : `hero-${player.power}-`;
  if (player.pound) return `${prefix}jump-${player.pound > 1 ? '04' : '05'}`;
  if (player.landing) return `${prefix}jump-${player.landing > 2 ? '07' : '08'}`;
  if (!player.grounded) return `${prefix}jump-${player.vy < -220 ? '02' : player.vy < -60 ? '03' : player.vy < 60 ? '04' : '05'}`;
  if (Math.abs(player.vx) > 8) {
    const run = Math.abs(player.vx) > 145;
    const frame = Math.floor(motion.distance / ((run ? 108 : 92) / 16)) % 16 + 1;
    return `${prefix}${run ? 'run' : 'walk'}-${String(frame).padStart(2, '0')}`;
  }
  return `${prefix}idle-${String(menuIdleFrame(motion.idleMs) + 1).padStart(2, '0')}`;
}

/** Visual recoil only; no physics or replay changes. */
export function heroRecoil(player: Player) {
  if (player.power !== 'none' || player.invulnerable <= 72) return 0;
  const remaining = Math.min(1, (player.invulnerable - 72) / 18);
  return -player.facing * .12 * remaining * remaining;
}
