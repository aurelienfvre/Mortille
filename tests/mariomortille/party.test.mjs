import test from 'node:test';
import assert from 'node:assert/strict';
import {createState} from '../../app/mariomortille/simulation.ts';
import {createParty,createLevelParty,stepParty,switchPartyMember,stepPartyFollowers,bindPartyPlayer} from '../../app/mariomortille/party.ts';
const level=(tiles=Array.from({length:50},(_,i)=>({x:i*16,y:160,kind:'ground'})))=>({id:'team',width:800,spawn:{x:20,y:118},tiles,pickups:[],enemies:[],checkpoint:700,goal:780});
function setup(l=level()) {const s=createState(l);s.player.grounded=true;const juju={...s.player,x:0,health:2,power:'ember'};const p=createParty(s.player,{juju});return {l,s,p};}
test('switch transfers control without replacing or translating distinct bodies',()=>{
 const {s,p}=setup();const a=s.player;const b=p.members[1].body;
 assert.equal(switchPartyMember(p,s,'juju'),true);assert.equal(s.player,b);assert.equal(s.player.x,0);assert.equal(s.player.power,'ember');assert.equal(a.x,20);
 assert.equal(switchPartyMember(p,s,'aurel'),false,'transition cannot be spammed');
 p.transition=null;assert.equal(switchPartyMember(p,s,'aurel'),true);assert.equal(s.player,a);assert.equal(s.player.health,3);
 bindPartyPlayer(p,s);assert.equal(s.player,a);
});
test('follower walks with shared collision physics without ticking shared world or scoring',()=>{
 const {l,s,p}=setup();s.player.x=120;
 for(let i=0;i<120;i++)stepPartyFollowers(p,s,l);
 assert.ok(p.members[1].body.x>85 && p.members[1].body.x<=92);assert.equal(p.members[1].body.y,118);
 assert.equal(s.ticks,0);assert.equal(s.score,0);assert.equal(s.player.x,120);
});
test('solid wall blocks follower rather than teleporting to leader',()=>{
 const l=level();for(let y=0;y<160;y+=16)l.tiles.push({x:64,y,kind:'brick'});
 const {s,p}=setup(l);s.player.x=160;
 for(let i=0;i<120;i++)stepPartyFollowers(p,s,l);
 assert.ok(p.members[1].body.x<64-20);assert.equal(p.members[1].body.y,118);
});
test('wide pit is refused; independent repeated party simulations are identical',()=>{
 const l=level(level().tiles.filter(t=>t.x<48||t.x>=400));const a=setup(l),b=setup(l);a.s.player.x=b.s.player.x=420;
 for(let i=0;i<60;i++){stepPartyFollowers(a.p,a.s,l);stepPartyFollowers(b.p,b.s,l);}
 assert.ok(a.p.members[1].body.x<28);assert.deepEqual(a.p,b.p);
});

test('selected level creates grounded distinct companion spawns and ticks world once',()=>{
 const l=level(),world=createState(l);world.player.grounded=true;
 const p=createLevelParty(world,l,['juju','ben']);assert.equal(p.members.length,3);
 assert.equal(new Set(p.members.map(m=>m.body.x)).size,3);
 for(const m of p.members)assert.equal(m.body.y,118);
 stepParty(p,world,l,{direction:0,jump:false,jumpPressed:false,run:false,downPressed:false,powerPressed:false},'ben');
 assert.equal(world.ticks,1);assert.equal(p.active,'ben');assert.equal(world.player,p.members[2].body);
});

test('real campaign airborne spawn still supplies both grounded companions',async()=>{
 const {firstLevel}=await import('../../app/mariomortille/first-level.ts');
 const s=createState(firstLevel),p=createLevelParty(s,firstLevel,['juju','ben']);
 assert.equal(p.members.length,3);
 for(const m of p.members.slice(1)){assert.equal(m.body.grounded,true);assert.equal(m.body.y+42,304);}
 const before=structuredClone(s.tiles);
 for(let i=0;i<20;i++)stepPartyFollowers(p,s,firstLevel);
 assert.deepEqual(s.tiles,before,'speculative follower worlds cannot break shared terrain');
});


test('followers stop in separate spaces and keep their own powers through switches',()=>{
 const l=level(),s=createState(l);s.player.x=160;s.player.grounded=true;s.player.power='cloud';
 const p=createParty(s.player,{juju:{...s.player,x:40,power:'ember'},ben:{...s.player,x:0,power:'cobalt'}});
 for(let i=0;i<300;i++){
  const before=p.members.map(m=>m.body.x);stepPartyFollowers(p,s,l);
  p.members.forEach((m,j)=>assert.ok(Math.abs(m.body.x-before[j])<=3,'no formation teleport'));
 }
 const xs=p.members.map(m=>m.body.x);
 for(let i=0;i<xs.length;i++)for(let j=i+1;j<xs.length;j++)assert.ok(Math.abs(xs[i]-xs[j])>=28);
 assert.deepEqual(p.members.map(m=>m.body.power),['cloud','ember','cobalt']);
 assert.ok(p.members[1].body.x>120 && p.members[2].body.x>85,'followers actually approached');
 const positions=p.members.map(m=>({x:m.body.x,y:m.body.y}));
 switchPartyMember(p,s,'ben');assert.deepEqual(p.members.map(m=>({x:m.body.x,y:m.body.y})),positions);
 for(let i=0;i<120;i++)stepPartyFollowers(p,s,l);
 assert.deepEqual(p.members.map(m=>m.body.power),['cloud','ember','cobalt']);
});

test('real campaign settles from spawn and stays separated at rest',async()=>{
 const {firstLevel}=await import('../../app/mariomortille/first-level.ts');
 const s=createState(firstLevel),p=createLevelParty(s,firstLevel,['juju','ben']);
 const idle={direction:0,jump:false,jumpPressed:false,run:false,downPressed:false,powerPressed:false};
 for(let i=0;i<300;i++)stepParty(p,s,firstLevel,idle);
 assert.equal(p.members.length,3);
 for(let i=0;i<3;i++)for(let j=i+1;j<3;j++)assert.ok(Math.abs(p.members[i].body.x-p.members[j].body.x)>=28);
});

test('long transfers show a continuous camera-followable path instead of a near-instant teleport',async()=>{
 const {partySpiritPosition}=await import('../../app/mariomortille/party.ts');
 const l={id:'transfer',width:12000,goal:11900,checkpoint:200,tiles:Array.from({length:750},(_,i)=>({x:i*16,y:192,kind:'ground'})),pickups:[],enemies:[],spawn:{x:64,y:150}};
 const s=createState(l),p=createParty(s.player,{juju:{...s.player,x:10000,grounded:true}});
 switchPartyMember(p,s,'juju');assert.equal(p.transition.duration,84);
 const start=partySpiritPosition(p);assert.equal(start.x,74);let previous=start.x;
 for(let remaining=83;remaining>=0;remaining--){p.transition.ticks=remaining;const point=partySpiritPosition(p);assert.ok(point.x>=previous);assert.ok(point.x-previous<190);previous=point.x;}
 assert.equal(previous,10010);assert.equal(p.members[0].body.x,64);assert.equal(p.members[1].body.x,10000);
});
