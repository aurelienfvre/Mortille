import { chargedDashDamage } from './charged-dash';
import { playerHitbox, type State, type Level } from './simulation';
export type BossKind = 'raphael' | 'pirate' | 'lola' | 'mango';
export type Boss = { push?:{ticks:number;vx:number}; kind: BossKind; initialX?: number; activated?: boolean; groundY?: number; arenaLeft?: number; arenaRight?: number; startX?: number; targetX?: number; x: number; y: number; direction: number; health: number; phase: 'tell' | 'charge' | 'stunned' | 'recover' | 'defeated'; timer: number; hits: number };
export function makeBoss(level?: Omit<Level,'boss'> & {boss?:BossKind}): Boss {
 if(level?.boss && level.boss !== 'raphael') return makeMiniBoss(level,level.boss);
 if(level){const arena=makeMiniBoss(level,'pirate');return {...arena,kind:'raphael',y:bossFloor(arena)-80,health:4,timer:100};}
 const x=(level ? Math.max(0, level.width - 1024) : 0) + 720;
 return { kind: 'raphael', initialX:x, activated:false, x, y: 224, direction: -1, health: 4, phase: 'tell', timer: 100, hits: 0 }; }
/** Attacks lock their direction during the tell, leaving room to evade the charge. */
export function stepBoss(s: State, l: Level, oldY: number, hurt: (s: State, l: Level, fromX: number) => void) {
  const b = s.boss; if (!b || b.phase === 'defeated') return;
  // One deterministic entrance shared by presentation and replay simulation.
  b.initialX ??= b.x;
  if(!b.activated){if(s.player.x < b.initialX-400)return;b.activated=true;}
  if (b.kind !== 'raphael') { stepMiniBoss(s,l,oldY,hurt); return; }
  const p = s.player;
  const origin = Math.max(0, l.width - 1024);
  const floor=bossFloor(b),left=b.arenaLeft??origin+150,right=b.arenaRight??origin+790;
  b.timer--;
  if (b.phase === 'tell' && b.timer <= 0) { b.phase = 'charge'; b.timer = 150; }
  else if (b.phase === 'charge') {
    const next=b.x+b.direction*(b.health<=2?4.6:3.6);
    const blocked=s.tiles.some(t=>next<t.x+16&&next+32>t.x&&b.y<t.y+16&&floor>t.y);
    if(blocked)b.timer=0;else b.x=next;
    if (b.x < left || b.x > right || b.timer <= 0) { b.x = Math.max(left, Math.min(right, b.x)); b.phase = 'stunned'; b.timer = 105; b.y = floor-48; }
  } else if (b.phase === 'stunned' && b.timer <= 0) { b.phase = 'recover'; b.timer = 40; b.y = floor-80; }
  else if (b.phase === 'recover' && b.timer <= 0) { b.phase = 'tell'; b.timer = b.health <= 2 ? 55 : 80; b.direction = p.x < b.x ? -1 : 1; }
  const hitbox = playerHitbox(p);
  const contact = p.x < b.x + 32 && p.x + 20 > b.x && hitbox.y < floor && hitbox.y + hitbox.height > b.y;
  const stomp = contact && p.vy > 0 && oldY + 42 <= b.y + 8;
  const fire = s.projectiles.find(shot => shot.x < b.x + 32 && shot.x + 6 > b.x && shot.y < floor && shot.y + 6 > b.y);
  const dash=contact?chargedDashDamage(p):0;
  if (b.phase === 'stunned' && (stomp || fire || dash)) {
    if (fire) fire.life = 0;
    const amount=Math.min(b.health,dash||1);b.health-=amount;b.hits+=amount;s.events.push('stomp');
    if(dash){s.lastDashImpact={x:b.x+16,y:b.y+20,tick:s.ticks,strength:p.dashStrength??0};s.events.push('dash-impact');p.boost=0;p.dashStrength=0;p.vx=0;p.invulnerable=30;}
    if (stomp) { p.vy = -310; p.pound = 0; p.invulnerable = 30; }
    b.y = floor-80; b.phase = b.health ? 'recover' : 'defeated'; b.timer = 55;
    if (!b.health) s.score += 2500;
  } else if (contact) hurt(s, l, b.x);
}

