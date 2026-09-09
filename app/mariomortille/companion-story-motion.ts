export const companionGaitFrames = { ben: 8, julien: 8 } as const;
/** Companions move only while displaying a locomotion cycle, anchored by distance. */
export function companionStoryMotion(id: 'ben' | 'julien', elapsed: number, reduced = false, walkStridePercent = 3) {
  const frameCount = companionGaitFrames[id];
  const stride = Number.isFinite(walkStridePercent) && walkStridePercent > 0 ? walkStridePercent : 3;
  const target = id === 'ben' ? 15 : 25;
  const start = target - 10;
  const arrivalStart = id === 'ben' ? 150 : 0;
  const arrival = Math.max(0, Math.min(1, (elapsed - arrivalStart) / 1700));
  const chaseStart = id === 'ben' ? 15500 : 15000;
  const chaseDistance = 120-target;
  const chase = Math.max(0, Math.min(1, (elapsed - chaseStart) * .016 / chaseDistance));
  if (reduced) return { x: elapsed >= chaseStart ? 120 : target, action: 'idle' as const, frame: 1 };
  const x = start + 10 * arrival + chaseDistance * chase;
  const walking = elapsed >= arrivalStart && arrival < 1;
  const running = chase > 0 && chase < 1;
  const reactionStart = id === 'julien' ? 6500 : 6620;
  const reactionLength = id === 'julien' ? 390 : 460;
  if (elapsed >= reactionStart && elapsed < reactionStart + reactionLength) {
    const age = elapsed - reactionStart;
    const timing = id === 'julien' ? [80, 190, 280] : [90, 220, 340];
    return { x, action: 'hurt', frame: age < timing[0] ? 1 : age < timing[1] ? 2 : age < timing[2] ? 3 : 4 };
  }
  const action = running ? 'run' : walking ? 'walk' : 'idle';
  // One gait cycle per travelled distance; a pause never advances a planted foot.
  const distance = running ? chase * chaseDistance : arrival * 10;
  return { x, action, frame: action === 'idle' ? 1 : Math.floor(distance / (running ? stride * 54 / 32 : stride) * frameCount) % frameCount + 1 };
}
