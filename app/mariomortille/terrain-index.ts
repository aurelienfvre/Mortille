import type { Tile } from './simulation';
type Index={length:number;columns:Map<number,Tile[]>;order:Map<Tile,number>};
const indexes=new WeakMap<Tile[],Index>();
/** Tiles are stationary. Replacing the terrain on respawn or changing its length rebuilds the index. */
export function collisionCandidates(tiles:Tile[],x:number,width:number):Tile[]{
 let index=indexes.get(tiles);
 if(!index||index.length!==tiles.length){
  index={length:tiles.length,columns:new Map(),order:new Map()};
  tiles.forEach((tile,rank)=>{
   index!.order.set(tile,rank);
   for(let column=Math.floor(tile.x/16);column<=Math.floor((tile.x+15.999)/16);column++){
    const bucket=index!.columns.get(column)??[];bucket.push(tile);index!.columns.set(column,bucket);
   }
  });indexes.set(tiles,index);
 }
 const found=new Set<Tile>();
 // One extra tile on each side includes the short collision-resolution displacement.
 for(let column=Math.floor((x-16)/16);column<=Math.floor((x+width+16)/16);column++){
  for(const tile of index.columns.get(column)??[])found.add(tile);
 }
 return [...found].sort((a,b)=>index!.order.get(a)!-index!.order.get(b)!);
}
