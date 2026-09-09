import type { Power } from './simulation';
export const equipDurations = [70, 90, 110, 120, 120, 100, 90, 90];
export const equipDuration = equipDurations.reduce((sum, duration) => sum + duration, 0);
const currentTimings = { cobalt: [120,160,200,260,180,180,220,400], ember: [180,200,140,140,140,180,200,400], turbo: [180,200,220,260,220,200,220,420] };
export function equipDurationFor(power: Exclude<Power, 'none'>) {
  return (power === 'ember' || power === 'turbo' || power === 'cobalt' ? currentTimings[power] : equipDurations).reduce((a,b) => a+b,0);
}
export function equipFrame(power: Exclude<Power, 'none'>, elapsed: number) {
  const durations = power === 'ember' || power === 'turbo' || power === 'cobalt' ? currentTimings[power] : equipDurations;
  let remaining = Math.max(0, elapsed), frame = 0;
  while (frame < durations.length - 1 && remaining >= durations[frame]) remaining -= durations[frame++];
  return `hero-${power}-equip-${String(frame + 1).padStart(2, '0')}`;
}
