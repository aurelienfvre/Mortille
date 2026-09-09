/** Do not start a cinematic with missing frames or a missing backdrop. */
export async function preloadStoryImages(sources: string[], createImage: () => Pick<HTMLImageElement, 'onload' | 'onerror' | 'src'> = () => new Image()): Promise<void> {
 await Promise.all([...new Set(sources)].map(src => new Promise<void>((resolve, reject) => {
  const image = createImage();
  const finish = (failed: boolean) => {
   image.onload = null;
   image.onerror = null;
   if (failed) reject(new Error('Story image failed to load'));
   else resolve();
  };
  image.onload = () => finish(false);
  image.onerror = () => finish(true);
  image.src = src;
 })));
}
