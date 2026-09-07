import {test} from 'node:test';
import assert from 'node:assert/strict';
import {routeBetween,mapNodes} from '../../app/mariomortille/map-route.ts';
test('map movement follows every connecting path in both directions',()=>{
 for(let from=0;from<5;from++)for(let to=0;to<5;to++){
  const path=routeBetween(from,to);
  assert.deepEqual(path[0],mapNodes[from]);assert.deepEqual(path.at(-1),mapNodes[to]);
  assert.deepEqual(path,[...routeBetween(to,from)].reverse());
  for(let i=1;i<path.length;i++)assert.ok(path[i][0]===path[i-1][0]||path[i][1]===path[i-1][1],'no diagonal shortcuts');
  for(let i=Math.min(from,to);i<=Math.max(from,to);i++)assert.ok(path.some(p=>p[0]===mapNodes[i][0]&&p[1]===mapNodes[i][1]));
 }
 assert.deepEqual(routeBetween(-1,4),[]);assert.deepEqual(routeBetween(0,9),[]);
});

import {createMapWalker,advanceMapWalker,mapWalkerCanEnter,mapWalkerFrame,mapEdges} from '../../app/mariomortille/map-route.ts';
const tick=(walker,target,unlocked=4,frames=1)=>{for(let i=0;i<frames;i++)advanceMapWalker(walker,target,unlocked,1/60);};
const onPath=walker=>mapEdges.some(edge=>edge.slice(1).some((p,i)=>{
 const a=edge[i],epsilon=1e-8;
 return walker.x>=Math.min(a[0],p[0])-epsilon&&walker.x<=Math.max(a[0],p[0])+epsilon&&walker.y>=Math.min(a[1],p[1])-epsilon&&walker.y<=Math.max(a[1],p[1])+epsilon;
}));
test('walker follows paths at bounded speed and does not stop between intermediate levels',()=>{
 const walker=createMapWalker();
 for(let i=0;i<3000&&walker.node!==4;i++){
  const before={x:walker.x,y:walker.y};tick(walker,4);
  assert.ok(onPath(walker));
  assert.ok(Math.hypot((walker.x-before.x)*1.5,walker.y-before.y)<=.30000001);
  if(walker.node!==4)assert.equal(walker.moving,true);
 }
 assert.equal(walker.node,4);assert.deepEqual([walker.x,walker.y],mapNodes[4]);
 assert.equal(mapWalkerCanEnter(walker,4,4),false,'arrival is followed by a standing pause');
 tick(walker,4,4,12);assert.equal(mapWalkerCanEnter(walker,4,4),true);
 const frame=mapWalkerFrame(walker);tick(walker,4,4,20);assert.equal(mapWalkerFrame(walker),frame,'standing does not advance walking frames');
});
test('rapid retarget and return selection stay on paths with no jump',()=>{
 const walker=createMapWalker();
 for(let i=0;i<400;i++){
  const target=i<30?4:i<60?0:i<90?2:i<120?5:1;
  const before={x:walker.x,y:walker.y};tick(walker,target);
  assert.ok(onPath(walker));
  assert.ok(Math.hypot((walker.x-before.x)*1.5,walker.y-before.y)<=.30000001);
 }
 tick(walker,1,4,1000);assert.equal(walker.node,1);
});
test('locked, invalid and same-node selections never depart or enter unavailable levels',()=>{
 const walker=createMapWalker();
 for(const target of [1,4,5,-1,NaN,Infinity,.5]){
  tick(walker,target,0,20);assert.equal(walker.node,0);assert.equal(walker.moving,false);
  assert.equal(mapWalkerCanEnter(walker,target,0),false);
 }
 tick(walker,0,0,12);assert.equal(mapWalkerCanEnter(walker,0,0),true);
 assert.deepEqual([walker.x,walker.y],mapNodes[0]);
});
test('reduced motion goes to valid node immediately but preserves the entry pause',()=>{
 const walker=createMapWalker();advanceMapWalker(walker,3,4,.05,true);
 assert.deepEqual([walker.x,walker.y],mapNodes[3]);assert.equal(walker.moving,false);
 assert.equal(mapWalkerCanEnter(walker,3,4),false);
 for(let i=0;i<4;i++)advanceMapWalker(walker,3,4,.05,true);
 assert.equal(mapWalkerCanEnter(walker,3,4),true);
});
test('background-tab time cannot create a leap or advance the cycle without movement',()=>{
 const walker=createMapWalker();advanceMapWalker(walker,4,4,80);
 assert.ok(walker.distanceWalked<=.9);const distance=walker.distanceWalked;
 advanceMapWalker(walker,4,4,NaN);assert.equal(walker.distanceWalked,distance);
 advanceMapWalker(walker,4,4,-2);assert.equal(walker.distanceWalked,distance);
});
