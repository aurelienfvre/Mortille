import type * as Phaser from 'phaser';

/** The same authored pixel village as the title screen, rather than legacy boxes. */
export const WORLD_BACKGROUND = '/mariomortille/menu/village-background.png';
export const BACKGROUND_PANEL_WIDTH = 576;
const PANEL_HEIGHT = 384;
const PERIOD = BACKGROUND_PANEL_WIDTH * 2;
const wrap = (value: number, period: number) => ((value % period) + period) % period;

export function backgroundLayout(scrollX: number, seconds: number, levelId: string, reduced = false) {
  const high = levelId === 'quartier-03';
  const offset = Math.floor(scrollX * (high ? .24 : .32));
  // Adjacent copies alternate orientation. Both edges then share identical pixels.
  const first = Math.floor(offset / BACKGROUND_PANEL_WIDTH);
  return {
    panels: Array.from({ length: 3 }, (_, i) => {
      const column = first + i;
      return { x: column * BACKGROUND_PANEL_WIDTH - offset, y: high ? 22 : -48, flip: column % 2 !== 0 };
    }),
    tint: levelId === 'quartier-04' ? 0xd2dfec : levelId === 'quartier-05' ? 0xf8d5d8 : 0xffffff,
    clouds: Array.from({ length: 4 }, (_, i) => ({
      x: Math.floor(wrap(90 + i * 253 - scrollX * (.08 + i % 2 * .025) - (reduced ? 0 : seconds * (2 + i % 3)), PERIOD) - 200),
      y: [0, 20, -8, 35][i],
      width: [112, 84, 96, 72][i],
      texture: `world-cloud-${i % 3 + 1}`,
    })),
  };
}

export function preloadWorldBackground(scene: Phaser.Scene) {
  scene.load.image('world-village', WORLD_BACKGROUND);
  for (let i = 1; i <= 3; i++) scene.load.image(`world-cloud-${i}`, `/mariomortille/menu/cloud-${i}.png`);
}

export function createWorldBackground(scene: Phaser.Scene, levelId: string) {
  const reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const panels = Array.from({ length: 3 }, () => scene.add.image(0, 0, 'world-village').setOrigin(0).setScrollFactor(0).setDepth(-20).setDisplaySize(BACKGROUND_PANEL_WIDTH, PANEL_HEIGHT));
  const clouds = Array.from({ length: 4 }, (_, i) => {
    const cloud = scene.add.image(0, 0, `world-cloud-${i % 3 + 1}`).setOrigin(0).setScrollFactor(0).setDepth(-19).setAlpha(.8);
    return cloud;
  });
  const update = (scrollX: number, seconds: number) => {
    const layout = backgroundLayout(scrollX, seconds, levelId, reduced);
    panels.forEach((panel, i) => panel.setPosition(layout.panels[i].x, layout.panels[i].y).setFlipX(layout.panels[i].flip).setTint(layout.tint));
    clouds.forEach((cloud, i) => {
      const p = layout.clouds[i];
      const source = cloud.texture.getSourceImage() as HTMLImageElement;
      cloud.setPosition(p.x, p.y).setDisplaySize(p.width, Math.round(p.width * source.height / source.width));
    });
  };
  update(0, 0);
  // Phaser owns and disposes these display objects when the scene restarts.
  return { update };
}
