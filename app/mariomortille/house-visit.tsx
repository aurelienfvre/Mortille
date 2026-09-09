'use client';
import { useEffect, useRef, useState } from 'react';
import type { PartyId } from './party';
import type { Player } from './simulation';
import type { Bridge } from './scene';
import { houseLevel } from './house-level';
export default function HouseVisit({paused,onExit,onPause,onSound,appearance,onReady,onError}:{onReady?:()=>void;onError?:()=>void;paused:boolean;onExit:()=>void;onPause:()=>void;onSound:Bridge['sound'];appearance:Pick<Player,'power'|'health'>&{character?:PartyId}}) {
 const host=useRef<HTMLDivElement>(null),[score,setScore]=useState(0);
 const bridge=useRef<Bridge>({paused,ready:onReady,muted:false,pause:onPause,leaveHouse:onExit,sound:onSound,update:s=>setScore(s.score)});
 useEffect(()=>{Object.assign(bridge.current,{paused,ready:onReady,pause:onPause,leaveHouse:onExit,sound:onSound});},[paused,onPause,onExit,onSound,onReady]);
 useEffect(()=>{let disposed=false;let game:{destroy:(children:boolean)=>void}|undefined;
  void Promise.all([import('phaser'),import('./scene')]).then(([Phaser,{createScene}])=>{
   if(disposed||!host.current)return;
   game=new Phaser.Game({type:Phaser.AUTO,parent:host.current,width:640,height:360,canvasStyle:'image-rendering:pixelated;',pixelArt:true,roundPixels:true,antialias:false,scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},scene:createScene(bridge.current,houseLevel,false,appearance),audio:{noAudio:true}});
  }).catch(() => { if (!disposed) onError?.(); });return()=>{disposed=true;game?.destroy(true);};
 },[]);
 return <section aria-label="Intérieur de la maison" style={{position:'absolute',inset:0,zIndex:5,background:'#171321'}}><div ref={host} style={{position:'absolute',inset:0}}/><div style={{position:'absolute',left:'4%',top:18,color:'#ffe9bf',fontFamily:'monospace'}}>LA MAISON DES JARDINS · {score} PTS BONUS LOCAUX</div></section>;
}
