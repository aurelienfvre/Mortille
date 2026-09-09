import type { Controls } from './simulation';
export const MAX_REPLAY_TICKS = 36000;
/** Two little-endian bytes per simulated tick; pauses produce no words. */
export function encodeControls(input: Controls): number {
  return (input.direction < 0 ? 1 : input.direction > 0 ? 2 : 0) | (input.jump ? 4 : 0) | (input.jumpPressed ? 8 : 0) | (input.run ? 16 : 0) | (input.downPressed ? 32 : 0) | (input.powerPressed ? 64 : 0) | (input.dashPressed ? 128 : 0) | (input.downHeld ? 256 : 0) | (input.switchPressed ? 512 : 0) | (input.trioPressed ? 1024 : 0) | (input.dashHeld ? 2048 : 0);
}
export function decodeControls(word: number): Controls {
  if (!Number.isInteger(word) || word < 0 || word > 4095 || (word & 3) === 3) throw new Error('Commandes de partie invalides.');
  return { direction: (word & 3) === 1 ? -1 : (word & 3) === 2 ? 1 : 0, jump: !!(word & 4), jumpPressed: !!(word & 8), run: !!(word & 16), downPressed: !!(word & 32), powerPressed: !!(word & 64), ...(word & 128 ? { dashPressed: true } : {}), ...(word & 256 ? { downHeld: true } : {}), ...(word & 512 ? { switchPressed: true } : {}), ...(word & 1024 ? { trioPressed: true } : {}), ...(word & 2048 ? {dashHeld:true} : {}) };
}
export function encodeReplay(words: readonly number[]): string {
  if (!words.length || words.length > MAX_REPLAY_TICKS) throw new Error('Enregistrement de partie invalide ou trop long.');
  let raw = '';
  for (const word of words) { decodeControls(word); raw += String.fromCharCode(word & 255, word >>> 8); }
  return btoa(raw);
}
/** Constant-stack validation: long grouped regexes can overflow some JS engines. */
function isBase64(value: string): boolean {
  const padding = value.endsWith('==') ? 2 : value.endsWith('=') ? 1 : 0;
  const end = value.length - padding;
  for (let i = 0; i < end; i++) {
    const c = value.charCodeAt(i);
    if (!((c >= 65 && c <= 90) || (c >= 97 && c <= 122) || (c >= 48 && c <= 57) || c === 43 || c === 47)) return false;
  }
  return true;
}
export function decodeReplay(value: unknown): Uint16Array {
  if (typeof value !== 'string' || !value.length || value.length > Math.ceil(MAX_REPLAY_TICKS * 2 / 3) * 4 || value.length % 4 || !isBase64(value)) throw new Error('Enregistrement de partie invalide ou trop long.');
  const raw = atob(value);
  if (btoa(raw) !== value || raw.length % 2 || raw.length > MAX_REPLAY_TICKS * 2) throw new Error('Enregistrement de partie invalide.');
  const words = new Uint16Array(raw.length / 2);
  for (let i = 0; i < words.length; i++) { words[i] = raw.charCodeAt(i * 2) | raw.charCodeAt(i * 2 + 1) << 8; decodeControls(words[i]); }
  return words;
}
