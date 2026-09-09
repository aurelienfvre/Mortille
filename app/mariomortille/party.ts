import { cancelDashCharge } from './charged-dash';
import { stepTrioGathering } from './trio-gathering';
import { createTrio, collectTrio, stepTrio, type Trio } from './trio';
import { collisionCandidates } from './terrain-index';
import { createState, tick, type Controls, type Level, type Player, type State, type Tile } from './simulation';

export type PartyId = 'aurel' | 'juju' | 'ben';
type Point = { x: number; y: number };
export type PartyMember = { id: PartyId; body: Player; route: Point[]; plan: Controls[]; retryTicks?: number };
export type Party = { trio:Trio; active: PartyId; members: PartyMember[]; transition: { from: PartyId; to: PartyId; ticks: number; duration: number; start: Point } | null; lastAnchor: Point | null };
const idle: Controls = { direction: 0, jump: false, jumpPressed: false, run: false, downPressed: false, powerPressed: false };
const member = (party: Party, id: PartyId) => party.members.find(m => m.id === id)!;
/** Explicit level spawn points, never arbitrary offsets into walls. */
export function createParty(active: Player, companions: Partial<Record<Exclude<PartyId, 'aurel'>, Player>>): Party {
 active.characterId='aurel';
 return { trio:{charges:0,amulets:[],attack:null,gathering:null,guests:[],notice:0}, active: 'aurel', members: [{ id: 'aurel', body: active, route: [], plan: [] }, ...(['juju','ben'] as const).filter(id => companions[id]).map(id => ({ id, body: { ...companions[id]!,characterId:id }, route: [], plan: [] }))], transition: null, lastAnchor: null };
}
/** Bind once before the world's single normal tick. Each body owns its power and health. */
export function bindPartyPlayer(party: Party, world: State) { world.player = member(party, party.active).body;world.player.characterId=party.active; }
export function switchPartyMember(party: Party, world: State, id: PartyId) {
 if (id === party.active || party.trio.attack || party.trio.gathering || party.transition || !party.members.some(m => m.id === id)) return false;
 if(world.player.specialRecovery)return false;
 const from = party.active, source=member(party,from).body, target=member(party,id).body;
 cancelDashCharge(source);
 const duration=Math.ceil(Math.min(1.4,.45+Math.hypot(target.x-source.x,target.y-source.y)/1200)*60);
 const start={x:source.x+10,y:source.y+7};
 party.active = id; bindPartyPlayer(party, world);
 party.transition = { from, to: id, ticks: duration, duration, start }; party.lastAnchor = null;
 for (const m of party.members) { m.route = []; m.plan = []; m.retryTicks = 0; }
 return true;
}
export function physicsWorld(body: Player, level: Level, tiles: Tile[]) {
 // Local copied terrain prevents speculative breaks from mutating the shared world.
 // 90 planning ticks at walking speed fit comfortably inside this corridor.
 const nearby = collisionCandidates(tiles, body.x - 400, 820);
 const isolated: Level = { id: level.id, width: level.width, spawn: { x: body.x, y: body.y }, tiles: nearby, pickups: [], enemies: [], checkpoint: Infinity, goal: Infinity };
 const state = createState(isolated); state.player = { ...body }; return { level: isolated, state };
}
/** Validate a whole short movement, including its landing, before leaving support.
 * This is deliberately conservative: a blocked companion waits for a usable route.
 */
export function planTo(body: Player, target: Point, level: Level, tiles: Tile[], running = false): Controls[] {
 if (!body.grounded) return [];
 const direction = Math.sign(target.x - body.x);
 if (!direction || Math.abs(target.x - body.x) < 4) return [];
 for (const jumping of [false, true]) {
  const trial = physicsWorld(body, level, tiles); const commands: Controls[] = [];
  let leftGround = false;
  for (let i = 0; i < 90; i++) {
   const p = trial.state.player;
   const close = Math.abs(p.x - target.x) <= 4;
   const input = { ...idle, run: running, direction: close ? 0 : direction, jump: jumping && i < 22, jumpPressed: jumping && i === 0 };
   if (p.y > 440 || (p.x - target.x) * direction > 18) break;
   tick(trial.state, trial.level, input); commands.push(input);
   leftGround ||= !p.grounded;
   if (p.grounded && Math.abs(p.x - target.x) <= 4 && Math.abs(p.y - target.y) <= 4 && (!jumping || leftGround)) return commands;
   // A simulated respawn must never become a valid route.
   if (trial.state.events.includes('hurt')) break;
  }
 }
 return [];
}
/** Run AFTER one tick(world,...). Does not step shared enemies, scoring or pickups.
 * Grounded breadcrumbs are retained in order; followers never teleport to catch up.
 */