export function bossHeight(b: Boss) { return b.kind === 'raphael' ? (b.phase === 'stunned' ? 48 : 80) : b.kind === 'mango' ? 48 : b.kind === 'pirate' ? 40 : 36; }
export function bossFloor(b: Boss) { return b.groundY ?? 304; }
function makeMiniBoss(l: Omit<Level,'boss'>, kind: 'pirate'|'lola'|'mango'): Boss {
 const desired=Math.max(0,l.goal-150);
 const ground=l.tiles.filter(t=>t.kind==='ground');
 const tops=new Map<number, (typeof ground)[number]>();
 for(const tile of ground)if(!tops.has(tile.x)||tile.y<tops.get(tile.x)!.y)tops.set(tile.x,tile);
 const surface=[...tops.values()];
 const seed=[...surface].sort((a,b)=>Math.abs(a.x-desired)-Math.abs(b.x-desired)||a.y-b.y)[0];
 const floor=seed?.y ?? l.spawn.y+42;
 const columns=new Set(surface.filter(t=>t.y===floor).map(t=>t.x));
 let left=seed?.x ?? 0,right=left;
 while(columns.has(left-16)&&left>desired-480)left-=16;
 while(columns.has(right+16)&&right<l.goal+64)right+=16;
 const arenaLeft=Math.max(0,left),arenaRight=Math.max(arenaLeft,Math.min(l.width-32,right-16));
 const x=Math.max(arenaLeft,Math.min(arenaRight,desired));
 return {kind,initialX:x,activated:false,x,y:floor-(kind==='mango'?48:kind==='pirate'?40:36),groundY:floor,arenaLeft,arenaRight,direction:-1,health:kind==='mango'?4:3,phase:'tell',timer:kind==='mango'?90:kind==='pirate'?65:80,hits:0};
}
/** Mini-boss attacks never track after their telegraph. Only recovery can be punished. */
function stepMiniBoss(s: State,l: Level,oldY:number,hurt:(s:State,l:Level,fromX:number)=>void) {
 const b=s.boss!,p=s.player,left=b.arenaLeft!,right=b.arenaRight!,floor=bossFloor(b),height=bossHeight(b);
 b.timer--;
 if(b.phase==='tell'&&b.timer<=0){
  b.startX=b.x;
  b.targetX=Math.max(left,Math.min(right,b.x+b.direction*(b.kind==='mango'?180:b.kind==='pirate'?132:176)));
  b.phase='charge';b.timer=b.kind==='mango'?60:b.kind==='pirate'?36:48;
 } else if(b.phase==='charge'){
  const duration=b.kind==='mango'?60:b.kind==='pirate'?36:48;
  const t=Math.min(1,(duration-b.timer)/duration);
  const nextX=b.startX!+(b.targetX!-b.startX!)*t;
  const nextY=floor-height-(b.kind!=='pirate'?Math.round(4*(b.kind==='mango'?80:64)*t*(1-t)):0);
  const blocked=s.tiles.some(tile=>nextX<tile.x+16&&nextX+32>tile.x&&nextY<tile.y+16&&nextY+height>tile.y);
  if(blocked)b.timer=0;else {b.x=nextX;b.y=nextY;}
  if(b.timer<=0){b.y=floor-height;b.phase='stunned';b.timer=b.kind==='mango'?110:b.kind==='pirate'?96:78;}
 } else if(b.phase==='stunned'&&b.timer<=0){b.phase='recover';b.timer=30;}
 else if(b.phase==='recover'&&b.timer<=0){b.phase='tell';b.timer=b.kind==='mango'?90:b.kind==='pirate'?65:80;b.direction=p.x+10<b.x+16?-1:1;}
 const hitbox=playerHitbox(p);
 const contact=p.x<b.x+32&&p.x+20>b.x&&hitbox.y<b.y+height&&hitbox.y+hitbox.height>b.y;
 const stomp=contact&&p.vy>0&&oldY+42<=b.y+8;
 const shot=s.projectiles.find(f=>f.life>0&&f.x<b.x+32&&f.x+6>b.x&&f.y<b.y+height&&f.y+6>b.y);
 const dash=contact?chargedDashDamage(p):0;
 if(b.phase==='stunned'&&(stomp||shot||dash)){
  if(shot)shot.life=0;
  const amount=Math.min(b.health,dash||1);b.health-=amount;b.hits+=amount;s.events.push('stomp');
  if(dash){s.lastDashImpact={x:b.x+16,y:b.y+20,tick:s.ticks,strength:p.dashStrength??0};s.events.push('dash-impact');p.boost=0;p.dashStrength=0;p.vx=0;p.invulnerable=30;}
  if(stomp){p.vy=-280;p.pound=0;p.invulnerable=30;}
  b.phase=b.health?'recover':'defeated';b.timer=35;
  if(!b.health)s.score+=b.kind==='mango'?2500:1250;
 } else {
  // A closed defense consumes fire; it cannot wait inside the body for the opening.
  if(shot)shot.life=0;
  if(contact && b.phase !== 'stunned')hurt(s,l,b.x);
 }
}
