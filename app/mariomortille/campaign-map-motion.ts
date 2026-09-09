export type CampaignPoint = readonly [number, number];
// Coordinates are authored on the generated1536×1024 world, including both bridges.
export const campaignNodes: CampaignPoint[] = [[14.9,76.8],[27.9,53],[49.4,25.4],[62.7,45.2],[73,85.4],[79.7,23.5]];
export const campaignPaths: CampaignPoint[][] = [
 [campaignNodes[0],[20,74],[24,65],[27,59],campaignNodes[1]],
 [campaignNodes[1],[31,56],[35,56],[39,53],[46,47],[49.5,42],[46,39],[43.5,36],[43.5,33],[46,30],campaignNodes[2]],
 [campaignNodes[2],[46,30],[43.5,33],[43.5,36],[46,39],[52,41],[57,44],campaignNodes[3]],
 [campaignNodes[3],[68,49],[76,50],[79,48],[79,55],[76,60],[71,64],[69.5,66.5],[65,71],[63,75.5],[65,79],[69,82],campaignNodes[4]],
 [campaignNodes[4],[69,82],[65,79],[63,75.5],[65,71],[69.5,66.5],[71,64],[76,60],[79,55],[79,48],[80.5,43],[84,38],[85.5,33],[83,29],campaignNodes[5]],
];
export const campaignMaxNode = (prologueCompleted: boolean, unlocked: number) => prologueCompleted ? Math.max(1, Math.min(5, Math.floor(Number.isFinite(unlocked) ? unlocked : 0) + 1)) : 0;
export type CampaignWalker = { node:number; next:number; x:number; y:number; facing:number; points:CampaignPoint[]; point:number; distance:number; settled:number; moving:boolean };
export function createCampaignWalker(initialNode = 0):CampaignWalker { const node = Number.isInteger(initialNode) ? Math.max(0, Math.min(campaignNodes.length - 1, initialNode)) : 0; return {node,next:node,x:campaignNodes[node][0],y:campaignNodes[node][1],facing:1,points:[],point:0,distance:0,settled:0,moving:false}; }
export function advanceCampaignWalker(w:CampaignWalker, selected:number, max:number, elapsed:number, reduced=false){
 const dt=Number.isFinite(elapsed)?Math.max(0,Math.min(.05,elapsed)):0;
 const target=Number.isInteger(selected)&&selected>=0&&selected<=max?selected:w.next;
 if(reduced){const changed=w.node!==target;[w.x,w.y]=campaignNodes[target];w.node=w.next=target;w.points=[];w.moving=false;w.settled=changed?0:w.settled+dt;return;}
 let left=dt*26,travelled=0;
 while(left>0){
  if(!w.points.length){if(w.node===target)break;w.next=w.node+Math.sign(target-w.node);w.points=(w.next>w.node?campaignPaths[w.node]:[...campaignPaths[w.next]].reverse()).slice(1);w.point=0;}
  const [x,y]=w.points[w.point],dx=x-w.x,dy=y-w.y,dist=Math.hypot(dx*1.5,dy),step=Math.min(left,dist);
  if(Math.abs(dx)>.01)w.facing=dx>0?1:-1;
  if(dist<=left){w.x=x;w.y=y;w.point++;}else{w.x+=dx*step/dist;w.y+=dy*step/dist;}
  left-=step;travelled+=step;
  if(w.point===w.points.length){w.node=w.next;w.points=[];}
 }
 w.distance+=travelled;w.moving=w.points.length>0||w.node!==target;w.settled=travelled||w.moving?0:w.settled+dt;
}
export function campaignNeighbor(node:number,dx:number,dy:number){
 let best=node,score=0;
 for(const i of [node-1,node+1])if(i>=0&&i<campaignNodes.length){const x=(campaignNodes[i][0]-campaignNodes[node][0])*1.5,y=campaignNodes[i][1]-campaignNodes[node][1],s=(x*dx+y*dy)/Math.hypot(x,y);if(s>score){score=s;best=i;}}
 return best;
}
