const ROOT = '/mariomortille/story/current/steve/';
const url = (frame: number) => `${ROOT}capture-${String(frame).padStart(2, '0')}.png?v=steve-native-contact-2`;
export const currentSteveStoryAssets = Array.from({ length: 16 }, (_, i) => url(i + 1));
const bottoms = [74, 74, 74, 75, 76, 70, 71, 69, 69, 71, 71, 70, 71, 70, 71, 69];
/** Same 96px canvas as Raph. Translate within his group, then flip the entire group. */
export function steveCapturePlacement(frame: number, contact: { x: number; y: number }) {
 const i = Math.max(1, Math.min(16, Math.floor(frame)));
 return { src: url(i), x: contact.x - 48, y: i <= 4 ? 88 - bottoms[i - 1] : contact.y - 60,
  width: 96, height: 96, grounded: i <= 4 };
}
/** Use only for the standalone, grounded actor. After this point the Raph group owns Steve. */
export function steveStandaloneVisible(elapsed: number) { return elapsed < 6500; }
