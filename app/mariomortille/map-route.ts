export type MapPoint = readonly [number, number];
export const mapNodes: MapPoint[] = [[22,56],[49,28],[66,51],[74,76],[80,26]];
export const mapEdges: MapPoint[][] = [
 [mapNodes[0],[35,56],[35,28],mapNodes[1]],
 [mapNodes[1],[57,28],[57,51],mapNodes[2]],
 [mapNodes[2],[61,51],[61,76],mapNodes[3]],
 [mapNodes[3],[89,76],[89,26],mapNodes[4]],
];
export function routeBetween(from: number, to: number): MapPoint[] {
 if (!Number.isInteger(from)||!Number.isInteger(to)||from<0||to<0||from>=mapNodes.length||to>=mapNodes.length) return [];
 const points: MapPoint[] = [mapNodes[from]];
 for(let i=from;i!==to;i+=Math.sign(to-from)) {
  const edge=to>from?mapEdges[i]:[...mapEdges[i-1]].reverse();
  points.push(...edge.slice(1));
 }
 return points;
}

export type MapWalker = {
 node: number;
 nextNode: number;
 points: MapPoint[];
 pointIndex: number;
 x: number;
 y: number;
 facing: number;
 moving: boolean;
 distanceWalked: number;
 settledFor: number;
};
export function createMapWalker(): MapWalker {
 return {node:0,nextNode:0,points:[],pointIndex:0,x:mapNodes[0][0],y:mapNodes[0][1],facing:1,moving:false,distanceWalked:0,settledFor:0};
}
export function availableMapNode(selected: number, unlocked: number): boolean {
 return Number.isInteger(selected) && selected >= 0 && selected < mapNodes.length && selected <= unlocked;
}
/** Advance along authored paths. Retargeting finishes the current edge before choosing
 * another, so keyboard/mouse changes never teleport or cut diagonally across terrain. */
export function advanceMapWalker(walker: MapWalker, selected: number, unlocked: number, seconds: number, reducedMotion=false): void {
 const dt=Number.isFinite(seconds)?Math.max(0,Math.min(seconds,.05)):0;
 const target=availableMapNode(selected,unlocked)?selected:walker.nextNode;
 if(reducedMotion){
  const changed=walker.x!==mapNodes[target][0]||walker.y!==mapNodes[target][1];
  [walker.x,walker.y]=mapNodes[target];walker.node=target;walker.nextNode=target;
  walker.points=[];walker.pointIndex=0;walker.moving=false;
  walker.settledFor=changed?0:walker.settledFor+dt;
  return;
 }
 let remaining=dt*18;
 let travelled=0;
 while(true){
  if(!walker.points.length){
   if(walker.node===target)break;
   walker.nextNode=walker.node+Math.sign(target-walker.node);
   walker.points=routeBetween(walker.node,walker.nextNode).slice(1);walker.pointIndex=0;
  }
  if(remaining<=0)break;
  const [tx,ty]=walker.points[walker.pointIndex];
  const dx=tx-walker.x,dy=ty-walker.y;
  // The map is 3:2: compensate the coordinates for equal visual speed.
  const distance=Math.hypot(dx*1.5,dy);
  if(Math.abs(dx)>.01)walker.facing=dx>0?1:-1;
  const step=Math.min(distance,remaining);
  if(distance<=remaining){walker.x=tx;walker.y=ty;walker.pointIndex++;}
  else {walker.x+=dx*step/distance;walker.y+=dy*step/distance;}
  remaining-=step;travelled+=step;
  if(walker.pointIndex===walker.points.length){walker.node=walker.nextNode;walker.points=[];}
 }
 walker.distanceWalked+=travelled;
 walker.moving=walker.points.length>0||walker.node!==target;
 walker.settledFor=travelled>0||walker.moving?0:walker.settledFor+dt;
}
export function mapWalkerFrame(walker: MapWalker): number {
 return Math.floor(walker.distanceWalked/(18*.11))%8;
}
export function mapWalkerCanEnter(walker: MapWalker, selected: number, unlocked: number): boolean {
 return availableMapNode(selected,unlocked)&&!walker.moving&&walker.node===selected&&walker.settledFor>=.18;
}
