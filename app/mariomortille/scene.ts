import * as Phaser from 'phaser';
import { itemAssets, itemFrame } from './item-art';
import { createWorldBackground, preloadWorldBackground } from './world-background';
import { createState, tick, STEP, type State, type Event, type Level, type Controls } from './simulation';
import { firstLevel } from './levels';
import { stepFeedback, type PixelParticle } from './feedback';
import { makeHeroMotion, advanceHeroMotion, heroPose, heroRecoil } from './hero-animation';
export type Bridge = { paused: boolean; muted: boolean; update: (state: State) => void; sound: (event: Event) => void; pause: () => void; record?: (input: Controls) => void };
export function createScene(bridge: Bridge, level: Level = firstLevel, demo = false) {
  return class Adventure extends Phaser.Scene {
    state = createState(level);
    accumulator = 0;
    hero!: Phaser.GameObjects.Sprite;
    heroMotion = makeHeroMotion(level.spawn.x);
    bossView?: Phaser.GameObjects.Sprite;
    effects!: Phaser.GameObjects.Graphics;
    particles: PixelParticle[] = [];
    water?: Phaser.GameObjects.TileSprite;
    worldBackground?: ReturnType<typeof createWorldBackground>;
    iceViews: Phaser.GameObjects.Image[] = [];
    renderedTerrain: State["tiles"] | undefined;
    renderedTileCount = -1;
    keys!: Record<string, Phaser.Input.Keyboard.Key>;
    tileViews = new Map<string, Phaser.GameObjects.Image>();
    enemyViews = new Map<string, Phaser.GameObjects.Sprite>();
    itemViews = new Map<object, Phaser.GameObjects.Image>();
    preload() {
      preloadWorldBackground(this);
      for (const asset of itemAssets) this.load.image(`item-${asset}`, `/mariomortille/items/${asset}.png`);
      for (const action of ['idle', 'walk', 'run', 'jump', ...['turbo', 'ember', 'cloud', 'cobalt'].flatMap(power => ['idle', 'walk', 'run', 'jump'].map(action => `${power}-${action}`)), 'ember-cast', 'turbo-dash', 'cloud-glide', 'cobalt-pound']) for (let i = 1; i <= (action.endsWith('walk') || action.endsWith('run') ? 16 : 8); i++) {
        const frame = String(i).padStart(2, '0');
        this.load.image(`hero-${action}-${frame}`, `/mariomortille/characters/aurelien/gameplay/${action}-${frame}.png`);
      }
      for (let i = 1; i <= 4; i++) this.load.image(`hero-hurt-0${i}`, `/mariomortille/characters/aurelien/gameplay/hurt-0${i}.png`);
      for (const name of ['tree', 'bush', 'flowers', 'fence', 'sign', 'lamp']) this.load.image(`decor-${name}`, `/mariomortille/decor/quartier/${name}.png`);
      this.load.spritesheet('raphael', '/mariomortille/raphael.png', { frameWidth: 48, frameHeight: 80 });
      this.load.spritesheet('beetle', '/mariomortille/beetle.png', { frameWidth: 24, frameHeight: 24 });
      this.load.spritesheet('tiles', '/mariomortille/tiles.png', { frameWidth: 16, frameHeight: 16 });
      this.load.spritesheet('terrain', '/mariomortille/terrain/quartier-v1.png', { frameWidth: 16, frameHeight: 16 });
    }
    create() {
      // Phaser reuses this Scene instance on restart; discard the previous run.
      this.state = createState(level);
      this.heroMotion = makeHeroMotion(level.spawn.x);
      this.accumulator = 0;
      this.tileViews.clear();
      this.enemyViews.clear();
      this.itemViews.clear();
      this.bossView = undefined;
      this.iceViews = [];
      this.particles = [];
      this.water = undefined;
      const rooftops = level.id === 'quartier-03';
      const construction = level.id === 'quartier-04';
      this.cameras.main.setBackgroundColor('#53b2e8');
      this.worldBackground = createWorldBackground(this, level.id);
      const decor = this.add.graphics();
      const occupied = new Set(this.state.tiles.map(tile => `${tile.x},${tile.y}`));
      const surface = new Map<number, number>();
      for (const tile of this.state.tiles) if (tile.kind === 'ground') surface.set(tile.x, Math.min(surface.get(tile.x) ?? Infinity, tile.y));
      const scenery = construction ? ['fence', 'sign', 'lamp'] : rooftops ? ['flowers', 'fence', 'sign', 'lamp'] : ['tree', 'flowers', 'bush', 'fence', 'sign', 'lamp'];
      for (let x = 176, i = 0; x < level.width - 80; x += 240, i++) {
        const groundY = surface.get(x);
        // Keep scenery on broad, level ground, behind collision blocks and actors.
        if (groundY === undefined || surface.get(x - 32) !== groundY || surface.get(x + 32) !== groundY) continue;
        this.add.image(x, groundY, `decor-${scenery[i % scenery.length]}`).setOrigin(.5, 1);
      }
      // Water is scenery behind the terrain; gaps retain their existing fall hazard.
      if (!rooftops) this.water = this.add.tileSprite(0, 336, level.width, 24, 'terrain', 14).setOrigin(0).setDepth(-.1);
      for (const tile of this.state.tiles) {
        const frame = tile.kind === 'ground' ? (construction ? 2 : occupied.has(`${tile.x},${tile.y - 16}`) ? (rooftops ? 10 : 1) : (rooftops ? 9 : 0))
          : tile.kind === 'weak' ? 4 : tile.kind === 'ice' ? 6 : tile.kind === 'reinforced' ? 5 : 3;
        const view = this.add.image(tile.x, tile.y, 'terrain', frame).setOrigin(0);
        this.tileViews.set(`${tile.x},${tile.y}`, view);
        if (tile.kind === 'ice') this.iceViews.push(view);
      }
      for (const item of this.state.pickups) this.itemViews.set(item, this.add.image(item.x + 8, item.y + 8, `item-${itemFrame(item.kind, 0)}`).setOrigin(.5).setScale(.5));
      decor.fillStyle(0x45475c); decor.fillRect(level.checkpoint, 253, 3, 51); decor.fillStyle(0xeee5a8); decor.fillRect(level.checkpoint + 3, 253, 20, 14);
      decor.fillStyle(0x45475c); decor.fillRect(level.goal, 214, 4, 90); decor.fillStyle(0x49d5a1); decor.fillRect(level.goal + 4, 214, 28, 19);
      for (const enemy of this.state.enemies) this.enemyViews.set(enemy.id, this.add.sprite(enemy.x - 2, enemy.y - 4, 'beetle').setOrigin(0));
      this.hero = this.add.sprite(0, 0, 'hero-idle-01').setOrigin(0);
      if (this.state.boss) this.bossView = this.add.sprite(0, 304, 'raphael').setOrigin(.5, 1);
      this.effects = this.add.graphics();
      this.cameras.main.setBounds(0, 0, level.width, 360).setRoundPixels(true);
      if (demo) return;
      this.keys = this.input.keyboard!.addKeys('LEFT,RIGHT,UP,DOWN,SPACE,SHIFT,X,Q,D,S,ESC') as typeof this.keys;
      this.keys.ESC.on('down', () => bridge.pause());
    }
    update(_time: number, delta: number) {
      if (bridge.paused) { this.accumulator = 0; return; }
      this.accumulator += Math.min(delta / 1000, .1);
      while (this.accumulator >= STEP) {
        if (demo) {
          const p = this.state.player;
          const gap = !this.state.tiles.some(t => t.x <= p.x + 48 && t.x + 16 > p.x + 48 && t.y >= p.y + 40);
          const enemy = this.state.enemies.some(e => !e.defeated && e.x > p.x && e.x < p.x + 65);
          tick(this.state, level, { direction: 1, jump: true, jumpPressed: p.grounded && (gap || enemy || this.state.ticks % 130 === 0), run: false, downPressed: false, powerPressed: false });
          stepFeedback(this.particles, this.state.events, this.state.player, this.state.ticks);
          advanceHeroMotion(this.heroMotion, this.state.player, { direction: 1, jump: true, jumpPressed: false, run: false, downPressed: false, powerPressed: false });
          if (this.state.won) {
            this.accumulator = 0;
            this.scene.restart();
            return;
          }
          this.accumulator -= STEP; continue;
        }
        const k = this.keys;
        const input = { direction: Number(k.RIGHT.isDown || k.D.isDown) - Number(k.LEFT.isDown || k.Q.isDown), jump: k.SPACE.isDown || k.UP.isDown, jumpPressed: Phaser.Input.Keyboard.JustDown(k.SPACE) || Phaser.Input.Keyboard.JustDown(k.UP), run: k.SHIFT.isDown, downPressed: Phaser.Input.Keyboard.JustDown(k.DOWN) || Phaser.Input.Keyboard.JustDown(k.S), powerPressed: Phaser.Input.Keyboard.JustDown(k.X) };
        if (!this.state.won) bridge.record?.(input);
        tick(this.state, level, input);
        stepFeedback(this.particles, this.state.events, this.state.player, this.state.ticks);
        advanceHeroMotion(this.heroMotion, this.state.player, input);
        for (const event of this.state.events) if (!bridge.muted) bridge.sound(event);
        if (this.state.won) { this.accumulator = 0; break; }
        this.accumulator -= STEP;
      }
      for (const enemy of this.state.enemies) this.enemyViews.get(enemy.id)?.setVisible(!enemy.defeated).setPosition(enemy.x - 2, enemy.y - 4).setFlipX(enemy.direction < 0).setFrame(Math.floor(this.state.ticks / 7) % 4);
      const p = this.state.player;
      if (this.water) {
        this.water.tilePositionX = -Math.floor(this.state.ticks / 7);
        this.water.tilePositionY = Math.floor(this.state.ticks / 24) % 2;
      }
      for (let i = 0; i < this.iceViews.length; i++) {
        const glint = (this.state.ticks + i * 29) % 180 < 12;
        this.iceViews[i].setTint(glint ? 0xffffff : 0xc8edff);
      }
      const pose = heroPose(this.heroMotion, p);
      this.hero.setTexture(pose).setOrigin(.5, 59 / 64).setScale(1).setPosition(Math.round(p.x + 10), Math.round(p.y + 42));
      this.hero.setFlipX(p.facing < 0).setRotation(heroRecoil(p));
      this.hero.setAlpha(p.invulnerable && this.state.ticks % 8 < 4 ? .45 : 1);
      this.effects.clear();
      for (const particle of this.particles) {
        this.effects.fillStyle(particle.color, Math.min(1, particle.life / 6));
        this.effects.fillRect(Math.round(particle.x), Math.round(particle.y), particle.size, particle.size);
      }
      const boss = this.state.boss;
      if (boss && this.bossView) {
        this.bossView.setVisible(boss.phase !== 'defeated').setPosition(boss.x + 16, 304).setScale(1, boss.phase === 'stunned' ? .6 : 1).setFlipX(boss.direction > 0).setFrame(Math.floor(this.state.ticks / 7) % 4);
        if (boss.phase === 'tell') { this.effects.fillStyle(0xffc46e); this.effects.fillRect(boss.x + 13, 205, 4, 9); this.effects.fillRect(boss.x + 13, 218, 4, 3); }
      }
      for (const shot of this.state.projectiles) { this.effects.fillStyle(0xf57743); this.effects.fillRect(Math.round(shot.x), Math.round(shot.y), 6, 6); this.effects.fillStyle(0xffeb9d); this.effects.fillRect(Math.round(shot.x) + 1, Math.round(shot.y) + 1, 3, 3); }
      if (p.boost) for (let i = 1; i <= 3; i++) { this.effects.fillStyle(0x60dec5, 1 - i * .2); this.effects.fillRect(Math.round(p.x - p.facing * i * 8), Math.round(p.y + 36), 6, 2); }
      if (this.renderedTerrain !== this.state.tiles || this.renderedTileCount !== this.state.tiles.length) {
        const remaining = new Set(this.state.tiles.map(t => `${t.x},${t.y}`));
        for (const [key, view] of this.tileViews) view.setVisible(remaining.has(key));
        this.renderedTerrain = this.state.tiles; this.renderedTileCount = this.state.tiles.length;
      }
      for (const [item, view] of this.itemViews) {
        const pickup = item as State['pickups'][number];
        view.setVisible(!pickup.collected);
        if (!pickup.collected) view.setTexture(`item-${itemFrame(pickup.kind, this.state.ticks)}`);
      }
      const camera = this.cameras.main;
      camera.scrollX += (Phaser.Math.Clamp(p.x - 230, 0, level.width - 640) - camera.scrollX) * (1 - Math.exp(-delta / 140));
      this.worldBackground?.update(camera.scrollX, this.state.ticks / 60);
      bridge.update(this.state);
    }
  };
}
