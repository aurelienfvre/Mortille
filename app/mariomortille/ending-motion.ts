import { companionGaitFrames } from './companion-story-motion';
export const ENDING_DURATION_MS = 12_000;

export type EndingActor = {
  id: 'aurelien' | 'steve' | 'julien' | 'ben';
  x: number;
  action: 'idle' | 'trot' | 'walk';
  frame: number;
  facing: -1 | 1;
};

const smooth = (value: number) => {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
};

/** Reunion positions use stage percentages; locomotion advances only with travel. */
export function endingActors(elapsed: number, reduced = false, stridePercent = 2, steveFrameCount = 12): EndingActor[] {
  const steveCount = Number.isInteger(steveFrameCount) && steveFrameCount > 0 ? steveFrameCount : 12;
  const time = Number.isNaN(elapsed) ? 0 : Math.max(0, Math.min(ENDING_DURATION_MS, elapsed));
  const stride = Number.isFinite(stridePercent) && stridePercent > 0 ? Math.max(.1, stridePercent) : 2;
  const actor = (
    id: EndingActor['id'], start: number, end: number,
    from: number, until: number, action: 'trot' | 'walk',
    count: number, cycleDistance: number, facing: -1 | 1,
  ): EndingActor => {
    const progress = reduced ? 1 : smooth((time - from) / (until - from));
    const moving = !reduced && time > from && time < until;
    const distance = Math.abs(end - start) * progress;
    return {
      id, x: start + (end - start) * progress, action: moving ? action : 'idle',
      frame: moving ? Math.floor(distance / cycleDistance * count) % count + 1 : 1,
      facing,
    };
  };
  return [
    { id: 'aurelien', x: 40, action: 'idle', frame: 1, facing: 1 },
    actor('steve', 78, 47, 1_000, 4_500, 'walk', steveCount, stride, -1),
    actor('julien', 12, 25, 4_000, 7_000, 'walk', companionGaitFrames.julien, stride * 32 / 14, 1),
    actor('ben', 3, 15, 4_000, 7_000, 'walk', companionGaitFrames.ben, stride * 32 / 14, 1),
  ];
}
