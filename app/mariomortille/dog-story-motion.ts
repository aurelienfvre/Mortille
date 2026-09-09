const clamp = (n: number) => Math.max(0, Math.min(1, n));
const smooth = (n: number) => { const t = clamp(n); return t * t * (3 - 2 * t); };
/** Mango follows a grounded path. Stride phase advances with travel, never with idle time. */
export function mangoStoryMotion(elapsed: number, frameCount: number, reduced = false, stridePercent = 7) {
 const arrival = smooth((elapsed - 3900) / 1200);
 const escape = smooth((elapsed - 7600) / 2300);
 // Walk and sprint have different physical stride lengths. Reset the sprint
 // phase at takeoff instead of carrying the arrival's partial walk cycle.
 const escaping = elapsed >= 7600;
 const distance = escaping ? escape * 50 : arrival * 41;
 const stride = Math.max(.1, stridePercent) * (escaping ? 3.2 : 2);
 const moving = elapsed > 3900 && elapsed < 5100 || elapsed > 7600 && elapsed < 9900;
 return {
  x: reduced ? elapsed < 3900 ? 114 : elapsed < 7600 ? 73 : 123 : 114 - arrival * 41 + escape * 50,
  lift: 0,
  moving: !reduced && moving,
  facing: elapsed < 7600 ? -1 : 1,
  frame: reduced || !moving ? 1 : Math.floor(distance / stride * frameCount) % frameCount + 1,
 };
}

/** Steve stays grounded until the capture group takes ownership at 6500ms.
 * No independent capture tween: that previously slid him toward Raph before contact.
 */
export function steveStoryMotion(elapsed: number, reduced = false, stridePercent = 2, frameCount = 12) {
 const count = Number.isInteger(frameCount) && frameCount > 0 ? frameCount : 12;
 const approach = smooth((elapsed - 300) / 2100);
 const moving = !reduced && elapsed > 300 && elapsed < 2400;
 return {
  x: reduced ? 48 : 41 + approach * 7,
  lift: 0,
  moving,
  frame: moving ? Math.floor(approach * 7 / Math.max(.1, stridePercent) * count) % count + 1 : 1,
 };
}
