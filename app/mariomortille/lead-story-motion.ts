const clamp = (n: number) => Math.max(0, Math.min(1, n));
const ease = (n: number) => { const t = clamp(n); return t * t * (3 - 2 * t); };

/** Position and stride share a clock: accelerating actors do not run in place. */
export function leadStoryMotion(id: 'aurelien' | 'raphael', elapsed: number, reduced = false, runStridePercent = 9) {
  const stride = Number.isFinite(runStridePercent) && runStridePercent > 0 ? runStridePercent : 9;
  if (id === 'aurelien') {
    const progress = clamp((elapsed - 14400) / 3100);
    const distance = progress * progress * 79;
    const moving = progress > 0 && progress < 1;
    return { x: reduced ? elapsed >= 14400 ? 115 : 36 : 36 + distance,
      action: !reduced && moving ? 'run' : 'idle',
      frame: !reduced && moving ? Math.floor(distance / stride * 8) % 8 + 1 : 1,
      facing: 1 };
  }
  // Stop beside Steve: the mirrored palm lies 12px left of the 96px actor anchor.
  const pickupX = 48 + stride * 2 * 12 / 96;
  const arrival = ease((elapsed - 3000) / 3300);
  const escape = ease((elapsed - 7600) / 2300);
  const moving = elapsed > 3000 && elapsed < 6300 || elapsed > 7600 && elapsed < 9900;
  const distance = elapsed >= 7600 ? escape * (122 - pickupX) : arrival * (108 - pickupX);
  const cycleStride = elapsed >= 7600 ? stride * 1.6 : stride;
  return { x: reduced ? elapsed < 3000 ? 108 : elapsed < 7600 ? pickupX : 122 : 108 - arrival * (108 - pickupX) + escape * (122 - pickupX),
    action: !reduced && moving ? elapsed < 6500 ? 'walk' : 'run' : 'idle',
    frame: !reduced && moving ? Math.floor(distance / cycleStride * 8) % 8 + 1 : 1,
    facing: elapsed < 7600 ? -1 : 1 };
}
