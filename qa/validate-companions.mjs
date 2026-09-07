import assert from 'node:assert/strict';
import {createDogExit,dogExitPose,DOG_WALK_SPEED,DOG_SCALE,CATCH_CONTACT,CATCH_RELEASE} from '../app/cucu-steve-motion.ts';
assert(CATCH_CONTACT<CATCH_RELEASE);
let samples=0;
for(const origin of [{x:3.55,z:-.25},{x:3.65,z:-.1},{x:5.12,z:.40},{x:5.2,z:.7},{x:5.30,z:.85}]){
 const route=createDogExit(origin),duration=route.length/DOG_WALK_SPEED+.6;
 let previous=dogExitPose(route,0),distance=0;
 assert.equal(previous.speed,0);
 for(let t=.005;t<=duration;t+=.005){
  const p=dogExitPose(route,t),step=Math.hypot(p.x-previous.x,p.z-previous.z);
  assert(step<.002,'No discontinuity on the walking route');
  assert(p.speed<=DOG_WALK_SPEED+.00001);
  assert(p.x>=previous.x-.00001,'Dog advances along its exit route');
  // Side cabinets occupy x >= 6, and z <= 1.05 or z >= 1.95.
  // A conservative .20 m half-width also includes the rotating muzzle.
  assert(!(p.x<4.70 && p.z>.59),'Dog must round the solid counter corner');
  if(p.x>5.8)assert(p.z>1.25 && p.z<1.75,'Dog must use the gap between cabinets');
  distance+=step;previous=p;samples++;
 }
 assert(Math.abs(distance-route.length)<.003,'Arc-length cadence matches actual distance');
 const end=dogExitPose(route,duration+1);assert(end.done);assert.equal(end.speed,0);
 assert(Math.abs(end.x-9.3)<.00001 && Math.abs(end.z-1.5)<.00001,'Dog vanishes only beyond the room edge');
 const rate=DOG_WALK_SPEED/(.16*DOG_SCALE);assert(rate<3,'The scaled walk clip uses plausible cadence');
}
console.log(JSON.stringify({pass:true,exitSamples:samples,maxSpeed:DOG_WALK_SPEED,walkScale:DOG_SCALE}));

const {companionStations,companionTravel,companionTravelPose,stationDogExit,movingActorBlocked,CUCU_WALK_SPEED}=await import('../app/cucu-steve-motion.ts');
const {friendPose}=await import('../app/lobby-behavior.ts');
let stationSamples=0,minFriendClearance=Infinity;
const solid=(p,r)=>{
 assert(!(Math.abs(p.x)<4.443+r&&p.z>2.75-r&&p.z<4.437+r),'Companion intersects the solid counter');
 assert(!(Math.abs(p.x)<.95+r&&p.z>.85-r&&p.z<2.25+r),'Companion intersects the cartridge display plinth');
 for(const x of [-4.8,4.8])assert(!(Math.abs(p.x-x)<.86+r&&Math.abs(p.z+5.5)<1.05+r),'Companion intersects a rear cabinet');
};
for(const aspect of [884/773,1280/720]){
 const stations=companionStations(aspect);assert.equal(stations.length,2);
 for(let index=0;index<2;index++){
  const route=companionTravel(stations,index);
  for(const offset of [0,14,41,67]){
   let t=0,clock=offset,rate=1,p=companionTravelPose(route,0),done=false;
   for(let i=0;i<18000;i++){
    const dt=1/60,others=['hero','yeti'].map(name=>friendPose(name,clock)),next=companionTravelPose(route,t+.4);
    const blocked=movingActorBlocked(p,next,others,1.12);rate+=(Number(!blocked)-rate)*(1-Math.exp(-dt*9));t+=dt*rate;clock+=dt;
    p=companionTravelPose(route,t);solid(p,.35);
    for(const other of others)minFriendClearance=Math.min(minFriendClearance,Math.hypot(p.x-other.x,p.z-other.z));
    assert(p.speed<=CUCU_WALK_SPEED+.00001);stationSamples++;
    if(p.done){done=true;break;}
   }
   assert(done,'Traffic yielding must not deadlock');
  }
  const origin={x:stations[index].x-.1,z:stations[index].z+.32},exit=stationDogExit(origin,stations[index].x);
  for(let t=0;t<exit.length/DOG_WALK_SPEED+.7;t+=.02){const p=dogExitPose(exit,t);solid(p,.20);stationSamples++;}
 }
}
assert(minFriendClearance>.76,`The route crosses a friend: ${minFriendClearance}`);
console.log(JSON.stringify({stations:2,formats:[884/773,1280/720],stationSamples,minFriendClearance,walkSpeed:CUCU_WALK_SPEED,pass:true}));
