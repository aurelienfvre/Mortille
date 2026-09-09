import type { Enemy, Level } from './simulation';
import type { EnemyKind } from './enemy-behavior';
export const campaignFactions:Record<string,string>={'quartier-01':'pirate','quartier-02':'lola','quartier-03':'lola','quartier-04':'raphael','quartier-05':'mango'};
export const campaignEnemyKinds: Record<string, readonly EnemyKind[]> = {
 'quartier-01':['crab','guard','crab','pest'],
 'quartier-02':['cat','pest','cat','pest'],
 'quartier-03':['cat','pest','cat','rover'],
 'quartier-04':['beetle','guard','rover','guard'],
 'quartier-05':['imp','plant','imp','pest'],
};
/** Reuse the authored safe lanes; leave boss arenas free of incidental mobs. */
export function themeEnemies(level: Level): Enemy[] {
 const kinds=campaignEnemyKinds[level.id]??['guard'];
 const cutoff=level.boss ? (level.boss==='raphael'?level.width-1024:level.goal-640) : Infinity;
 return (level.enemies??[]).filter(e=>e.right+20<cutoff).map((e,i)=>({...e,kind:kinds[i%kinds.length]}));
}
