import test from 'node:test';
import assert from 'node:assert/strict';
import { mangoStoryMotion } from '../../app/mariomortille/dog-story-motion.ts';
test('Mango travels on the ground, with strides tied to displacement and a stationary capture beat', () => {
 const seen = new Set();
 let prev = mangoStoryMotion(0,12);
 for(let t=10;t<18000;t+=10){
  const p=mangoStoryMotion(t,12);
  assert.equal(p.lift,0);
  if(Math.abs(p.x-prev.x)>0.0001) assert.ok(p.moving || prev.moving);
  if(p.moving) seen.add(p.frame);
  assert.ok(p.frame>=1&&p.frame<=12);
  prev=p;
 }
 assert.equal(seen.size,12);
 assert.equal(mangoStoryMotion(6000,8).x,73);
 assert.equal(mangoStoryMotion(7000,8).x,73);
 assert.equal(mangoStoryMotion(10000,8).x,123);
 assert.equal(mangoStoryMotion(4500,8).facing,-1);
 assert.equal(mangoStoryMotion(9000,8).facing,1);
 assert.equal(mangoStoryMotion(4500,8,true).moving,false);
});

test('dog stride follows displayed scale and resolves all shipped transparent frame paths',async()=>{
 const {existsSync}=await import('node:fs');
 for(let frame=1;frame<=12;frame++)assert.ok(existsSync(new URL(`../../public/mariomortille/characters/mango/trot-${String(frame).padStart(2,'0')}.png`,import.meta.url)));
 // At a fixed position, twice the rendered sprite size halves cycle progress.
 const small=mangoStoryMotion(4300,12,false,4);
 const large=mangoStoryMotion(4300,12,false,8);
 assert.equal(small.x,large.x);assert.notEqual(small.frame,large.frame);
 assert.equal(mangoStoryMotion(7000,12,false,4).moving,false);
});

test('Steve trots toward his friends, plants his feet, then follows the capture without reappearing',async()=>{
 const {steveStoryMotion}=await import('../../app/mariomortille/dog-story-motion.ts');
 const {existsSync}=await import('node:fs');
 const frames=new Set();let previous=steveStoryMotion(0);
 for(let t=10;t<6500;t+=10){const p=steveStoryMotion(t);assert.equal(p.lift,0);if(p.x!==previous.x)assert.ok(p.moving||previous.moving);if(p.moving)frames.add(p.frame);previous=p;}
 assert.equal(frames.size,12);
 for(const action of ['idle','walk','run'])for(let f=1;f<=8;f++)assert.ok(existsSync(new URL(`../../public/mariomortille/characters/steve/${action}-${String(f).padStart(2,'0')}.png`,import.meta.url)));
 assert.equal(steveStoryMotion(2400).x,48);assert.equal(steveStoryMotion(6400).x,48);
 assert.equal(steveStoryMotion(7000).moving,false);
 assert.equal(steveStoryMotion(10000).x,48);
 assert.equal(steveStoryMotion(17000).x,48);
 assert.equal(steveStoryMotion(7000,true).x,48);
 assert.equal(steveStoryMotion(17000,true).x,48,'reduced motion must not bring abducted Steve back');
});


test('Steve eight-pose cycle preserves approach, capture and reduced-motion positions', async () => {
 const {steveStoryMotion}=await import('../../app/mariomortille/dog-story-motion.ts');
 const frames=new Set();
 for(const reduced of [false,true])for(let t=0;t<=18000;t+=10){
  const {frame,...motion}=steveStoryMotion(t,reduced,2,8);
  const {frame:oldFrame,...oldMotion}=steveStoryMotion(t,reduced,2);
  assert.deepEqual(motion,oldMotion);
  assert.ok(frame>=1&&frame<=8);
  if(motion.moving)frames.add(frame);
 }
 assert.equal(frames.size,8);
 for(const count of [0,-1,1.5,NaN,Infinity])assert.deepEqual(steveStoryMotion(1000,false,2,count),steveStoryMotion(1000));
});

test('Steve capture owns the dog once grounded approach stops', async () => {
 const { steveCapturePlacement, steveStandaloneVisible, currentSteveStoryAssets } = await import('../../app/mariomortille/current-steve-story-art.ts');
 const { existsSync } = await import('node:fs');
 assert.equal(steveStandaloneVisible(6499),true); assert.equal(steveStandaloneVisible(6500),false);
 for (const path of currentSteveStoryAssets) assert.ok(existsSync(new URL('../../public'+path.split('?')[0],import.meta.url)));
 for (let frame=1;frame<=4;frame++) assert.equal(steveCapturePlacement(frame,{x:60,y:76}).grounded,true);
 const held=steveCapturePlacement(8,{x:54,y:45}); assert.equal(held.x+48,54);assert.equal(held.y+60,45);assert.equal(held.grounded,false);
});

test('Mango sprint starts at a fresh stride and does not cycle at walking step length',()=>{
 const start=mangoStoryMotion(7600,8,false,4);
 assert.equal(start.frame,1);assert.equal(start.facing,1);
 assert.equal(mangoStoryMotion(7599,8,false,4).facing,-1);
 let changes=0,last=1;
 for(let t=7616;t<=9900;t+=16){const frame=mangoStoryMotion(t,8,false,4).frame;if(frame!==last)changes++;last=frame;}
 assert.ok(changes>=24&&changes<=32,`expected roughly four complete strides, got ${changes} pose changes`);
});
