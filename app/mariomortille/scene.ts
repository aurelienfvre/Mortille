import {preloadPalm,createPalmView} from './palm-view';
import { preloadBear, bearFrame, bearAnchorX, bearAnchorY } from './bear-view';
import {preloadChargedDash,createChargedDashView} from './charged-dash-view';
import { trioGuestOpacity } from './trio-gathering';
import { createTrioView } from './trio-view';
import { createBossIntro, shouldStartBossIntro, startBossIntro, advanceBossIntro, bossArrivalOffset, bossIntroLines } from './boss-intro';
import { bossHeight, bossFloor } from './boss';
import { createLevelParty, levelCompanions, stepPartyControls, partySpiritPosition, type PartyId } from './party';
import { companionTexture, companionPose, companionEquipFrame, companionEquipDuration, companionActionFrame, companionActionDuration, advanceCompanionVisual, companionFlipX } from './party-art';
import { enemyVisual } from './enemy-animation';
import { markerGround } from './scenery-placement';
import { victoryFrame, victoryDuration } from './victory-animation';
import { bitmapText } from './menu-art';
import type { AudioCue } from './audio';
import * as Phaser from 'phaser';
import { equipFrame, equipDuration, equipDurationFor } from './equip-presentation';
import { houseEntrance, canEnterHouse, canExitHouse } from './house-level';
import { setRoomKeyboardActive } from './house-keyboard';
import { preloadHouseArt, createHouseExterior, createHouseInterior } from './house-interior';
import { InputEdges } from './input-edges';
import { checkpointFrame, itemAssets, itemFrame, effectFrame, ITEM_ART_VERSION } from './item-art';
import { createWorldBackground, preloadWorldBackground } from './world-background';
import { createState, tick, STEP, type State, type Level, type Controls } from './simulation';
import { firstLevel } from './levels';
import { stepFeedback, type PixelParticle } from './feedback';
import { makeHeroMotion, advanceHeroMotion, heroPose, heroRecoil, heroFootstep } from './hero-animation';
export type Bridge = { paused: boolean; muted: boolean; update: (state: State) => void; sound: (event: AudioCue) => void; pause: () => void; record?: (input: Controls) => void; visitHouse?: () => void; leaveHouse?: () => void; ready?: () => void; party?: (active: PartyId, members: PartyId[]) => void };
export function createScene(bridge: Bridge, level: Level = firstLevel, demo = false, appearance?: Pick<State['player'], 'power' | 'health'> & {character?:PartyId}) {
  const insideHouse = level.id === houseEntrance.id;
  return class Adventure extends Phaser.Scene {
    state = createState(level);
    party = createLevelParty(this.state, level, demo ? [] : levelCompanions(level));
    partyViews = new Map<PartyId, Phaser.GameObjects.Sprite>();
    partyMotions = new Map<PartyId, ReturnType<typeof makeHeroMotion>>();
    spirit?: Phaser.GameObjects.Image;
    trioView?:ReturnType<typeof createTrioView>;
    accumulator = 0;
    inputEdges = new InputEdges();
    hero!: Phaser.GameObjects.Sprite;
    heroMotion = makeHeroMotion(level.spawn.x);
    equipPending: Exclude<State['player']['power'], 'none'> | null = null;
    equipAge = -1;
    corpse: {id:'juju'|'ben';x:number;y:number;facing:number;age:number}|null=null;
    hurtAt = -100;
    checkpointAt = -100;
    victoryAge = 0;
    flag!: Phaser.GameObjects.Image;
    goalFlag!: Phaser.GameObjects.Image;
    victoryText?: Phaser.GameObjects.Graphics;
    bossView?: Phaser.GameObjects.Sprite;
    bossIntro = createBossIntro();
    bossIntroConfirm = false;
    bossIntroGraphics?: Phaser.GameObjects.Graphics;
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
    palmView: ReturnType<typeof createPalmView> | null = null;
    chargedDashView: ReturnType<typeof createChargedDashView> | null = null;
    itemViews = new Map<object, Phaser.GameObjects.Image>();
    enemyProjectileViews = new Map<number, Phaser.GameObjects.Image>();
    projectileViews = new Map<number, Phaser.GameObjects.Image>();
    itemBursts: { view: Phaser.GameObjects.Image; at: number; kind: 'impact' | 'pickup-burst' | 'smoke' | 'transformation' | 'dash-trail' }[] = [];
    spawnItemBurst(x: number, y: number, kind: 'impact' | 'pickup-burst' | 'smoke' | 'transformation' | 'dash-trail', size = 1) {
      this.itemBursts.push({ view: this.add.image(Math.round(x), Math.round(y), `item-${kind}-01`).setDepth(kind === 'smoke' ? 4 : 8).setScale(size).setOrigin(.5, kind === 'smoke' ? 1 : .5), at: this.state.ticks, kind });
    }
    preload() {
      preloadChargedDash(this);
      preloadPalm(this);
      preloadWorldBackground(this);
      for(const id of ['aurel','juju','ben'])for(let n=1;n<=6;n++)this.load.image(`trio-${id}-${n}`,`/mariomortille/party/trio/${id}/trio-${String(n).padStart(2,'0')}.png?v=1`);
      preloadBear(this);
      this.load.image('trio-amulet','/mariomortille/items/trio-amulet.png?v=1');
      for(let n=1;n<=4;n++)this.load.image(`trio-ray-${n}`,`/mariomortille/items/trio-ray-${n}.png?v=1`);
      this.load.atlas('party-extras','/mariomortille/party/party-extras.png?v=stand-pound1','/mariomortille/party/party-extras.json?v=stand-pound1');
      this.load.atlas('party-atlas', '/mariomortille/party/party-atlas.png?v=party-wings5', '/mariomortille/party/party-atlas.json?v=party-wings5');
      for (let i = 1; i <= 8; i++) this.load.image(`victory-v2-${i}`, `/mariomortille/characters/aurelien/victory-v2/${String(i).padStart(2, '0')}.png?v=timing5`);
      if (insideHouse || level.id === houseEntrance.levelId) preloadHouseArt(this);
      for (const kind of ['guard', 'pest', 'rover', 'plant', 'beetle', 'cat', 'crab', 'imp']) for (const [clip, count] of [['walk', 4], ['attack', 2], ['die', 6]] as const) for (let frame = 1; frame <= count; frame++) this.load.image(`enemy-${kind}-${clip}-${frame}`, `/mariomortille/enemies/${kind}-${clip}-${String(frame).padStart(2, '0')}.png?v=enemies-3`);
      this.load.image('enemy-yarn','/mariomortille/enemies/yarn-projectile.png?v=themed-1');
      for (const asset of itemAssets) this.load.image(`item-${asset}`, `/mariomortille/items/${asset}.png?v=${ITEM_ART_VERSION}`);
      this.load.atlas('hero-atlas', '/mariomortille/characters/aurelien/gameplay/hero-atlas.png?v=aurel-current-24', '/mariomortille/characters/aurelien/gameplay/hero-atlas.json?v=aurel-current-24');
      for (const name of ['tree', 'bush', 'flowers', 'fence', 'sign', 'lamp']) this.load.image(`decor-${name}`, `/mariomortille/decor/quartier/${name}.png?v=decor-fixed-1`);
      for (const kind of ['pirate','lola','mango']) for(let n=1;n<=8;n++) this.load.image(`boss-${kind}-${n}`, `/mariomortille/bosses/${kind}/${kind}-${String(n).padStart(2,'0')}.png?v=mini-2-pirate-combat`);
      for(const action of ['idle'])for(let n=1;n<=8;n++)this.load.image(`boss-mango-${action}-${n}`,`/mariomortille/bosses/mango/mango-${action}-${String(n).padStart(2,'0')}.png?v=1`);
      for(const kind of ['pirate','lola','mango'])for(const [action,count] of [['walk',kind==='pirate'?4:8],['sprint',kind==='pirate'?4:8],['hurt',4],['die',6]] as const)for(let n=1;n<=count;n++)this.load.image(`boss-${kind}-${action}-${n}`,`/mariomortille/bosses/${kind}/${kind}-${action}-${String(n).padStart(2,'0')}.png?v=${kind==='lola'?'lola-cycles2':'basics2-facefix'}`);
      for(const action of ['idle','walk','pickup'])for(let n=1;n<=8;n++)this.load.image(`boss-raphael-${action}-${n}`,`/mariomortille/story/raph-current/${action}-${String(n).padStart(2,'0')}.png?v=raph-native-2`);
      for(const [action,count] of [['sprint',8],['hurt',4],['die',6]] as const)for(let n=1;n<=count;n++)this.load.image(`boss-raphael-${action}-${n}`,`/mariomortille/bosses/raphael/raphael-${action}-${String(n).padStart(2,'0')}.png?v=1`);
      this.load.spritesheet('beetle', '/mariomortille/beetle.png', { frameWidth: 24, frameHeight: 24 });
      this.load.spritesheet('tiles', '/mariomortille/tiles.png', { frameWidth: 16, frameHeight: 16 });
      this.load.spritesheet('terrain', '/mariomortille/terrain/quartier-v1.png', { frameWidth: 16, frameHeight: 16 });
    }
    create() {
      // Phaser reuses this Scene instance on restart; discard the previous run.
      this.state = createState(level);
      if (appearance) { this.state.player.power = appearance.power; this.state.player.health = appearance.health; this.state.savedPower = appearance.power; }
      this.party = createLevelParty(this.state, level, demo ? [] : levelCompanions(level));
      if (appearance?.character && this.party.members.length===1) { this.party.members[0].id=appearance.character; this.party.active=appearance.character; }
      this.corpse=null;
      this.bossIntro=createBossIntro();this.bossIntroConfirm=false;this.bossIntroGraphics=undefined;
      this.partyViews.clear(); this.partyMotions.clear();
      this.heroMotion = makeHeroMotion(level.spawn.x);
      for (const member of this.party.members) this.partyMotions.set(member.id, member.id === 'aurel' ? this.heroMotion : makeHeroMotion(member.body.x));
      bridge.party?.(this.party.active, this.party.members.map(m => m.id));
      this.equipPending = null; this.equipAge = -1;
      this.accumulator = 0;
      this.hurtAt = -100; this.checkpointAt = -100; this.victoryAge = 0; this.victoryText = undefined;
      this.tileViews.clear();
      this.enemyViews.clear();
      this.enemyProjectileViews.clear();
      this.palmView = createPalmView(this);
      this.chargedDashView = createChargedDashView(this);
      this.itemViews.clear();
      this.projectileViews.clear(); this.itemBursts = [];
      this.bossView = undefined;
      this.iceViews = [];
      this.particles = [];
      this.water = undefined;
      const rooftops = level.id === 'quartier-03';
      const construction = level.id === 'quartier-04';
      this.cameras.main.setBackgroundColor('#53b2e8');
      if (insideHouse) createHouseInterior(this);
      else this.worldBackground = createWorldBackground(this, level.id);
      if (level.id === houseEntrance.levelId) createHouseExterior(this);
      const decor = this.add.graphics();
      const occupied = new Set(this.state.tiles.map(tile => `${tile.x},${tile.y}`));
      const surface = new Map<number, number>();
      for (const tile of this.state.tiles) if (tile.kind === 'ground') surface.set(tile.x, Math.min(surface.get(tile.x) ?? Infinity, tile.y));
      const scenery = construction ? ['fence', 'sign', 'lamp'] : rooftops ? ['flowers', 'fence', 'sign', 'lamp'] : ['tree', 'flowers', 'bush', 'fence', 'sign', 'lamp'];
      for (let x = 176, i = 0; x < level.width - 80 && !insideHouse; x += 240, i++) {
        const groundY = surface.get(x);
        // Keep scenery on broad, level ground, behind collision blocks and actors.
        if (groundY === undefined || surface.get(x - 32) !== groundY || surface.get(x + 32) !== groundY) continue;
        const name = scenery[i % scenery.length];
        this.add.image(x, groundY, `decor-${name}`).setOrigin(.5, 1).setScale(name === 'tree' ? 2 : 1);
      }
      // Water is scenery behind the terrain; gaps retain their existing fall hazard.
      if (!rooftops && !insideHouse) this.water = this.add.tileSprite(0, 336, level.width, 24, 'terrain', 14).setOrigin(0).setDepth(-.1);
      for (const tile of this.state.tiles) {
        const frame = tile.kind === 'ground' ? (construction ? 2 : occupied.has(`${tile.x},${tile.y - 16}`) ? (rooftops ? 10 : 1) : (rooftops ? 9 : 0))
          : tile.kind === 'weak' ? 4 : tile.kind === 'ice' ? 6 : tile.kind === 'reinforced' ? 5 : 3;
        const view = this.add.image(tile.x, tile.y, 'terrain', frame).setOrigin(0).setVisible(!insideHouse);
        this.tileViews.set(`${tile.x},${tile.y}`, view);
        if (tile.kind === 'ice') this.iceViews.push(view);
      }
      for (const item of this.state.pickups) this.itemViews.set(item, this.add.image(item.x + 8, item.y + 8, `item-${itemFrame(item.kind, 0)}`).setOrigin(.5).setScale(.5).setData('collected', item.collected).setVisible(!item.collected && !item.blocked));
      const checkpointGround = markerGround(this.state.tiles, level.checkpoint);
      const goalGround = markerGround(this.state.tiles, level.goal);
      this.flag = this.add.image(checkpointGround?.x ?? level.checkpoint, checkpointGround?.y ?? 0, 'item-flag-wave-01').setOrigin(10 / 32, 71 / 72).setScale(1).setDepth(2);
      this.flag.setVisible(Boolean(checkpointGround) && !insideHouse);
      this.goalFlag = this.add.image(goalGround?.x ?? level.goal, goalGround?.y ?? 0, 'item-finish-flag-01').setOrigin(12/48,94/96).setScale(1).setDepth(2).setVisible(Boolean(goalGround) && !insideHouse);
      this.drawCheckpoint();
      for (const enemy of this.state.enemies) {
        const visual = enemyVisual(enemy);
        this.enemyViews.set(enemy.id, this.add.sprite(visual.x, visual.y, visual.key).setOrigin(.5, 44 / 48).setVisible(visual.visible).setFlipX(visual.flipX));
      }
      this.hero = this.add.sprite(Math.round(this.state.player.x + 10), Math.round(this.state.player.y + 42), 'hero-atlas', heroPose(this.heroMotion, this.state.player)).setOrigin(.5, 59 / 64);
      this.partyViews.set('aurel', this.hero);
      if (!this.party.members.some(m=>m.id==='aurel')) { this.hero.destroy(); this.partyViews.delete('aurel'); }
      for (const member of this.party.members) if (member.id !== 'aurel') {
        const view = this.add.sprite(member.body.x + 10, member.body.y + 42, companionTexture(companionPose(member.id, member.body, this.partyMotions.get(member.id)!)), companionPose(member.id, member.body, this.partyMotions.get(member.id)!)).setOrigin(.5, 58 / 64);
        this.partyViews.set(member.id, view);
      }
      this.hero=this.partyViews.get(this.party.active)!; this.heroMotion=this.partyMotions.get(this.party.active)!;
      if(!this.textures.exists('party-spirit'))this.textures.generate('party-spirit', {
        data:['....111....','..1122211..','.122222221.','12222222221','12202020221','12202020221','12222222221','.122222221.','..1222221..','...12121...','....1.1....'],
        pixelWidth:1,palette:{...Phaser.Create.Palettes.ARNE16,'0':'#184775','1':'#76ddeb','2':'#f2ffff'}
      });
      this.spirit = this.add.image(0,0,'party-spirit').setDepth(12).setVisible(false);
      if (this.state.boss) this.bossView = this.add.sprite(0, 304, this.state.boss.kind === 'raphael' ? 'boss-raphael-idle-1' : `boss-${this.state.boss.kind}-1`).setOrigin(.5, 1).setDepth(5);
      this.effects = this.add.graphics();
      this.trioView=createTrioView(this,this.party);
      this.cameras.main.setBounds(0, 0, level.width, 360).setRoundPixels(true);
      this.game.events.once('postrender', () => bridge.ready?.());
      if (demo) return;
      this.keys = this.input.keyboard!.addKeys('LEFT,RIGHT,UP,DOWN,SPACE,SHIFT,X,C,Q,D,S,E,ESC,TAB,ENTER,V') as typeof this.keys;
      for (const [action, names] of Object.entries({ jump: ['UP', 'SPACE'], down: ['DOWN', 'S'], power: ['X'], dash: ['C'], switch: ['TAB'], trio: ['V'] })) {
        for (const name of names) this.keys[name].on('down', () => {
          if (!bridge.paused) this.inputEdges.press(action as 'jump' | 'down' | 'power' | 'dash' | 'switch' | 'trio');
        });
      }
      for(const name of ['ENTER','SPACE']) this.keys[name].on('down',()=>{if(!bridge.paused)this.bossIntroConfirm=true;});
      this.input.keyboard!.addCapture('TAB');
      this.keys.ESC.on('down', () => { this.inputEdges.clear(); if (!bridge.paused) bridge.pause(); });
      this.keys.E.on('down', () => { if (bridge.paused) return; if (insideHouse && canExitHouse(this.state.player)) bridge.leaveHouse?.(); else if (canEnterHouse(this.state.player, level.id)) bridge.visitHouse?.(); });
      if (insideHouse || level.id === houseEntrance.levelId) this.add.text(insideHouse ? 44 : 468, insideHouse ? 198 : 226, insideHouse ? 'E : SORTIR' : 'E : ENTRER', { fontFamily: 'monospace', fontSize: '10px', color: '#fff4cc', backgroundColor: '#172738' }).setDepth(2);
    }
    updateCompanionDeath(delta:number){
      const corpse=this.corpse;if(!corpse)return false;
      const key=corpse.id+'-die',duration=Math.max(800,companionActionDuration(key));
      corpse.age+=Math.max(0,Math.min(delta,100));this.accumulator=0;this.inputEdges.clear();
      const view=this.partyViews.get(corpse.id)!;
      const frame=companionActionFrame(key,corpse.age*companionActionDuration(key)/duration);
      if(frame)view.setTexture('party-atlas',frame).setOrigin(.5,58/64).setPosition(Math.round(corpse.x+10),Math.round(corpse.y+42)).setFlipX(corpse.facing<0).setRotation(0).setAlpha(1);
      if(corpse.age>=duration){this.corpse=null;}
      return true;
    }
    updateBossIntro(delta:number) {
      const boss=this.state.boss, intro=this.bossIntro;
      if(demo||!boss||this.state.won)return false;
      if(shouldStartBossIntro(intro,boss,this.state.player.x,level.width)){
        startBossIntro(intro,boss.kind);this.bossIntroConfirm=false;
        this.bossIntroGraphics=this.add.graphics().setScrollFactor(0).setDepth(30);
      }
      if(intro.phase==='waiting'||intro.phase==='done'){this.bossIntroConfirm=false;return false;}
      advanceBossIntro(intro,delta,this.bossIntroConfirm);this.bossIntroConfirm=false;
      this.accumulator=0;this.inputEdges.clear();
      const view=this.bossView,camera=this.cameras.main,player=this.state.player;
      camera.scrollX=Phaser.Math.Clamp((player.x+boss.x)/2-300,0,Math.max(0,level.width-640));
      if(view && intro.phase==='arrival'){const action=boss.kind==='raphael'?'walk':intro.age<450?'sprint':'walk';const count=boss.kind==='pirate'?4:8;const frameMs=boss.kind==='lola'?(action==='walk'?115:85):100;const clipAge=boss.kind==='lola'&&action==='walk'?Math.max(0,intro.age-450):intro.age;view.setTexture(`boss-${boss.kind}-${action}-${1+Math.floor(clipAge/frameMs)%count}`).setOrigin(.5,boss.kind==='raphael'?88/96:72/80);}
      else if(view && boss.kind==='pirate')view.setTexture('boss-pirate-1').setOrigin(.5,72/80);
      else if(view && (boss.kind==='mango'||boss.kind==='raphael'))view.setTexture(`boss-${boss.kind}-idle-${1+Math.floor(intro.age/110)%8}`);
      if(view)view.setVisible(true).setPosition(Math.round(boss.x+16+bossArrivalOffset(intro)),Math.round(boss.y+bossHeight(boss)));
      const g=this.bossIntroGraphics!;g.clear();
      if((intro.phase as string)==='done'){g.destroy();this.bossIntroGraphics=undefined;return true;}
      const script=bossIntroLines[intro.kind];
      const write=(text:string,x:number,y:number,color:number,scale=1)=>{
        const art=bitmapText(text);g.fillStyle(color);for(const pixel of art.pixels)g.fillRect(Math.round(x+pixel.x*scale),Math.round(y+pixel.y*scale),scale,scale);
        return art.width*scale;
      };
      if(intro.phase==='arrival'){
        const text=script.name+' APPROCHE';const width=bitmapText(text).width;
        g.fillStyle(0x171b27,.9).fillRect(320-width/2-8,26,width+16,23);write(text,320-width/2,34,0xffd16d);
      } else if(intro.phase==='combat'){
        const width=bitmapText('COMBAT !').width*3;
        g.fillStyle(0x171b27,.92).fillRect(320-width/2-14,116,width+28,43);write('COMBAT !',320-width/2,127,0xffbf56,3);
      } else {
        const speakingBoss=intro.phase==='boss';const lines=speakingBoss?script.threat:script.reply;
        const name=speakingBoss?script.name:this.party.active.toUpperCase();
        const width=Math.max(...[name,...lines].map(line=>bitmapText(line).width))+20;
        const speakerX=(speakingBoss?boss.x+16:player.x+10)-camera.scrollX;
        const speakerY=speakingBoss?boss.y:player.y;
        const x=Math.round(Phaser.Math.Clamp(speakerX-width/2,8,632-width));
        const y=Math.round(Phaser.Math.Clamp(speakerY-68,44,238));
        g.fillStyle(0x1b1c29).fillRect(x-2,y-2,width+4,57);
        g.fillStyle(0xfff2cf).fillRect(x,y,width,53);
        const tip=Phaser.Math.Clamp(speakerX,x+8,x+width-8);
        g.fillStyle(0x1b1c29).fillRect(tip-5,y+53,10,4).fillRect(tip-3,y+57,6,3);
        g.fillStyle(0xfff2cf).fillRect(tip-3,y+51,6,5);
        write(name,x+10,y+7,0x985020);write(lines[0],x+10,y+23,0x222131);write(lines[1],x+10,y+36,0x222131);
      }
      if(intro.phase!=='arrival'){
        const text='ENTREE / ESPACE : CONTINUER';const width=bitmapText(text).width;
        g.fillStyle(0x171b27,.9).fillRect(320-width/2-8,330,width+16,21);write(text,320-width/2,337,0xffefd1);
      }
      return true;
    }
    drawCheckpoint() {
      this.goalFlag?.setTexture(`item-finish-flag-${String(1+Math.floor(this.state.ticks/6)%8).padStart(2,'0')}`);
      this.flag.setTexture(`item-${checkpointFrame(this.state.checkpoint, this.state.ticks, this.checkpointAt)}`);
    }
    syncPartyViews() {
      const ids = new Set(this.party.members.map(member => member.id));
      for (const [id, view] of this.partyViews) if (!ids.has(id)) { view.destroy(); this.partyViews.delete(id); this.partyMotions.delete(id); }
      for (const member of this.party.members) {
        if (!this.partyMotions.has(member.id)) this.partyMotions.set(member.id, makeHeroMotion(member.body.x));
        if (!this.partyViews.has(member.id)) {
          const motion = this.partyMotions.get(member.id)!;
          const view = member.id === 'aurel'
            ? this.add.sprite(member.body.x+10,member.body.y+42,'hero-atlas',heroPose(motion,member.body)).setOrigin(.5,59/64)
            : this.add.sprite(member.body.x+10,member.body.y+42,companionTexture(companionPose(member.id,member.body,motion)),companionPose(member.id,member.body,motion)).setOrigin(.5,58/64);
          this.partyViews.set(member.id,view);
        }
      }
    }
    update(_time: number, delta: number) {
      setRoomKeyboardActive(this.input.keyboard, !bridge.paused);
      if (bridge.paused) { this.accumulator = 0; this.inputEdges.clear(); return; }
      if(this.updateCompanionDeath(delta))return;
      if(this.updateBossIntro(delta))return;
      if (this.state.won && !demo) {
        this.victoryAge += Math.min(delta, 100);
        this.hero.clearTint().setAlpha(1).setRotation(0);
        if (this.party.active !== 'aurel') {
          const motion = this.partyMotions.get(this.party.active)!; motion.idleMs = this.victoryAge;
          this.hero.setTexture(companionTexture(companionPose(this.party.active, this.state.player, motion, true)), companionPose(this.party.active, this.state.player, motion, true)).setOrigin(.5,58/64);
        } else if (this.state.player.power === 'none') this.hero.setTexture(`victory-v2-${victoryFrame(this.victoryAge)}`);
        else this.hero.setTexture('hero-atlas', `hero-${this.state.player.power}-victory-${String(victoryFrame(this.victoryAge)).padStart(2,'0')}`);
        if (!this.victoryText) {
          const art = bitmapText('NIVEAU TERMINE !');
          this.victoryText = this.add.graphics().setScrollFactor(0).setDepth(20);
          const x = Math.round((640 - art.width * 2) / 2);
          this.victoryText.fillStyle(0x171925); this.victoryText.fillRect(x - 12, 99, art.width * 2 + 24, 34);
          this.victoryText.fillStyle(0xffd878);
          for (const pixel of art.pixels) this.victoryText.fillRect(x + pixel.x * 2, 109 + pixel.y * 2, 2, 2);
        }
        if (this.victoryAge >= victoryDuration) bridge.update(this.state);
        return;
      }
      if (this.equipPending && this.state.player.power !== this.equipPending) { this.equipPending = null; this.equipAge = -1; }
      if (this.equipPending && this.state.player.grounded) {
        if (this.equipAge < 0) { this.equipAge = 0; this.inputEdges.clear(); }
        this.equipAge += Math.min(delta, 100);
        const p = this.state.player;
        if (this.party.active === 'aurel') this.hero.setTexture('hero-atlas', equipFrame(this.equipPending, this.equipAge)).setOrigin(.5,59/64);
        else { const frame=companionEquipFrame(this.party.active,this.equipPending,this.equipAge) ?? companionPose(this.party.active,p,this.heroMotion); this.hero.setTexture(companionTexture(frame),frame).setOrigin(.5,58/64); }
        this.hero.setScale(1).setPosition(Math.round(p.x + 10), Math.round(p.y + 42)).setRotation(0).setAlpha(1).clearTint().setFlipX(p.facing < 0);
        this.accumulator = 0;
        if (this.equipAge >= (this.party.active==='aurel' ? equipDurationFor(this.equipPending) : companionEquipDuration(this.party.active,this.equipPending) ?? equipDurationFor(this.equipPending))) { this.equipPending = null; this.equipAge = -1; this.inputEdges.clear(); }
        return;
      }
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
        const input = { direction: Number(k.RIGHT.isDown || k.D.isDown) - Number(k.LEFT.isDown || k.Q.isDown), jump: k.SPACE.isDown || k.UP.isDown, run: k.SHIFT.isDown, dashHeld:k.C.isDown, downHeld: k.DOWN.isDown || k.S.isDown, ...this.inputEdges.consume() };
        if (!this.state.won) bridge.record?.(input);
        const previousPose = heroPose(this.heroMotion, this.state.player);
        const previousBody={...this.state.player};
        const previousX = this.state.player.x;
        const previousVx = this.state.player.vx;
        const previousActive = this.party.active, previousTransfer=this.party.transition;
        stepPartyControls(this.party, this.state, level, input);
        this.syncPartyViews();
        this.hero = this.partyViews.get(this.party.active)!;
        this.heroMotion = this.partyMotions.get(this.party.active)!;
        if (previousActive !== this.party.active) {bridge.party?.(this.party.active, this.party.members.map(m => m.id));if(!bridge.muted)bridge.sound('transfer-start');}
        if(!bridge.muted && previousTransfer && !this.party.transition)bridge.sound('transfer-arrive');
        else if(!bridge.muted && this.party.transition && this.party.transition.ticks%12===0)bridge.sound('transfer-glide');
        if(previousActive===this.party.active && this.party.active!=='aurel' && previousBody.health===1 && previousBody.power==='none' && !previousBody.invulnerable && this.state.events.includes('hurt') && this.state.player.health===3 && companionActionDuration(this.party.active+'-die')){
          this.corpse={id:this.party.active,x:previousBody.x,y:previousBody.y,facing:previousBody.facing,age:0};
          if(!bridge.muted)bridge.sound('hurt');this.updateCompanionDeath(0);bridge.update(this.state);return;
        }
        if (this.state.events.includes('equip') && this.state.player.power !== 'none') { this.equipPending = this.state.player.power; this.equipAge = -1; }
        stepFeedback(this.particles, this.state.events, this.state.player, this.state.ticks);
        for (const member of this.party.members) {const motion=this.partyMotions.get(member.id)!; advanceHeroMotion(motion, member.body, member.id === this.party.active ? input : { direction: Math.sign(member.body.vx), jump: false, jumpPressed: false, run: !!this.party.trio.gathering && Math.abs(member.body.vx)>0, downPressed: false, powerPressed: false });if(member.id!=='aurel')advanceCompanionVisual(motion,member.body,member.id===this.party.active?input:undefined);}
        const dustPlayer = this.state.player;
        const travelled = Math.abs(dustPlayer.x - previousX);
        if (dustPlayer.grounded && !dustPlayer.crouching && travelled > .05 && travelled < 24) {
          if (this.heroMotion.skidding && this.state.ticks % 4 === 0) this.spawnItemBurst(dustPlayer.x + 10 - Math.sign(previousVx) * 7, dustPlayer.y + 43, 'smoke', .75);
          else if (Math.abs(dustPlayer.vx) >= 145 && this.state.ticks % 10 === 0) this.spawnItemBurst(dustPlayer.x + 10 - dustPlayer.facing * 8, dustPlayer.y + 43, 'smoke', .5);
        }
        const step = heroFootstep(previousPose, heroPose(this.heroMotion, this.state.player), this.state.player, this.state.player.x - previousX);
        if (step && !this.heroMotion.skidding && !bridge.muted && !this.state.events.includes('hurt') && !this.state.events.includes('equip')) bridge.sound(step);
        if(this.state.events.includes('boost') && (this.state.player.dashStrength??0)>0)this.spawnItemBurst(this.state.player.x+10-this.state.player.facing*10,this.state.player.y+42,'smoke',1+(this.state.player.dashStrength??0));
        if(this.state.player.boost && (this.state.player.dashStrength??0)>0 && this.state.ticks%5===0)this.spawnItemBurst(this.state.player.x+10-this.state.player.facing*8,this.state.player.y+42,'dash-trail',.7);
        if (this.state.events.includes('checkpoint')) this.checkpointAt = this.state.ticks;

        if (this.state.events.includes('hurt')) this.hurtAt = this.state.ticks;
        for (const event of this.state.events) if (!bridge.muted) bridge.sound(event);
        if (this.state.won) { this.accumulator = 0; break; }
        this.accumulator -= STEP;
      }
      for (const enemy of this.state.enemies) {
        const view = this.enemyViews.get(enemy.id);
        const visual = enemyVisual(enemy);
        view?.setVisible(visual.visible).setPosition(visual.x, visual.y).setFlipX(visual.flipX).setTexture(visual.key).clearTint();
      }
      const p = this.state.player;
      if (this.water) {
        this.water.tilePositionX = -Math.floor(this.state.ticks / 7);
        this.water.tilePositionY = Math.floor(this.state.ticks / 24) % 2;
      }
      for (let i = 0; i < this.iceViews.length; i++) {
        const glint = (this.state.ticks + i * 29) % 180 < 12;
        this.iceViews[i].setTint(glint ? 0xffffff : 0xc8edff);
      }
      for (const member of this.party.members) {
        const view = this.partyViews.get(member.id)!;
        const motion = this.partyMotions.get(member.id)!;
        if (member.id === 'aurel') view.setTexture('hero-atlas', heroPose(motion, member.body)).setOrigin(.5,59/64);
        else view.setTexture(companionTexture(companionPose(member.id,member.body,motion)), companionPose(member.id,member.body,motion)).setOrigin(.5,58/64);
        view.setScale(1).setPosition(Math.round(member.body.x+10),Math.round(member.body.y+42)).setFlipX(member.id==='aurel'?member.body.facing<0:companionFlipX(member.id,member.body,motion)).setRotation(0).clearTint().setAlpha(trioGuestOpacity(this.party,member.id));
        if(member.id==='aurel'&&(motion.brakeMs??-1)>=0&&!member.body.boost&&!member.body.dashCharging)view.setTexture(`aurel-brake-${member.body.power}-${Math.min(5,1+Math.floor((motion.brakeMs??0)/96))}`).setFlipX((motion.brakeFacing??member.body.facing)<0);
        if(member.id==='aurel'){const b=member.body;if(b.dashCharging){const n=Math.min(5,1+Math.floor((b.dashCharge??0)/12));view.setTexture(b.power==='none'?`charged-pose-${n}`:`charged-aurel-${b.power}-charge-${n}`);}else if(b.boost&&(b.dashStrength??0)>0){const n=Math.min(4,1+Math.floor(((b.dashDuration??30)-b.boost)/4));view.setTexture(b.power==='none'?`charged-propulsion-${n}`:`charged-aurel-${b.power}-propulsion-${n}`);}}
        if(member.id==='juju'){const key=bearFrame(member.body,this.state.ticks,'bear',motion.distance);if(key)view.setTexture(key).setOrigin(bearAnchorX(key)/96,bearAnchorY(key)/96).setFlipX(member.body.facing<0);}
        if(member.id==='ben'){const b=member.body,a=this.state.lastCharacterAttack;if(b.dashCharging)view.setTexture(`ben-palm-${b.power}-${Math.min(5,1+Math.floor((b.dashCharge??0)/12))}`);else if(a?.kind==='palm'&&this.state.ticks-a.tick<24)view.setTexture(`ben-palm-${b.power}-${Math.min(8,6+Math.floor((this.state.ticks-a.tick)/8))}`);}
        if(this.party.trio.attack){const age=this.party.trio.attack.age;const frame=age<10?1:age<25?2:age<60?3:age<67?4:age<96?5:6;view.setTexture(`trio-${member.id}-${frame}`).setOrigin(.5,member.id==='aurel'?59/64:58/64).setFlipX(this.party.trio.attack.direction<0);}
      }
      this.palmView?.draw(this.state);
      this.chargedDashView?.draw(this.state);
      this.trioView?.draw(this.state.ticks);
      this.spirit?.setVisible(false);
      const spiritPoint=partySpiritPosition(this.party);
      if(spiritPoint && this.spirit)this.spirit.setVisible(true).setPosition(Math.round(spiritPoint.x),Math.round(spiritPoint.y));
      this.hero.setFlipX(this.party.active==='aurel'?p.facing<0:companionFlipX(this.party.active,p,this.heroMotion)).setRotation(heroRecoil(p));
      // Damage is shown by its sprite animation; keep the approved sprite colors.
      this.hero.clearTint().setAlpha(1);
      this.drawCheckpoint();
      this.effects.clear();
      for (const particle of this.particles) {
        this.effects.fillStyle(particle.color, Math.min(1, particle.life / 6));
        this.effects.fillRect(Math.round(particle.x), Math.round(particle.y), particle.size, particle.size);
      }
      const boss = this.state.boss;
      if (boss && this.bossView) {
        const view=this.bossView;
        if(boss.kind==='raphael') {
          view.setVisible(boss.phase !== 'defeated').setTexture(`boss-raphael-${boss.phase==='charge'?'sprint':boss.phase==='stunned'?'hurt':'idle'}-${boss.phase==='stunned'?2:1+Math.floor(this.state.ticks/8)%8}`).setOrigin(.5,88/96).setPosition(Math.round(boss.x + 16),bossFloor(boss)).setScale(1).setFlipX(boss.direction<0);
        } else {
          const duration=boss.kind==='mango'?90:boss.kind==='pirate'?65:80;
          // Pirate has a full recovery pose; keep all combat poses at the arrival scale.
          const frame=boss.kind==='mango' ? (boss.phase==='tell'?2:boss.phase==='charge'?(boss.timer>42?3:boss.timer>22?4:5):boss.phase==='stunned'?(boss.timer>90?6:7):boss.phase==='defeated'?7:8) : boss.phase==='tell' ? (boss.timer>duration*.65?2:boss.timer>duration*.3?3:4)
            : boss.phase==='charge' ? (boss.kind==='lola'?5:boss.timer>18?5:6)
            : boss.phase==='stunned'||boss.phase==='defeated'?7:boss.kind==='pirate'?8:1;
          if(boss.phase==='defeated' && view.getData('defeatedAt')===undefined) view.setData('defeatedAt',this.state.ticks);
          const size=boss.kind==='lola'?64:80, feet=boss.kind==='lola'?58:72;
          const anchor=boss.kind==='lola'?32:40;
          view.setVisible(boss.phase!=='defeated'||this.state.ticks-view.getData('defeatedAt')<60)
            .setTexture(`boss-${boss.kind}-${frame}`).setScale(1).setOrigin((boss.direction<0?size-anchor:anchor)/size,feet/size)
            .setPosition(Math.round(boss.x+16),Math.round(boss.y+bossHeight(boss))).setFlipX(boss.direction<0);
        }
        if((view.getData('lastHits')??0)!==boss.hits){view.setData('lastHits',boss.hits);view.setData('hitAt',this.state.ticks);}
        const hitAge=this.state.ticks-(view.getData('hitAt')??-1000);
        if(boss.phase==='defeated'||(boss.phase==='recover'&&hitAge<24)){
          const dead=boss.phase==='defeated';const ends=[6,12,19,27,37,76];
          const frame=dead?Math.min(6,1+ends.filter(end=>hitAge>=end).length):Math.min(4,1+Math.floor(hitAge/6));
          view.setTexture(`boss-${boss.kind}-${dead?'die':'hurt'}-${frame}`).setOrigin(.5,boss.kind==='raphael'?88/96:72/80).setVisible(!dead||hitAge<90);
        }
        if (boss.phase === 'tell') { this.effects.fillStyle(0xffc46e); this.effects.fillRect(Math.round(boss.x+13),Math.round(boss.y-18),4,9); this.effects.fillRect(Math.round(boss.x+13),Math.round(boss.y-5),4,3); }
        if (boss.phase === 'stunned') { this.effects.fillStyle(0xffffa6); for(let n=0;n<3;n++)this.effects.fillRect(Math.round(boss.x+6+n*9),Math.round(boss.y-8-(n+Math.floor(this.state.ticks/8))%2*3),3,3); }
      }
      const liveEnemyShots = new Set(this.state.enemyProjectiles.map(shot=>shot.id));
      for(const [id,view] of this.enemyProjectileViews) if(!liveEnemyShots.has(id)){view.destroy();this.enemyProjectileViews.delete(id);}
      for(const shot of this.state.enemyProjectiles){
        let view=this.enemyProjectileViews.get(shot.id);
        if(!view){view=this.add.image(shot.x+4,shot.y+4,'enemy-yarn').setDepth(7);this.enemyProjectileViews.set(shot.id,view);}
        view.setPosition(Math.round(shot.x+4),Math.round(shot.y+4));
      }
      const liveShots = new Set(this.state.projectiles.map(shot => shot.id));
      for (const [id, view] of this.projectileViews) if (!liveShots.has(id)) {
        view.destroy(); this.projectileViews.delete(id);
      }
      for (const shot of this.state.projectiles) {
        let view = this.projectileViews.get(shot.id);
        if (!view) { view = this.add.image(shot.x + 3, shot.y + 3, 'item-fireball-01').setDepth(7).setScale(.5); this.projectileViews.set(shot.id, view); }
        view.setPosition(Math.round(shot.x + 3), Math.round(shot.y + 3)).setOrigin(shot.vx < 0 ? .2 : .8, .5).setFlipX(shot.vx < 0).setTexture(`item-${effectFrame('fireball', this.state.ticks)}`);
      }
      if (this.renderedTerrain !== this.state.tiles || this.renderedTileCount !== this.state.tiles.length) {
        const remaining = new Set(this.state.tiles.map(t => `${t.x},${t.y}`));
        for (const [key, view] of this.tileViews) view.setVisible(!insideHouse && remaining.has(key));
        this.renderedTerrain = this.state.tiles; this.renderedTileCount = this.state.tiles.length;
      }
      for (const [item, view] of this.itemViews) {
        const pickup = item as State['pickups'][number];
        view.setPosition(Math.round(pickup.x+8),Math.round(pickup.y+8));
        view.setData('collected', pickup.collected);
        view.setVisible(!pickup.collected && !pickup.blocked);
        if (!pickup.collected) view.setTexture(`item-${itemFrame(pickup.kind, this.state.ticks)}`);
      }
      this.itemBursts = this.itemBursts.filter(burst => {
        const frame = effectFrame(burst.kind, this.state.ticks - burst.at);
        if (!frame) { burst.view.destroy(); return false; }
        burst.view.setTexture(`item-${frame}`); return true;
      });
      const camera = this.cameras.main;
      if(spiritPoint)camera.scrollX=Phaser.Math.Clamp(spiritPoint.x-230,0,level.width-640);
      else camera.scrollX += (Phaser.Math.Clamp(p.x - 230, 0, level.width - 640) - camera.scrollX) * (1 - Math.exp(-delta / 140));
      this.worldBackground?.update(camera.scrollX, this.state.ticks / 60);
      if (!this.state.won) bridge.update(this.state);
    }
  };
}
