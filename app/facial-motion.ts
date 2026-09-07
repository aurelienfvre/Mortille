const clamp=(x:number)=>Math.max(0,Math.min(1,x));
const ease=(x:number)=>{const t=clamp(x);return t*t*(3-2*t);};
export function facialPose(hero:boolean,time:number){
  const cycle=hero?15:14.3,t=((time%cycle)+cycle)%cycle;
  const events=hero?[1.2,4.5,8,8.48,11.9]:[2.6,6.4,10,13.6];
  let blink=0;
  for(const at of events){const s=t-at;if(s>=0 && s<.36)blink=s<.09?ease(s/.09):s<.145?1:1-ease((s-.145)/.215);}
  const period=hero?5.7:6.3,n=Math.floor(time/period),q=ease((time%period)/1.4),seed=hero?1.73:4.91;
  const target=(i:number)=>({yaw:Math.sin(i*2.399+seed)*.13,pitch:Math.sin(i*1.731+seed)*.055});
  const a=target(n-1),b=target(n);
  return {blink,yaw:a.yaw+(b.yaw-a.yaw)*q,pitch:a.pitch+(b.pitch-a.pitch)*q};
}
