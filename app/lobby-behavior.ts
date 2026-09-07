export type FriendAction = 'Idle' | 'Walk' | 'Run' | 'Dance' | 'Wave' | 'Play';
type Point = [number, number];
type Phase = { start: number; end: number; from: Point; to: Point; yaw: number; endYaw: number; action: FriendAction; rate: number };
const SCALE = 1.6;
const CYCLE = 120;
const ease = (v: number) => v*v*v*(v*(v*6-15)+10);
const nearestAngle = (a: number, b: number) => a + Math.atan2(Math.sin(b-a), Math.cos(b-a));

function itinerary(hero: boolean) {
  const home: Point = hero ? [-4.4,-1.65] : [4.4,-3.3];
  let p = home, yaw = 0, t = 0;
  const phases: Phase[] = [];
  const wait = (duration: number, action: FriendAction = 'Idle', rate = hero ? .93 : 1.08) => {
    const add=(length:number,kind:FriendAction)=>{phases.push({start:t,end:t+length,from:p,to:p,yaw,endYaw:yaw,action:kind,rate});t+=length;};
    if(action==='Idle'&&duration>5.5){
      let remaining=duration;
      while(remaining>=5.5){add(1.5,'Idle');add(4,'Dance');remaining-=5.5;}
      if(remaining>0)add(remaining,'Idle');
    }else add(duration,action);
  };
  const turn = (angle: number) => {
    const target = nearestAngle(yaw, angle);
    phases.push({start:t,end:t+1.7,from:p,to:p,yaw,endYaw:target,action:'Idle',rate:1});
    t+=1.7;yaw=target;
  };
  const visit = (to: Point, rate: number) => {
    const dx=to[0]-p[0], dz=to[1]-p[1];
    turn(Math.atan2(dx,dz));
    // Blender Walk travels 0.4 model metres per second during a planted step.
    const duration=Math.hypot(dx,dz)/(.4*SCALE*rate)+.4;
    phases.push({start:t,end:t+duration,from:p,to,yaw,endYaw:yaw,action:'Walk',rate});t+=duration;p=to;
  };
  if(hero){
    wait(2);visit([-1.8,-1.65],.85);wait(2);turn(0);wait(7.2,'Dance',1);
    visit([4.8,-3.65],.9);turn(Math.PI);wait(7,'Play',1);visit(home,.85);wait(1.5);
    visit([.8,-1.65],1);turn(0);wait(Math.max(0,79.5-t));
  } else {
    wait(7.2,'Dance',1);visit([-4.4,-3.3],.75);wait(2.6);turn(0);wait(6.4,'Dance',1);
    visit([4.8,-3.65],.8);turn(Math.PI);wait(6,'Play',1);turn(0);wait(Math.max(0,54-t));visit([2.2,-3.3],.8);visit([2.2,-1.65],.8);turn(0);wait(Math.max(0,79.5-t));
  }
  turn(0);wait(4,'Dance',1);
  if(hero){wait(.8);visit(home,.95);turn(0);}
  else {visit([2.2,-3.3],.8);visit(home,.8);turn(0);}
  wait(Math.max(0,CYCLE-t));
  return phases;
}
const schedules = { hero: itinerary(true), yeti: itinerary(false) };
export function friendPose(character: 'hero'|'yeti', seconds: number) {
  const time=((seconds%CYCLE)+CYCLE)%CYCLE;
  const phase=schedules[character].find(p=>time<p.end) ?? schedules[character].at(-1)!;
  const duration=phase.end-phase.start,local=time-phase.start;
  let u=Math.max(0,Math.min(1,local/duration)),pace=1;
  if(phase.action==='Walk'){
    const ramp=Math.min(.4,duration*.2),travel=duration-ramp;
    const integral=(t:number)=>.5*(t-ramp/Math.PI*Math.sin(Math.PI*t/ramp));
    if(local<ramp){u=integral(local)/travel;pace=.5*(1-Math.cos(Math.PI*local/ramp));}
    else if(local>duration-ramp){u=1-integral(duration-local)/travel;pace=.5*(1-Math.cos(Math.PI*(duration-local)/ramp));}
    else u=(local-ramp*.5)/travel;
  }
  return {
    x:phase.from[0]+(phase.to[0]-phase.from[0])*u,
    z:phase.from[1]+(phase.to[1]-phase.from[1])*u,
    yaw:phase.yaw+(phase.endYaw-phase.yaw)*ease(phase.action==='Idle'&&phase.yaw!==phase.endYaw?Math.min(1,local/1.05):u),
    gestureTime:-1,
    action:phase.action,
    rate:phase.rate*pace,
  };
}
