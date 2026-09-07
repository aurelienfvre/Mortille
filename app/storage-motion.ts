// Swap populations only while the closed archive box is outside the display rail.
export const STORAGE_DURATION = 5.2;
export const STORAGE_SWAP = 2.4;
const smooth = (value: number) => {
  const t = Math.max(0, Math.min(1, value));
  return t * t * t * (t * (t * 6 - 15) + 10);
};
export function storageItem(t: number, slot: number) {
  const lag = (slot + 2) * .055;
  if (t < STORAGE_SWAP) {
    const q = smooth((t - .45 - lag) / .78);
    return { pack: q, visible: q < .995 };
  }
  const q = smooth((t - 3.25 - lag) / .95);
  return { pack: 1 - q, visible: q > .005 };
}
export function storageBox(t: number) {
  if (t < STORAGE_SWAP) {
    return {
      x: -7 * (1 - smooth(t / .38)) + 7 * smooth((t - 1.85) / .45),
      // The low rim passes beneath displayed media; it rises with their upward arc.
      y: .25 + .95 * smooth((t - .72) / .33),
      open: smooth((t - .18) / .35) * (1 - smooth((t - 1.55) / .25)),
      visible: t < 2.32,
    };
  }
  return {
    x: -7 * (1 - smooth((t - STORAGE_SWAP) / .35)) + 7 * smooth((t - 4.8) / .4),
    // Lower the rim before the last items settle on the front of the display rail.
    y: .25 + .95 * smooth((t - 2.75) / .3) * (1 - smooth((t - 3.85) / .27)),
    open: smooth((t - 2.95) / .3) * (1 - smooth((t - 4.55) / .25)),
    visible: t < STORAGE_DURATION,
  };
}
