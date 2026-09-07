export const DANCE_STYLES=['Groove','Disco','Twist','Robot'] as const;
export function danceStyle(index:number,t:number){
 const u=t*Math.PI*2*.72,s=Math.sin(u),c=Math.cos(u),pulse=Math.tanh(3*s);
 switch(index%4){
  case 0:return {left:.18*s,right:-.18*s,twist:.09*c,lean:.055*Math.sin(u*.5),wrist:.08*s};
  case 1:return {left:.32*(.5+.5*s),right:-.12*c,twist:.055*s,lean:.07*c,wrist:.14*c};
  case 2:return {left:.12*c,right:.12*c,twist:.18*s,lean:.025*c,wrist:-.09*s};
  default:return {left:.23*pulse,right:-.23*Math.tanh(3*c),twist:.07*pulse,lean:.025*Math.tanh(3*c),wrist:.18*pulse};
 }
}
