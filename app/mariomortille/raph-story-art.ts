const root = '/mariomortille/story/raph-current/';
const file = (action: string, frame: number) => `${root}${action}-${String(frame).padStart(2, '0')}.png?v=raph-native-2`;
export const raphStoryAssets = ['idle','walk','pickup','hold','carry-run','carry-arms'].flatMap(action=>Array.from({length:8},(_,i)=>file(action,i+1))).concat(Array.from({length:16},(_,i)=>file('arms',i+1)));
const holds = [120,120,120,140,180,180,120,120];
/** Source hand coordinates measured on the transparent 256px reference; same scale as the exported body. */
const palms = [[159,216],[159,216],[159,216],[160,214],[155,173],[153,135],[145,131],[145,131]];
const carryPalms = [[58,43],[58,45],[58,44],[58,42],[58,45],[58,46],[59,44],[58,42]];
export function raphPickupContact(elapsed: number, carryFrame=1) {
 if(elapsed>=7600){
  const i=Math.max(1,Math.min(8,carryFrame)), palm=carryPalms[i-1];
  return {frame:8+i,x:palm[0],y:palm[1],active:true,arms:file('carry-arms',i),phase:'carrying'};
 }
 let time = Math.max(0,elapsed-6500), index=0;
 while(index<7 && time>=holds[index]) time-=holds[index++];
 const held = elapsed>=7600;
 const frame = held ? 9+Math.floor((elapsed-7600)/140)%8 : index+1;
 const palm = held ? palms[7] : palms[index];
 return { frame, x:Math.round(48+(palm[0]-128)*86/232), y:Math.round(88+(palm[1]-246)*86/232), active:elapsed>=6860,
  arms: file('arms',frame), phase: held ? 'held' : 'pickup' };
}
/** Pickup and carried running keep the same evil costume and dog contact anchors. */
export function raphStoryFrame(action:string,frame:number,elapsed:number,ambient:number,reduced=false) {
 if(elapsed>=7600)return file('carry-run',Math.max(1,Math.min(8,frame)));
 if(elapsed>=6500) {
  const p=raphPickupContact(elapsed);
  if(p.frame<=6) return file('pickup',p.frame);
  return file('hold', p.frame<=8 ? p.frame-6 : (p.frame-7)%8+1);
 }
 if(action==='run'||action==='walk') return file('walk',Math.max(1,Math.min(8,frame)));
 return file('idle',reduced?1:Math.floor(ambient*6/1000)%8+1);
}
