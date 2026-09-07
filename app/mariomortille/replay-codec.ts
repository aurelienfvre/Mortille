import type { Controls } from './simulation';
export const MAX_REPLAY_TICKS = 36000;
/** One byte per simulated tick; pauses produce no bytes. */
export function encodeControls(input: Controls): number {
  return (input.direction < 0 ? 1 : input.direction > 0 ? 2 : 0) | (input.jump ? 4 : 0) | (input.jumpPressed ? 8 : 0) | (input.run ? 16 : 0) | (input.downPressed ? 32 : 0) | (input.powerPressed ? 64 : 0);
}
export function decodeControls(byte: number): Controls {
  if (!Number.isInteger(byte) || byte < 0 || byte > 127 || (byte & 3) === 3) throw new Error('Commandes de partie invalides.');
  return { direction: (byte & 3) === 1 ? -1 : (byte & 3) === 2 ? 1 : 0, jump: !!(byte & 4), jumpPressed: !!(byte & 8), run: !!(byte & 16), downPressed: !!(byte & 32), powerPressed: !!(byte & 64) };
}
export function decodeReplay(value: unknown): Uint8Array {
  if (typeof value !== 'string' || !value.length || value.length > MAX_REPLAY_TICKS / 3 * 4 || value.length % 4 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) throw new Error('Enregistrement de partie invalide ou trop long.');
  const raw = atob(value);
  if (btoa(raw) !== value || raw.length > MAX_REPLAY_TICKS) throw new Error('Enregistrement de partie invalide.');
  const bytes = Uint8Array.from(raw, char => char.charCodeAt(0));
  for (const byte of bytes) decodeControls(byte);
  return bytes;
}
