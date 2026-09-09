'use client';
/* oxlint-disable next/no-img-element -- Pixel PNG frames retain nearest-neighbour sampling. */
import { useEffect, useRef, useState } from 'react';
import { quartierLevels } from './levels';
import { bitmapText, menuIdleFrame } from './menu-art';
import { campaignNodes, campaignMaxNode, createCampaignWalker, advanceCampaignWalker, campaignNeighbor } from './campaign-map-motion';
import styles from './campaign-map.module.css';
export type CampaignMapProps = {
 initialNode?:number; prologueCompleted:boolean; completed:string[]; unlocked:number;
 onStart:(index:number)=>void; onPrologue:()=>void; onBack:()=>void;
 onSound?:(cue:'move'|'confirm'|'back')=>void;
};
function Heading({title}:{title:string}){const {pixels,width}=bitmapText(title.toUpperCase());return <svg className={styles.pixels} viewBox={`0 0 ${width} 9`} shapeRendering="crispEdges" aria-hidden="true"><g fill="currentColor">{pixels.map((p,i)=><rect key={i} {...p} width="1" height="1"/>)}</g></svg>;}
const labels=['PROLOGUE',...quartierLevels.map((l,i)=>`${i+1}. ${l.title}`)];
export default function CampaignMap(props:CampaignMapProps){
 const initialNode = Math.max(0, Math.min(campaignMaxNode(props.prologueCompleted, props.unlocked), Number.isInteger(props.initialNode) ? props.initialNode! : 0));
 const latest=useRef(props),root=useRef<HTMLDivElement>(null),selectedRef=useRef(initialNode),launch=useRef<number|null>(null);
 const [selected,setSelected]=useState(initialNode),[hero,setHero]=useState({x:campaignNodes[initialNode][0],y:campaignNodes[initialNode][1],facing:1,frame:1,moving:false});
 const max=campaignMaxNode(props.prologueCompleted,props.unlocked);
 useEffect(()=>{latest.current=props;},[props]);
 const choose=(i:number,enter=false)=>{
  if(i<0||i>=campaignNodes.length)return;
  selectedRef.current=i;setSelected(i);launch.current=enter&&i<=max?i:null;
  props.onSound?.(i>max?'back':enter?'confirm':'move');
 };
 useEffect(()=>{
  root.current?.focus();const walker=createCampaignWalker(initialNode);let last=0,elapsed=0,handle=0;
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  const tick=(now:number)=>{
   const dt=last?Math.min((now-last)/1000,.05):0;last=now;elapsed+=dt;
   const p=latest.current,target=selectedRef.current,limit=campaignMaxNode(p.prologueCompleted,p.unlocked);
   advanceCampaignWalker(walker,target,limit,dt,reduced.matches);
   setHero({x:walker.x,y:walker.y,facing:walker.facing,moving:walker.moving,frame:walker.moving?Math.floor(walker.distance/2.4)%8+1:menuIdleFrame(reduced.matches?0:elapsed*1000)+1});
   if(launch.current!==null&&launch.current===target&&target<=limit&&!walker.moving&&walker.node===target&&walker.settled>=.18){
    launch.current=null;if(target===0)p.onPrologue();else p.onStart(target-1);return;
   }
   handle=requestAnimationFrame(tick);
  };handle=requestAnimationFrame(tick);return()=>cancelAnimationFrame(handle);
 },[]);
 const done=selected===0?props.prologueCompleted:props.completed.includes(quartierLevels[selected-1].id);
 const locked=selected>max;
 return <div ref={root} className={styles.screen} tabIndex={-1} role="region" aria-label="Carte du monde de Mariomortille" onKeyDown={e=>{
  if(e.key==='Escape'){e.preventDefault();e.stopPropagation();launch.current=null;props.onSound?.('back');props.onBack();return;}
  const vectors:Record<string,[number,number]>={ArrowLeft:[-1,0],q:[-1,0],Q:[-1,0],ArrowRight:[1,0],d:[1,0],D:[1,0],ArrowUp:[0,-1],z:[0,-1],Z:[0,-1],ArrowDown:[0,1],s:[0,1],S:[0,1]};
  if(vectors[e.key]){e.preventDefault();e.stopPropagation();if(!e.repeat){const [x,y]=vectors[e.key];choose(campaignNeighbor(selectedRef.current,x,y));root.current?.focus();}return;}
  if(e.key==='Enter'&&e.target===root.current){e.preventDefault();e.stopPropagation();choose(selectedRef.current,true);}
 }}>
  <div className={styles.world}>
   <img className={styles.art} src="/mariomortille/campaign/world-v3.png" alt="Île verdoyante : maisons, jardins, village gelé, toits, chantier et château, reliés par des chemins et deux ponts." draggable={false}/>
   <header className={styles.top}><h2 className={styles.heading} aria-label={labels[selected]}><Heading title={selected===0?'PROLOGUE':quartierLevels[selected-1].title}/></h2><button className={styles.back} onClick={()=>{launch.current=null;props.onSound?.('back');props.onBack();}}>← MENU</button></header>
   {[{id:'pirate',name:'Pirate',x:31.8,y:37.5},{id:'lola',name:'Lola',x:46.6,y:14.1},{id:'raphael',name:'Raph',x:83.5,y:69.3},{id:'mango',name:'Mango',x:83,y:15.8}].map(b=><img key={b.id} className={styles.boss} src={`/mariomortille/campaign/${b.id}-throne.png`} alt={b.name} title={b.name} draggable={false} style={{left:`${b.x}%`,top:`${b.y}%`}}/>)}
   {campaignNodes.map(([x,y],i)=>{const complete=i===0?props.prologueCompleted:props.completed.includes(quartierLevels[i-1].id);return <button key={i} type="button" style={{left:`${x}%`,top:`${y}%`}} className={`${styles.node} ${selected===i?styles.selected:''} ${i>max?styles.locked:''} ${complete?styles.complete:''}`} aria-label={`${labels[i]}, ${i>max?'verrouillé':complete?'terminé':'disponible'}`} aria-disabled={i>max} aria-current={selected===i?'step':undefined} onClick={()=>choose(i,true)}>{i>max?'×':complete?'✓':i===0?'P':i}</button>;})}
   <img className={styles.hero} src={`/mariomortille/campaign/hero-current/${hero.moving?'walk':'idle'}-${String(hero.frame).padStart(2,'0')}.png`} alt="" aria-hidden="true" draggable={false} style={{left:`${hero.x}%`,top:`${hero.y}%`,transform:`translate(-50%,-${59 / 64 * 100}%) scaleX(${hero.facing})`}}/>
   {[[45,52],[50,58],[57,64],[69,72],[91,91],[12,96],[4,60]].map(([x,y],i)=><i key={i} aria-hidden="true" className={styles.sparkle} style={{left:`${x}%`,top:`${y}%`,animationDelay:`${i*.43}s`}}/>)}
   <footer className={styles.caption}>
    <button className={styles.enter} disabled={locked} onClick={()=>choose(selected,true)}>{done?'REJOUER':'JOUER'} ▶</button>
   </footer>
  </div>
 </div>;
}
