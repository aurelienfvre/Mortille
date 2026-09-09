'use client';
import { companionGaitFrames } from './companion-story-motion';
/* oxlint-disable next/no-img-element -- Canonical transparent PNGs rendered without interpolation. */
import { useEffect, useRef, useState } from 'react';
import { endingActors } from './ending-motion';
import { bitmapText, menuIdleFrame } from './menu-art';
import styles from './campaign-ending.module.css';
const frames = ['aurelien','julien','ben'].flatMap(id => Array.from({length:8},(_,i)=>`/mariomortille/story/${id}-idle-${String(i+1).padStart(2,'0')}.png`))
 .concat((['julien','ben'] as const).flatMap(id=>Array.from({length:companionGaitFrames[id]},(_,i)=>`/mariomortille/characters/${id}/walk-${String(i+1).padStart(2,'0')}.png`)))
 .concat(['idle','walk','run'].flatMap(action=>Array.from({length:8},(_,i)=>`/mariomortille/characters/steve/${action}-${String(i+1).padStart(2,'0')}.png`)));
export default function CampaignEnding({ onComplete }: { onComplete: () => void }) {
 const root=useRef<HTMLDivElement>(null),done=useRef(false),callback=useRef(onComplete);
 const [elapsed,setElapsed]=useState(0),[ready,setReady]=useState(false),[reduced,setReduced]=useState(false),[stride,setStride]=useState(2);
 useEffect(()=>{callback.current=onComplete;},[onComplete]);
 useEffect(()=>{
  let cancelled=false;root.current?.focus();
  const media=matchMedia('(prefers-reduced-motion: reduce)');const change=()=>setReduced(media.matches);change();media.addEventListener('change',change);
  const resize=()=>{const el=root.current;if(el){const size=parseFloat(getComputedStyle(el).getPropertyValue('--actor-size'))||96;setStride(14*size/96/Math.max(1,el.clientWidth)*100);}};
  resize();const observer=new ResizeObserver(resize);if(root.current)observer.observe(root.current);
  Promise.all(frames.map(src=>new Promise<void>(resolve=>{const image=new Image();image.onload=()=>resolve();image.onerror=()=>resolve();image.src=src;}))).then(()=>{if(!cancelled)setReady(true);});
  return()=>{cancelled=true;observer.disconnect();media.removeEventListener('change',change);};
 },[]);
 useEffect(()=>{
  if(!ready)return;let raf=0,previous=performance.now(),clock=0;
  const update=(now:number)=>{const delta=Math.min(64,now-previous);previous=now;if(!document.hidden)clock=Math.min(12000,clock+delta);setElapsed(clock);if(clock<12000)raf=requestAnimationFrame(update);};
  raf=requestAnimationFrame(update);return()=>cancelAnimationFrame(raf);
 },[ready]);
 const finish=()=>{if(done.current)return;done.current=true;callback.current();};
 const title=bitmapText('STEVE EST DE RETOUR !');
 const text=elapsed<4500?'Steve ! Viens par ici, on rentre ensemble.':elapsed<7500?'Juju et Ben vous rejoignent. Toute la bande est réunie.':'Bravo ! Tu as terminé la campagne et retrouvé Steve.';
 return <div className={styles.ending} ref={root} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Steve est de retour" onKeyDown={event=>{if((event.target as HTMLElement).closest('button'))return;if(['Enter',' ','Escape'].includes(event.key)){event.preventDefault();event.stopPropagation();if(!event.repeat)finish();}}}>
  <div className={styles.shade}/><header><p>CAMPAGNE TERMINÉE</p><h1><span className={styles.srOnly}>Steve est de retour !</span><svg aria-hidden="true" viewBox={`0 0 ${title.width} 7`} shapeRendering="crispEdges">{title.pixels.map((p,i)=><rect key={i} {...p} width="1" height="1" fill="currentColor"/>)}</svg></h1></header>
  <div className={styles.actors} aria-hidden="true">{endingActors(elapsed,reduced,stride,8).map(actor=>{
   const index=actor.action==='idle'?(reduced?1:menuIdleFrame(elapsed)+1):actor.frame;
   const src=actor.id==='steve'?`/mariomortille/characters/steve/${actor.action}-${String(index).padStart(2,'0')}.png`:actor.action==='idle'?`/mariomortille/story/${actor.id}-idle-${String(index).padStart(2,'0')}.png`:`/mariomortille/characters/${actor.id}/${actor.action}-${String(index).padStart(2,'0')}.png`;
   return <img key={actor.id} src={src} alt="" draggable={false} style={{left:`${actor.x}%`,transform:`translateX(-50%) scaleX(${actor.facing})`}}/>;
  })}</div>
  <footer><p aria-live="polite">{ready?text:'La bande se retrouve…'}</p><button type="button" onClick={finish}>{elapsed<7500?'PASSER AUX RÉSULTATS':'VOIR LES RÉSULTATS'} ›</button><small>Les niveaux restent accessibles depuis la carte pour améliorer tes records.</small></footer>
 </div>;
}
