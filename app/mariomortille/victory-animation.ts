/** Milliseconds per pose: keep the airborne celebration visible, then hold the final pose. */
export const victoryDurations = [120, 180, 160, 300, 220, 420, 160, 700] as const;
export const victoryDuration = victoryDurations.reduce((sum, duration) => sum + duration, 0);
export function victoryFrame(elapsed: number) {
 let remaining = Math.max(0, elapsed);
 for (let i = 0; i < victoryDurations.length; i++) {
  if (remaining < victoryDurations[i]) return i + 1;
  remaining -= victoryDurations[i];
 }
 return victoryDurations.length;
}
