'use client';
/* oxlint-disable next/no-img-element -- Fixed pixel frames must retain their original PNG sampling. */
import { useEffect, useRef, useState } from 'react';
import { quartierLevels } from './levels';
import { mapEdges, mapNodes, createMapWalker, advanceMapWalker, mapWalkerFrame, mapWalkerCanEnter, availableMapNode } from './map-route';
import styles from './title-menu.module.css';
type Props={selected:number;unlocked:number;completed:string[];idleFrame:number;onSelect:(i:number)=>void;onStart:(i:number)=>void;onSound:(cue:'move'|'confirm'|'back')=>void;buttonRef:(i:number,node:HTMLButtonElement|null)=>void};
export default function CampaignMap(props:Props){
 const latest=useRef(props);
 useEffect(()=>{latest.current=props;},[props]);
 const launch=useRef<number|null>(null);
 const [hero,setHero]=useState({x:mapNodes[0][0],y:mapNodes[0][1],facing:1,frame:0,moving:false});
 useEffect(()=>{
  const walker=createMapWalker();
  let last=0,handle=0;
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  const tick=(now:number)=>{
   const dt=last?(now-last)/1000:0;last=now;
   const p=latest.current;
   // Moving focus to another level, a lock, or Back cancels an older confirmation.
   if(launch.current!==null&&launch.current!==p.selected)launch.current=null;
   advanceMapWalker(walker,p.selected,p.unlocked,dt,reduced.matches);
   setHero({x:walker.x,y:walker.y,facing:walker.facing,frame:mapWalkerFrame(walker),moving:walker.moving});
   if(launch.current!==null&&mapWalkerCanEnter(walker,p.selected,p.unlocked)){
    launch.current=null;p.onStart(walker.node);return;
   }
   handle=requestAnimationFrame(tick);
  };
  handle=requestAnimationFrame(tick);return()=>cancelAnimationFrame(handle);
 },[]);
 return <div className={styles.worldMap}>
  <svg viewBox="0 0 100 100" preserveAspectRatio="none" className={styles.mapPaths} aria-hidden="true">{mapEdges.map((edge,i)=><g key={i}><polyline points={edge.map(p=>p.join(',')).join(' ')} fill="none" stroke="#354b32" strokeWidth="3"/><polyline points={edge.map(p=>p.join(',')).join(' ')} fill="none" stroke={i<props.unlocked?'#f0ca7a':'#889570'} strokeWidth="1.5" strokeDasharray={i<props.unlocked?undefined:'2 2'}/></g>)}</svg>
  {quartierLevels.map((level,i)=><button key={level.id} ref={node=>props.buttonRef(i,node)} style={{left:`${mapNodes[i][0]}%`,top:`${mapNodes[i][1]}%`,width:34,height:34,borderRadius:'50%'}} className={`${styles.mapNode} ${props.selected===i?styles.mapSelected:''} ${props.completed.includes(level.id)?styles.mapComplete:''}`} aria-disabled={i>props.unlocked} aria-label={`1–${i+1} ${level.title}, ${i>props.unlocked?'verrouillé':props.completed.includes(level.id)?'terminé':'disponible'}`} onFocus={()=>{launch.current=null;props.onSelect(i);}} onClick={()=>{props.onSelect(i);if(availableMapNode(i,props.unlocked)){launch.current=i;props.onSound('confirm');}else{launch.current=null;props.onSound('back');}}}>{i>props.unlocked?'×':props.completed.includes(level.id)?'✓':i+1}</button>)}
  <img src={hero.moving?`/mariomortille/menu/aurelien/walk/walk-${String(hero.frame+1).padStart(2,'0')}.png`:`/mariomortille/menu/aurelien/idle-${String(props.idleFrame+1).padStart(2,'0')}.png`} className={styles.mapHero} style={{left:`${hero.x}%`,top:`${hero.y}%`,transform:`translate(-50%,-91%) scaleX(${hero.facing})`,transition:'none'}} alt="" aria-hidden="true"/>
 </div>;
}
