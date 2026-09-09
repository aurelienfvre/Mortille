import { cancelDashCharge } from './charged-dash';
import { physicsWorld, planTo, type Party, type PartyId, type PartyMember } from './party';
import { startTrioAttack } from './trio';
import { tick, type Controls, type Level, type State } from './simulation';

type Point = {x:number;y:number};
export type TrioGuest = {id:PartyId;entry:Point};
export type TrioGathering = {phase:'arrive'|'depart';age:number;targets:{id:PartyId;point:Point}[]};
const idle:Controls={direction:0,jump:false,jumpPressed:false,run:false,downPressed:false,powerPressed:false};
/** A full supported standing box, never a coordinate inside scenery or a pit. */
function floorAt(world:State,level:Level,x:number,nearY:number,range=96):Point|null {
 if(x<0||x+20>level.width)return null;
 const floors=[...new Set(world.tiles.filter(t=>x<t.x+16&&x+20>t.x&&Math.abs(t.y-42-nearY)<=range).map(t=>t.y))].sort((a,b)=>Math.abs(a-42-nearY)-Math.abs(b-42-nearY)||a-b);
 for(const floor of floors){
  const y=floor-42;
  if(world.tiles.some(t=>x<t.x+16&&x+20>t.x&&y<t.y+16&&y+42>t.y))continue;
  if([x+1,x+19].every(px=>world.tiles.some(t=>t.y===floor&&px>=t.x&&px<t.x+16)))return{x,y};
 }
 return null;
}
export function beginTrioGathering(party:Party,world:State,level:Level) {
 const lead=world.player;
 const additions:PartyMember[]=[];const guests:TrioGuest[]=[...party.trio.guests];
 for(const id of ['aurel','juju','ben'] as const){
  if(party.members.some(m=>m.id===id))continue;
  let entry:Point|null=null;
  // Prefer the offscreen end of the nearby corridor; no existing body is moved.
  for(const distance of [300,268,236,204,172,140,108]){
   for(const direction of [-lead.facing,lead.facing]){
    const p=floorAt(world,level,lead.x+distance*direction,lead.y,16);
    if(p && [...party.members,...additions].every(m=>Math.abs(m.body.x-p.x)>=30)){entry=p;break;}
   }
   if(entry)break;
  }
  if(!entry)return false;
  const body={...lead,...entry,characterId:id,bearStage:0 as const,bearTicks:0,bearStrength:0,clawCooldown:0,vx:0,vy:0,power:'none' as const,health:3,grounded:true,crouching:false,boost:0,pound:0,buffer:0};
  additions.push({id,body,route:[],plan:[]});guests.push({id,entry});
 }
 const allies=[...party.members,...additions].filter(m=>m.id!==party.active).sort((a,b)=>Math.abs(a.body.x-lead.x)-Math.abs(b.body.x-lead.x)||a.id.localeCompare(b.id));
 const targets:TrioGathering['targets']=[];
 for(const m of allies){
  const side=Math.sign(m.body.x-lead.x)||-lead.facing;let point:Point|null=null;
  for(const offset of [32,64,96,-32,-64,-96]){
   const p=floorAt(world,level,lead.x+offset*side,lead.y,4);
   if(p&&targets.every(t=>Math.abs(t.point.x-p.x)>=30)){point=p;break;}
  }
  if(!point)return false;
  targets.push({id:m.id,point});
 }
 party.members.push(...additions);party.trio.guests=guests;
 party.trio.gathering={phase:'arrive',age:0,targets};party.trio.notice=0;
 for(const m of party.members){cancelDashCharge(m.body);m.plan=[];m.retryTicks=0;m.body.vx=0;}
 return true;
}
export function beginTrioDeparture(party:Party) {
 if(!party.trio.guests.length)return;
 party.trio.gathering={phase:'depart',age:0,targets:party.trio.guests.map(g=>({id:g.id,point:g.entry}))};
 for(const m of party.members){m.plan=[];m.retryTicks=0;}
}
function routeSegment(m:PartyMember,target:Point,world:State,level:Level):Controls[] {
 if(Math.abs(target.x-m.body.x)<220){const direct=planTo(m.body,target,level,world.tiles,true);if(direct.length)return direct;}
 const direction=Math.sign(target.x-m.body.x);
 // Search a short reachable platform along the route. Each candidate includes a
 // simulated landing, so a run/jump cannot blindly carry a companion into a pit.
 for(const distance of [180,144,108,72,36]){
  if(distance>Math.abs(target.x-m.body.x))continue;
  const x=m.body.x+distance*direction;
  const candidates=[floorAt(world,level,x,target.y,112),floorAt(world,level,x,m.body.y,112)];
  for(const p of candidates){if(!p)continue;const plan=planTo(m.body,p,level,world.tiles,true);if(plan.length)return plan;}
 }
 // Retain usable breadcrumbs for routes with height changes or a detour.
 for(const p of m.route){
  if((p.x-m.body.x)*direction<8||Math.abs(p.x-m.body.x)>220)continue;
  const plan=planTo(m.body,p,level,world.tiles,true);if(plan.length)return plan;
 }
 return [];
}
/** Fixed-tick rally. It advances local collision physics, never teleports a body,
 * awards pickups, or advances enemies twice. Thus replay needs no extra input. */
