import { TILE, type Tile } from './simulation';
/** Prefer permanent ground beneath a marker, not a floating breakable block above it. */
export function markerGround(tiles: Tile[], x: number): {x: number; y: number} | null {
 const ground=tiles.filter(t=>t.kind==='ground');
 const candidates=ground.length?ground:tiles;
 const below=candidates.filter(t=>x>=t.x&&x<t.x+TILE);
 if(below.length)return {x,y:Math.min(...below.map(t=>t.y))};
 const nearest=[...candidates].sort((a,b)=>Math.abs(a.x+TILE/2-x)-Math.abs(b.x+TILE/2-x)||a.y-b.y)[0];
 return nearest?{x:nearest.x+TILE/2,y:nearest.y}:null;
}
