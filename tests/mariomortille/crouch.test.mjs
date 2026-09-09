import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { createState, tick, playerHitbox } from '../../app/mariomortille/simulation.ts';
import { encodeControls, decodeControls, encodeReplay, decodeReplay } from '../../app/mariomortille/replay-codec.ts';
import { REPLAY_VERSION } from '../../app/mariomortille/scoring.ts';
const input={direction:0,jump:false,jumpPressed:false,run:false,downPressed:false,powerPressed:false};
const level={id:'crouch',width:640,spawn:{x:32,y:262},tiles:Array.from({length:40},(_,i)=>({x:i*16,y:304,kind:'ground'})),pickups:[],checkpoint:500,goal:600};
const setup=(l=level)=>{const s=createState(l);s.player.grounded=true;return s;};
test('crouch keeps feet fixed, stops without direction, crawls at48 then stands',()=>{
 const s=setup();s.player.vx=180;
 tick(s,level,{...input,downHeld:true});assert.equal(s.player.crouching,true);assert.equal(s.player.x,32);assert.equal(s.player.y+42,304);assert.deepEqual(playerHitbox(s.player),{x:32,y:276,width:20,height:28});
 for(let i=0;i<30;i++)tick(s,level,{...input,downHeld:true,direction:1,run:true});
 assert.equal(s.player.vx,48);assert.ok(s.player.x>52 && s.player.x<57);assert.equal(s.player.y,262);
 tick(s,level,input);assert.equal(s.player.crouching,false);assert.equal(playerHitbox(s.player).height,42);
});
test('crawl enters low passage, cannot stand/jump inside, exits then stands',()=>{
 const l={...level,tiles:[...level.tiles,...Array.from({length:8},(_,i)=>({x:64+i*16,y:260,kind:'brick'}))]};const s=setup(l);
 for(let i=0;i<85;i++)tick(s,l,{...input,downHeld:true,direction:1});
 assert.ok(s.player.x>90);assert.equal(s.player.crouching,true);
 tick(s,l,{...input,jumpPressed:true,jump:true});assert.equal(s.player.crouching,true);assert.equal(s.player.grounded,true);assert.equal(s.player.y,262);
 for(let i=0;i<150;i++)tick(s,l,{...input,direction:1});
 assert.ok(s.player.x>192);assert.equal(s.player.crouching,false);assert.equal(s.player.y,262);
});
test('air down press still starts pound; held down alone does not',()=>{
 const a=setup();a.player.grounded=false;a.player.y=180;tick(a,level,{...input,downHeld:true});assert.equal(a.player.pound,0);assert.equal(a.player.crouching,false);
 tick(a,level,{...input,downHeld:true,downPressed:true});assert.equal(a.player.pound,11);
});
test('current two-byte replay preserves held crouch, rejects unknown bits and odd bytes',()=>{
 assert.equal(REPLAY_VERSION,13);const controls={...input,downHeld:true};const word=encodeControls(controls);assert.equal(word,256);assert.deepEqual(decodeControls(word),controls);
 assert.deepEqual([...decodeReplay(encodeReplay([word,2,word|2]))],[256,2,258]);
 for(const bytes of [[0],[0,16],[3,0]])assert.throws(()=>decodeReplay(Buffer.from(bytes).toString('base64')));
 const a=setup(),b=setup();const words=Array.from({length:90},(_,i)=>encodeControls({...input,direction:1,downHeld:i<60}));
 for(const word of words)tick(a,level,decodeControls(word));for(const word of decodeReplay(encodeReplay(words)))tick(b,level,decodeControls(word));assert.deepEqual(a,b);
});
test('pickup and boss contacts use shortened crouch collider',async()=>{
 const l={...level,pickups:[{id:'above',x:32,y:259,kind:'coin',collected:false}]};const s=setup(l);tick(s,l,{...input,downHeld:true});assert.equal(s.pickups[0].collected,false);tick(s,l,input);assert.equal(s.pickups[0].collected,true);
 const {stepBoss,makeBoss}=await import('../../app/mariomortille/boss.ts');const b=setup();b.boss=makeBoss();b.player.x=720;b.player.y=290;b.player.crouching=true;let contacts=0;stepBoss(b,level,290,()=>contacts++);assert.equal(contacts,0);b.player.crouching=false;stepBoss(b,level,290,()=>contacts++);assert.equal(contacts,1);
});
