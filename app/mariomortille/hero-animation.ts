import type { Player, Controls } from './simulation';
import { menuIdleFrame } from './menu-art';

export type HeroMotion = { brakeMs?: number; brakeFacing?: number; crouchDistance: number; wasCrouching: boolean; riseTicks: number; wasBoosting: boolean; landingMs: number; previousGrounded: boolean; previousPound: number; poundLanding: boolean; lastX: number; distance: number; cycleDistance: number; idleMs: number; gliding: boolean; glideTicks: number; glideRelease: number; castTicks: number; previousCooldown: number; skidding: boolean; previousSpeed: number };
export const makeHeroMotion = (x: number): HeroMotion => ({ crouchDistance: 0, wasCrouching: false, riseTicks: 0, wasBoosting: false, landingMs: -1, previousGrounded: false, previousPound: 0, poundLanding: false, lastX: x, distance: 0, cycleDistance: 0, idleMs: 0, gliding: false, glideTicks: 0, glideRelease: 0, castTicks: 0, previousCooldown: 0, skidding: false, previousSpeed: 0 });
export function advanceHeroMotion(motion: HeroMotion, player: Player, input?: Controls) {
  // Recovery follows the landing event, and yields immediately to player movement.
  if (player.grounded && !motion.previousGrounded && player.landing) {
    motion.landingMs = 0; motion.poundLanding = motion.previousPound > 0;
  } else if (motion.landingMs >= 0) motion.landingMs += 1000 / 60;
  if (!player.grounded || player.boost || player.crouching || Math.abs(player.vx) > 8 || motion.landingMs >= 650) motion.landingMs = -1;
  motion.previousGrounded = player.grounded;
  motion.previousPound = player.pound;
  // Only a fresh shot starts a cast; a cooldown inherited from Turbo is not a shot.
  motion.castTicks = player.power === 'ember' ? (player.cooldown === 22 && motion.previousCooldown < 22 ? 22 : Math.max(0, motion.castTicks - 1)) : 0;
  motion.previousCooldown = player.cooldown;
  const brakingInput = input && (input.direction === 0 || Math.sign(input.direction) !== Math.sign(player.vx));
  const wasSkidding = motion.skidding;
  motion.skidding = Boolean(player.grounded && !player.crouching && !player.boost && brakingInput && Math.abs(player.vx) > 8 && (motion.previousSpeed >= 145 || motion.skidding));
  if(motion.skidding&&!wasSkidding){motion.brakeMs=0;motion.brakeFacing=Math.sign(player.vx)||player.facing;}
  else if((motion.brakeMs??-1)>=0)motion.brakeMs=(motion.brakeMs??0)+1000/60;
  if(!player.grounded||player.boost||player.crouching||player.dashCharging||(input?.direction&&!motion.skidding)||(motion.brakeMs??0)>480)motion.brakeMs=-1;
  motion.previousSpeed = Math.abs(player.vx);
  const wasGliding = motion.gliding;
  motion.gliding = player.power === 'cloud' && !player.grounded && !player.pound && player.vy > 0 && Boolean(input?.jump);
  motion.glideTicks = motion.gliding ? (wasGliding ? motion.glideTicks + 1 : 1) : 0;
  motion.glideRelease = !motion.gliding && wasGliding ? 4 : Math.max(0, motion.glideRelease - 1);
  const delta = Math.abs(player.x - motion.lastX);
  if (motion.wasCrouching && !player.crouching) {
    motion.riseTicks = player.grounded && !player.boost ? 8 : 0;
    motion.distance = 0; motion.cycleDistance = 0;
  } else motion.riseTicks = Math.max(0, motion.riseTicks - 1);
  if (motion.wasBoosting && !player.boost) { motion.distance = 0; motion.cycleDistance = 0; }
  if (!player.grounded || player.boost || player.crouching || player.invulnerable > 72) motion.riseTicks = 0;
  if (player.crouching && !motion.wasCrouching) motion.crouchDistance = 0;
  if (player.crouching && player.grounded && delta <= 24) motion.crouchDistance += delta;
  motion.wasCrouching = player.crouching;
  motion.wasBoosting = player.boost > 0;
  // Checkpoint respawn must not fast-forward the stride by thousands of pixels.
  if (delta > 24) { motion.crouchDistance = 0; motion.riseTicks = 0; motion.landingMs = -1; motion.poundLanding = false; motion.distance = 0; motion.cycleDistance = 0; motion.idleMs = 0; motion.gliding = false; motion.glideTicks = 0; motion.glideRelease = 0; motion.castTicks = 0; motion.skidding = false; motion.previousSpeed = 0; }
  else if (player.grounded && !player.crouching && !player.boost && Math.abs(player.vx) > 8) {
    const cycleDistance = Math.abs(player.vx) > 145 ? 108 : 100.05;
    // Preserve the planted leg when acceleration switches between walk and run.
    // Reinterpreting accumulated travel with a new divisor jumps to another pose.
    if (motion.cycleDistance && motion.cycleDistance !== cycleDistance) {
      motion.distance *= cycleDistance / motion.cycleDistance;
    }
    motion.cycleDistance = cycleDistance;
    motion.distance += delta;
    motion.idleMs = 0;
  }
  else if (player.grounded) motion.idleMs += 1000 / 60;
  motion.lastX = player.x;
}
export function heroPose(motion: HeroMotion, player: Player): string {
  const nativeBody = ['none','ember','turbo','cloud','cobalt'].includes(player.power);
  const nativePrefix = player.power === 'none' ? '' : `${player.power}-`;
  if (player.dashCharging) return `hero-${nativePrefix}crouch-01`;
  if (player.crouching && ['none','ember','turbo','cloud','cobalt'].includes(player.power) && Math.abs(player.vx) > 1) return `hero-${player.power === 'none' ? '' : player.power+'-'}crouch-walk-${String(Math.floor(motion.crouchDistance / 4.8) % 8 + 1).padStart(2,'0')}`;
  if (player.crouching) return `hero-${player.power === 'none' ? '' : player.power + '-'}crouch-${menuIdleFrame(motion.idleMs) === 4 ? '02' : '01'}`;
  // The impact uses the current PNG body, never an atlas damage frame.
  if (nativeBody && player.invulnerable > 72) return `hero-${nativePrefix}hurt-${player.invulnerable > 86 ? '01' : player.invulnerable > 80 ? '02' : player.invulnerable > 76 ? '03' : '04'}`;
  if (motion.riseTicks && nativeBody && player.grounded && !player.boost) return `hero-${nativePrefix}stand-up-${String(Math.min(4,1+Math.floor((8-motion.riseTicks)/2))).padStart(2,'0')}`;
  const frame = (action: string, index: number) => `hero-${action}-${String(index).padStart(2, '0')}`;
  // Timing follows simulation counters; a paused game cannot advance a cast.
  if (player.power === 'turbo' && player.boost) {
    // Keep propulsion poses visible through the middle of the existing 22-tick boost.
    const holds = [2, 2, 2, 5, 5, 2, 2, 2];
    let remaining = Math.max(0, 22*(1-player.boost/(player.dashDuration||22))), i = 0;
    while (i < 7 && remaining >= holds[i]) remaining -= holds[i++];
    return frame('turbo-dash', i + 1);
  }
  if (player.boost && player.power !== 'turbo') return frame(player.power === 'none' ? 'dash' : `${player.power}-dash`, Math.min(8, 1 + Math.floor(Math.max(0,1-player.boost/(player.dashDuration||12))*8)));
  // The projectile leaves immediately: start at the extended casting hand,
  // then follow through and lower it during the actual cooldown.
  if (player.power === 'ember' && motion.castTicks) return frame('ember-cast', [4, 5, 6, 7, 8][Math.min(4, Math.floor((22 - motion.castTicks) / 4))]);
  if (motion.gliding && player.power === 'cloud') return frame('cloud-glide', 1 + Math.floor(Math.max(0, motion.glideTicks - 1) * (1000 / 60) / 110) % 8);
  const prefix = player.power === 'none' ? 'hero-' : `hero-${player.power}-`;
  if (nativeBody) {
    if (player.pound > 1) return frame(`${nativePrefix}pound`, player.pound > 9 ? 1 : player.pound > 6 ? 2 : player.pound > 3 ? 3 : 4);
    if (player.pound === 1) return frame(`${nativePrefix}pound`, player.vy > 480 ? 6 : 5);
    if (motion.landingMs >= 0 && player.grounded && Math.abs(player.vx) <= 8) {
      if (motion.poundLanding) return frame(`${nativePrefix}pound`, motion.landingMs < 200 ? 7 : 8);
      const holds = [45, 55, 70, 110, 80, 80, 90, 120];
      let remaining = motion.landingMs, i = 0;
      while (i < 7 && remaining >= holds[i]) remaining -= holds[i++];
      return frame(`${nativePrefix}land`, i + 1);
    }
  }
  if (player.pound) return `${prefix}jump-${player.pound > 1 ? '04' : '05'}`;
  if (player.landing) return `${prefix}jump-${player.landing > 2 ? '07' : '08'}`;
  if (!player.grounded) return `${prefix}jump-${player.vy < -220 ? '02' : player.vy < -60 ? '03' : player.vy < 60 ? '04' : '05'}`;
  if (motion.skidding) return `${prefix}walk-01`;
  if (Math.abs(player.vx) > 8) {
    const run = Math.abs(player.vx) > 145;
    const cycleDistance = run ? 108 : 100.05;
      const phase = (motion.distance % cycleDistance) / cycleDistance;
      // The source sprint begins with three preparation poses; only 4–8 are the moving loop.
      if (run) return `${prefix}run-${String(4 + Math.floor(phase * 5)).padStart(2, '0')}`;
      const durations = [60, 120, 156, 114, 66, 84, 156, 114];
      let remaining = phase * 870, index = 0;
      while (index < 7 && remaining >= durations[index]) remaining -= durations[index++];
      return `${prefix}walk-${String(index + 1).padStart(2, '0')}`;
  }
  return `${prefix}idle-${String((Math.floor(motion.idleMs * 6 / 1000) % 8) + 1).padStart(2, '0')}`;
}

/** Visual recoil only; no physics or replay changes. */
export function heroRecoil(player: Player) {
  if (player.power !== 'none' || player.invulnerable <= 72) return 0;
  const remaining = Math.min(1, (player.invulnerable - 72) / 18);
  return -player.facing * .12 * remaining * remaining;
}

/** Emit only when an animated planted foot changes; no steps in mid-air or against a wall. */
export function heroFootstep(previousPose: string, nextPose: string, player: Player, deltaX: number): 'step-left' | 'step-right' | null {
  if (!player.grounded || player.landing || player.boost || Math.abs(deltaX) < .01 || Math.abs(deltaX) > 24) return null;
  const before = /^(.*(?:walk|run))-([0-9]{2})$/.exec(previousPose);
  const after = /^(.*(?:walk|run))-([0-9]{2})$/.exec(nextPose);
  if (!before || !after || before[1] !== after[1]) return null;
  const halfCycle = 4;
  const previousFoot = Math.floor((Number(before[2]) - 1) / halfCycle);
  const nextFoot = Math.floor((Number(after[2]) - 1) / halfCycle);
  if (previousFoot === nextFoot) return null;
  return nextFoot === 0 ? 'step-left' : 'step-right';
}
