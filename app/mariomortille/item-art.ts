import type { Pickup } from './simulation';
export const ITEM_ART_VERSION = 'objects-v10-clear-token';
export const itemClips = ['coin', 'secret', 'pickup-none', 'pickup-turbo', 'pickup-ember', 'pickup-cloud', 'pickup-cobalt', 'fireball', 'impact', 'pickup-burst'] as const;
export const extraItemClips = ['finish-flag', 'transformation', 'dash-trail', 'flag-wave', 'flag-activate'] as const;
export const itemAssets = [...extraItemClips.flatMap(name => Array.from({length: 8}, (_, i) => `${name}-${String(i + 1).padStart(2, '0')}`)), ...Array.from({ length: 6 }, (_, i) => `smoke-${String(i + 1).padStart(2, '0')}`), ...itemClips.flatMap(name => Array.from({ length: ['fireball', 'impact', 'pickup-burst'].includes(name) ? 8 : 16 }, (_, i) => `${name}-${String(i + 1).padStart(2, '0')}`))];
export function itemFrame(kind: Pickup['kind'], ticks: number) {
  const name = kind === 'coin' || kind === 'secret' ? kind : `pickup-${kind}`;
  return `${name}-${String(1 + Math.floor(Math.max(0, ticks) / 4) % 16).padStart(2, '0')}`;
}
export function effectFrame(kind: 'fireball' | 'impact' | 'pickup-burst' | 'smoke' | 'transformation' | 'dash-trail', age: number) {
  const frame = Math.floor(Math.max(0, age) / (kind === 'fireball' ? 5 : 4));
  if (kind !== 'fireball' && frame >= (kind === 'smoke' ? 6 : 8)) return null;
  return `${kind}-${String(1 + frame % 8).padStart(2, '0')}`;
}

export function checkpointFrame(active: boolean, ticks: number, activatedAt: number) {
 if (!active) return `flag-wave-${String(1 + Math.floor(Math.max(0, ticks) / 6) % 8).padStart(2, '0')}`;
 const age = Math.max(0, ticks - activatedAt);
 return `flag-activate-${String(1 + Math.floor(age / 6) % 8).padStart(2, '0')}`;
}