export function stepTrioGathering(party:Party,world:State,level:Level) {
 const g=party.trio.gathering;if(!g)return false;
 world.ticks++;world.events=[];g.age++;world.player.vx=0;
 let arrived=true;
 const ordered=[...g.targets].sort((a,b)=>Math.abs(party.members.find(m=>m.id===a.id)!.body.x-a.point.x)-Math.abs(party.members.find(m=>m.id===b.id)!.body.x-b.point.x)||a.id.localeCompare(b.id));
 for(const t of ordered){
  const m=party.members.find(m=>m.id===t.id)!;const b=m.body;
  if(b.grounded&&Math.abs(b.x-t.point.x)<=4&&Math.abs(b.y-t.point.y)<=4){b.vx=0;continue;}
  arrived=false;m.retryTicks=Math.max(0,(m.retryTicks??0)-1);
  if(!m.plan.length&&!m.retryTicks){m.plan=routeSegment(m,t.point,world,level);if(!m.plan.length)m.retryTicks=20;}
  const input=m.plan.shift()??idle;
  const trial=physicsWorld(b,level,world.tiles);tick(trial.state,trial.level,input);
  if(trial.state.events.includes('hurt')||trial.state.player.y>440){m.plan=[];m.retryTicks=20;continue;}
  const next=trial.state.player;
  if(party.members.some(other=>other!==m&&Math.abs(other.body.y-next.y)<30&&Math.abs(other.body.x-next.x)<27&&Math.abs(other.body.x-next.x)<Math.abs(other.body.x-b.x))){next.x=b.x;next.vx=0;m.plan=[];}
  Object.assign(b,next);
 }
 if(arrived){
  party.trio.gathering=null;
  for(const m of party.members){m.plan=[];m.route=[];m.retryTicks=0;}party.lastAnchor=null;
  if(g.phase==='arrive')startTrioAttack(party,world);
  else{const ids=new Set(party.trio.guests.map(g=>g.id));party.members=party.members.filter(m=>!ids.has(m.id));party.trio.guests=[];}
 }else if(g.age>=1800){
  // A sealed route has no physical solution. Release control and retain the charge
  // and every visible body at its actual location instead of snapping it away.
  party.trio.gathering=null;party.trio.notice=240;
  for(const m of party.members){m.plan=[];m.body.vx=0;}
 }
 return true;
}
/** A short entry/exit fade covers narrow levels where no offscreen floor exists. */
export function trioGuestOpacity(party:Party,id:PartyId) {
 const guest=party.trio.guests.find(g=>g.id===id),g=party.trio.gathering;
 if(!guest||!g)return 1;
 if(g.phase==='arrive')return Math.min(1,g.age/18);
 const b=party.members.find(m=>m.id===id)!.body;
 return Math.min(1,Math.hypot(b.x-guest.entry.x,b.y-guest.entry.y)/48);
}
