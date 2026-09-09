import { currentJujuStoryAssets, currentJujuStoryFrame } from './current-juju-story-art';
import { currentMangoStoryAssets, currentMangoStoryFrame } from './current-mango-story-art';
const root = '/mariomortille/story/current/';
const version = '?v=prologue-current-2';
const file = (id: string, action: string, frame: number) => `${root}${id}-${action}-${String(frame).padStart(2,'0')}.png${version}`;
const cast = ['aurelien','julien','ben','raphael','mango'];
export const currentStoryAssets = cast.flatMap(id => Array.from({length:8},(_,i)=>file(id,'idle',i+1)))
 .concat(currentMangoStoryAssets)
 .concat(Array.from({length:8},(_,i)=>file('aurelien','run',i+1)),Array.from({length:8},(_,i)=>file('ben','reaction',i+1)),currentJujuStoryAssets,['julien','ben'].flatMap(id=>['walk','run'].flatMap(action=>Array.from({length:8},(_,i)=>file(id,action,i+1)))));
/** Only return newly reviewed art; legacy actions keep their existing asset paths. */
export function currentStoryFrame(id: string, action: string, frame: number, elapsed: number, ambient: number, reduced = false): string | undefined {
 const mango = currentMangoStoryFrame(id,action,frame,elapsed,ambient,reduced);
 if(mango)return mango;
 if ((id === 'julien' || id === 'ben') && (action === 'walk' || action === 'run')) return file(id,action,Math.max(1,Math.min(8,frame)));
 const juju = currentJujuStoryFrame(id, action, frame, elapsed, ambient, reduced);
 if (juju) return juju;
 if (id === 'ben' && elapsed >= 6500 && elapsed < 15500 && action !== 'run' && action !== 'walk') {
  const reaction = elapsed < 7100 ? 2 : elapsed < 10000 ? 3 : elapsed < 14000 ? 4 : 6;
  return file(id,'reaction',reaction);
 }
 if (action === 'idle' && cast.includes(id)) return file(id,'idle',reduced ? 1 : Math.floor(ambient*6/1000)%8+1);
 if (id === 'aurelien' && action === 'run') return file(id,'run',4+Math.floor((Math.max(1,Math.min(8,frame))-1)*5/8));
 return undefined;
}
