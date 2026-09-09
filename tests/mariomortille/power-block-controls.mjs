const targets=new WeakMap();
/** Walk below the real crate, jump into it and wait for its pickup, no state edits. */
export function powerBlockControls(state,normal){
 const p=state.player;
 let item=targets.get(state);
 if(item?.collected){targets.delete(state);item=null;}
 if(!item)item=state.pickups.find(i=>i.blocked&&!i.collected&&i.kind!==p.power&&i.x>=p.x-12&&i.x-p.x<100);
 if(!item)return null;
 targets.set(state,item);
 const dx=item.x-2-p.x;
 return {...normal,direction:Math.abs(dx)<4?0:Math.sign(dx),run:false,jump:true,jumpPressed:item.blocked&&Math.abs(dx)<4&&p.grounded,downPressed:false,powerPressed:false};
}
