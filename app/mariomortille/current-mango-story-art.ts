/** Current evil outfit in every prologue locomotion state. */
const root = '/mariomortille/story/mango-current/';
const file = (action: string, frame: number) => `${root}${action}-${String(frame).padStart(2,'0')}.png?v=mango-biped-2`;
export const currentMangoStoryAssets = ['idle','walk','sprint'].flatMap(a=>Array.from({length:8},(_,i)=>file(a,i+1)));
export function currentMangoStoryFrame(id: string, action: string, frame: number, elapsed: number, ambient: number, reduced=false): string | undefined {
 if(id!=='mango')return undefined;
 if(reduced||action==='idle')return file('idle',reduced?1:Math.floor(ambient*6/1000)%8+1);
 return file(elapsed>=7600?'sprint':'walk',Math.max(1,Math.min(8,frame)));
}
