import type { Level, State, Tile } from './simulation';
/** Power refills sit in overhead breakable crates; ordinary collectibles stay free. */
export function boxLevelPowers(level: Level) {
 for (const item of level.pickups) {
  if (!['ember','turbo','cloud','cobalt'].includes(item.kind) || item.blocked) continue;
  let x=Math.floor(item.x/16)*16;
  const floor=level.tiles.filter(t=>t.kind==='ground'&&t.x<=item.x+8&&t.x+16>item.x+8&&t.y>=item.y).sort((a,b)=>a.y-b.y)[0];
  if (!floor) continue;
  // Some former floor refills sit below a shelf's access step. Move that crate
  // into the adjacent clear lane so a standing player can reach its underside.
  const candidates=[0,-16,16,-32,32,-48,48,-64,64,-80,80,-96,96];
  const safe=candidates.map(offset=>x+offset).find(cx=>cx>=16&&cx+32<level.width
   && [cx-2,cx+18].every(px=>level.tiles.some(t=>t.kind==='ground'&&t.y===floor.y&&t.x<=px&&t.x+16>px))
   && !level.tiles.some(t=>t.x<cx+20&&t.x+16>cx-4&&t.y<floor.y&&t.y+16>floor.y-96));
  if(safe!==undefined){x=safe;item.x=x;}
  const y=floor.y-80;
  const existing=level.tiles.find(t=>t.x===x&&t.y===y);
  if(existing){existing.kind='weak';existing.content=item.id;}
  else level.tiles.push({x,y,kind:'weak',content:item.id});
  item.blocked=true;
 }
 return level;
}
export function breakPowerBlock(state:State,tile:Tile) {
 const index=state.tiles.indexOf(tile);if(index<0)return;
 state.tiles.splice(index,1);state.events.push('break');
 if(tile.content){const item=state.pickups.find(p=>p.id===tile.content);if(item&&!item.collected){item.blocked=false;item.availableAt=state.ticks+12;}}
}
/** Ground is structural. Reinforced blocks require the exact full charge, not
 * the earlier damage threshold used by bosses. All ordinary blocks break. */
export function chargedAttackBreaks(kind:Tile['kind'],strength:number) {
 return kind==='weak'||kind==='brick'||kind==='ice'||(kind==='reinforced'&&strength>=1);
}
