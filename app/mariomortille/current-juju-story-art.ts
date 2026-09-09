/** Juju-only native-alpha art. Gaits remain unsupported until a complete cycle is reviewed. */
const root = '/mariomortille/story/juju-current/';
const version = '?v=juju-native-story-1';
const file = (action: string, frame: number) => `${root}${action}-${String(frame).padStart(2, '0')}.png${version}`;
export const currentJujuStoryAssets = ['idle', 'receive'].flatMap(action => Array.from({ length: 8 }, (_, i) => file(action, i + 1)));
const receivePoses: Record<string, number> = {
  'look-down': 1, 'open-arms': 2, 'catch-dog': 3,
  'hold-dog': 4, 'pet-dog': 6, 'put-down-dog': 7,
};
/** Receive poses require Steve rendered separately at Juju's hand anchor. */
export function currentJujuStoryFrame(id: string, action: string, frame: number, elapsed: number, ambient: number, reduced = false): string | undefined {
  if (id !== 'julien') return undefined;
  if (action === 'idle') return file('idle', reduced ? 1 : Math.floor(ambient * 6 / 1000) % 8 + 1);
  const pose = receivePoses[action];
  if (pose) return file('receive', pose);
  return undefined;
}
