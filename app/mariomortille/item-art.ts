import type { Pickup } from './simulation';
export const itemAssets = [
  ...Array.from({ length: 8 }, (_, i) => `coin-${String(i + 1).padStart(2, '0')}`),
  ...Array.from({ length: 4 }, (_, i) => `secret-${String(i + 1).padStart(2, '0')}`),
  ...['turbo', 'ember', 'cloud', 'cobalt'].map(power => `pickup-${power}`),
];
export function itemFrame(kind: Pickup['kind'], ticks: number) {
  if (kind === 'coin') return `coin-${String(1 + Math.floor(ticks / 6) % 8).padStart(2, '0')}`;
  if (kind === 'secret') return `secret-${String(1 + Math.floor(ticks / 10) % 4).padStart(2, '0')}`;
  return `pickup-${kind}`;
}