export function stepPartyFollowers(party: Party, world: State, level: Level) {
 if (party.transition && --party.transition.ticks <= 0) party.transition = null;
 const lead = member(party, party.active).body;
 if (lead.grounded && (!party.lastAnchor || Math.hypot(lead.x-party.lastAnchor.x, lead.y-party.lastAnchor.y) >= 18)) {
  const point = { x: lead.x, y: lead.y }; party.lastAnchor = point;
  for (const m of party.members) if (m.id !== party.active && m.route.length < 256) m.route.push(point);
 }
 for (const m of party.members) {
  if (m.id === party.active) continue;
  while (m.route.length && Math.abs(m.body.x-m.route[0].x) <= 4 && Math.abs(m.body.y-m.route[0].y) <= 4) m.route.shift();
  m.retryTicks = Math.max(0,(m.retryTicks ?? 0)-1);
  const targetDirection=Math.sign((m.route[0]?.x??m.body.x)-m.body.x);
  const waitingForSpace=party.members.some(other=>other!==m && Math.abs(other.body.y-m.body.y)<30 && (other.body.x-m.body.x)*targetDirection>0 && Math.abs(other.body.x-m.body.x)<=31);
  if(waitingForSpace){m.plan=[];m.retryTicks=0;}
  if (!waitingForSpace && !m.plan.length && m.route.length && !m.retryTicks) {
   m.plan = planTo(m.body, m.route[0], level, world.tiles);
   if (!m.plan.length) m.retryTicks = 15;
  }
  const input = waitingForSpace ? idle : m.plan.shift() ?? idle;
  const isolated = physicsWorld(m.body, level, world.tiles);
  tick(isolated.state, isolated.level, input);
  // Terrain can change after planning. Cancel at danger, retaining the physical body.
  if (isolated.state.events.includes('hurt') || isolated.state.player.y > 440) { m.plan = []; continue; }
  const next=isolated.state.player;
  const crowds=party.members.some(other=>other!==m && Math.abs(other.body.y-next.y)<30 && Math.abs(next.x-other.body.x)<28 && Math.abs(next.x-other.body.x)<Math.abs(m.body.x-other.body.x));
  if(crowds){
   // Hold the existing horizontal position, never snap a body to a formation slot.
   // Gravity and vertical collision still resolve normally.
   next.x=m.body.x;next.vx=0;m.plan=[];
  }
  Object.assign(m.body, next);
 }
}
/** Deterministic explicit opt-in by the caller (same IDs on client and replay server). */
export function createLevelParty(world: State, level: Level, ids: readonly Exclude<PartyId,'aurel'>[]): Party {
 const companions: Partial<Record<Exclude<PartyId,'aurel'>,Player>> = {};
 const occupied = [world.player.x];
 for (const id of ids) {
  for (let distance=28;distance<=196;distance+=28) {
   let found = false;
   for (const direction of [-1,1]) {
    const x = world.player.x + distance*direction;
    if (x<0 || x+20>level.width || occupied.some(other=>Math.abs(other-x)<24)) continue;
    const grounds=world.tiles.filter(t=>x<t.x+16&&x+20>t.x&&t.y>=world.player.y+42-16&&t.y<=world.player.y+42+64).sort((a,b)=>a.y-b.y);
    const floor=grounds[0]?.y;if(floor===undefined)continue;
    const y=floor-42;
    const solid=world.tiles.some(t=>x<t.x+16&&x+20>t.x&&y<t.y+16&&y+42>t.y);
    const supported=[x+1,x+19].every(px=>grounds.some(t=>t.y===floor&&px>=t.x&&px<t.x+16));
    if(solid||!supported)continue;
    companions[id]={...world.player,x,y,vx:0,vy:0,grounded:true};occupied.push(x);found=true;break;
   }
   if(found)break;
  }
 }
 const party=createParty(world.player,companions);party.trio=createTrio(level,true);return party;
}
/** One public world tick; follower simulations never advance shared enemies twice. */
export function stepParty(party: Party, world: State, level: Level, controls: Controls, switchTo?: PartyId) {
 if (stepTrioGathering(party,world,level))return;
 if (stepTrio(party,world))return;
 if (switchTo) switchPartyMember(party,world,switchTo);
 bindPartyPlayer(party,world);
 tick(world,level,party.transition ? idle : controls);
 collectTrio(party,world,!!controls.trioPressed,level);
 if(!world.won && !party.trio.gathering && !party.trio.attack)stepPartyFollowers(party,world,level);
}

export const levelCompanions=(level:Level):readonly Exclude<PartyId,'aurel'>[] => ['quartier-01','quartier-02','quartier-03'].includes(level.id)?['juju','ben']:[];
export function stepPartyControls(party:Party,world:State,level:Level,input:Controls) {
 const index=party.members.findIndex(m=>m.id===party.active);
 const next=input.switchPressed?party.members[(index+1)%party.members.length].id:undefined;
 stepParty(party,world,level,input,next);
}

/** The camera follows this same path, so distant transfers never vanish offscreen. */
export function partySpiritPosition(party:Party) {
 const t=party.transition;if(!t)return null;
 const target=member(party,t.to).body;
 const progress=Math.max(0,Math.min(1,1-t.ticks/t.duration));
 const eased=progress*progress*(3-2*progress);
 return {x:t.start.x+(target.x+10-t.start.x)*eased,y:t.start.y+(target.y+7-t.start.y)*eased-Math.sin(progress*Math.PI)*25};
}
