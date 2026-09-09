'use client';
import {useEffect,useMemo,useState} from 'react';
import * as THREE from 'three';
import {games} from './catalog';
import {getConsole} from './console-catalog';
import {createEngine,W,H} from './engine';
import {pixelText} from './pixel-type';
export function useMediaArtwork(index:number,consoleId:string,format:'disc'|'case'|'cartridge'){
 const gameId=games[index].id;
 const [cover,setCover]=useState<{id:string;image:HTMLImageElement}|null>(null);
 useEffect(()=>{
  if(gameId!=='mario')return;
  let cancelled=false;
  const load=(src:string)=>new Promise<HTMLImageElement>((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=reject;image.src=src;});
  Promise.all([load('/mariomortille/menu/village-background.png'),load('/mariomortille/story/current/aurelien-run-06.png')]).then(([background,hero])=>{
   if(cancelled)return;
   const canvas=document.createElement('canvas');canvas.width=768;canvas.height=1024;
   const ctx=canvas.getContext('2d')!;ctx.imageSmoothingEnabled=false;
   drawCoverImage(ctx,background,0,0,768,1024);
   ctx.drawImage(hero,24,170,720,720);
   const image=new Image();image.onload=()=>{if(!cancelled)setCover({id:gameId,image});};image.src=canvas.toDataURL('image/png');
  }).catch(()=>{/* Keep the existing printable cover if an asset cannot load. */});
  return()=>{cancelled=true;};
 },[gameId]);
 const artwork=cover?.id===gameId?cover.image:undefined;
 const material=useMemo(()=>{
  const game=games[index],device=getConsole(consoleId as any),c=document.createElement('canvas');c.width=768;c.height=format==='case'?1024:768;
  const x=c.getContext('2d')!,w=c.width,h=c.height,disc=format==='disc',ps3=consoleId==='ps3',xbox=consoleId.startsWith('xbox');
  const gradient=x.createLinearGradient(0,0,w,h);gradient.addColorStop(0,'#101e37');gradient.addColorStop(.55,'#273050');gradient.addColorStop(1,'#080d1b');x.fillStyle=gradient;x.fillRect(0,0,w,h);
  // Authored vector bands retain the platform family layout without importing commercial cover art.
  const strip=ps3&&disc?h-112:0,band=ps3?'#18191e':xbox?'#ecf2e9':consoleId==='gamecube'?'#262336':'#202941';
  x.fillStyle=band;x.fillRect(0,strip,w,112);
  x.fillStyle=xbox?'#559a32':ps3?'#e1e3eb':'#cdd8ed';
  pixelText(x,device.name.toUpperCase(),disc?(ps3?194:150):54,strip+76,disc?26:41,disc?(ps3?380:468):w-108);
  if(xbox){for(let i=0;i<3;i++){x.strokeStyle=['#7dbd32','#c4e868','#338939'][i];x.lineWidth=24;x.beginPath();x.arc(690,-20,110+i*31,.05,1.85);x.stroke();}}
  const top=ps3&&disc?38:145;
  x.fillStyle='#f0f3fa';pixelText(x,game.name,disc?144:42,top+76,disc?43:64,disc?480:w-84);
  x.fillStyle=game.color;x.fillRect(42,top+95,w-84,6);
  const preview=document.createElement('canvas');preview.width=W;preview.height=H;createEngine(game.id).draw(preview.getContext('2d')!);
  x.imageSmoothingEnabled=false;
  const pictureY=top+123,pictureH=disc?290:format==='case'?360:320;
  if(artwork)drawCoverImage(x,artwork,42,pictureY,w-84,pictureH);else x.drawImage(preview,0,0,W,H,42,pictureY,w-84,pictureH);
  x.fillStyle='#d1daeb';pixelText(x,game.genre.toUpperCase()+' / 1 JOUEUR',46,pictureY+pictureH+48,28,w-92);
  if(!disc){x.fillStyle='#8dcfe5';pixelText(x,'MORTIZLE ARCADE',46,h-82,27,w-92);x.fillStyle='#9aa6bd';pixelText(x,'COLLECTION PERSONNELLE / 0'+(index+1),46,h-39,21,w-92);}
  else{x.fillStyle='#a6b6cb';pixelText(x,'MORTIZLE / 0'+(index+1),110,ps3?h-139:h-66,25,w-220);}
  if(format==='case')drawCaseCover(x,w,h,index,consoleId,artwork);
  const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=4;tex.flipY=format!=='case';
  const mat=format==='disc'?new THREE.MeshPhysicalMaterial({map:tex,metalness:.24,roughness:.26,clearcoat:.9,clearcoatRoughness:.1,iridescence:.45,iridescenceThicknessRange:[100,380],envMapIntensity:1.3,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}):new THREE.MeshBasicMaterial({map:tex,toneMapped:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});mat.userData.inkShaded=true;mat.userData.title=game.name;mat.userData.platform=device.name;return mat;
 },[index,consoleId,format,artwork]);
 useEffect(()=>()=>{material.map?.dispose();material.dispose();},[material]);return material;
}

// Printed jackets use the platform's packaging hierarchy and original in-game artwork.
function drawCoverImage(x:CanvasRenderingContext2D,image:HTMLImageElement,dx:number,dy:number,dw:number,dh:number){
 const scale=Math.max(dw/image.naturalWidth,dh/image.naturalHeight),sw=dw/scale,sh=dh/scale;
 x.drawImage(image,(image.naturalWidth-sw)/2,(image.naturalHeight-sh)/2,sw,sh,dx,dy,dw,dh);
}
function drawCaseCover(x:CanvasRenderingContext2D,w:number,h:number,index:number,id:string,artwork?:HTMLImageElement){
 const game=games[index],name=getConsole(id as any).name;
 const preview=document.createElement('canvas');preview.width=W;preview.height=H;createEngine(game.id).draw(preview.getContext('2d')!);
 x.fillStyle='#09101c';x.fillRect(0,0,w,h);
 const bandH=id==='ps3'?102:id==='xbox'?105:118;
 x.save();x.beginPath();x.rect(0,bandH,w,h-bandH);x.clip();
 x.imageSmoothingEnabled=false;
 // Full-bleed art, no tablet-like frame around the illustration.
 if(artwork)drawCoverImage(x,artwork,0,bandH,w,h-bandH);else x.drawImage(preview,0,0,W,H,-w*.16,bandH,w*1.32,h-bandH);
 const shade=x.createLinearGradient(0,bandH,0,h);shade.addColorStop(0,'rgba(4,9,20,.05)');shade.addColorStop(.45,'rgba(4,9,20,.12)');shade.addColorStop(1,'rgba(4,9,20,.98)');x.fillStyle=shade;x.fillRect(0,bandH,w,h-bandH);
 x.restore();
 const metal=x.createLinearGradient(0,0,w,bandH);metal.addColorStop(0,id==='xbox360'?'#fafcf2':'#11141a');metal.addColorStop(1,id==='xbox360'?'#cddcb8':'#32353d');x.fillStyle=metal;x.fillRect(0,0,w,bandH);
 const xbox=id.startsWith('xbox');
 x.fillStyle=xbox?(id==='xbox360'?'#4c7f23':'#b6e64b'):'#f0f1f4';
 x.font=(id==='ps3'?'italic 600 ':'500 ')+(id==='ps3'?48:42)+'px Arial';
 x.textBaseline='middle';x.fillText(name,34,bandH*.49,w-108);
 x.font='13px Arial';x.fillText('MORTIZLE INTERACTIVE',36,bandH-17);
 if(xbox){x.save();x.translate(w-58,bandH*.45);x.strokeStyle=id==='xbox360'?'#669d2a':'#b8dc39';x.lineWidth=6;x.beginPath();x.arc(0,0,28,0,Math.PI*2);x.stroke();x.beginPath();x.moveTo(-17,-17);x.lineTo(17,17);x.moveTo(17,-17);x.lineTo(-17,17);x.stroke();x.restore();}
 else if(id==='gamecube'){x.strokeStyle='#c4b9ef';x.lineWidth=5;x.strokeRect(w-77,27,38,38);x.strokeRect(w-66,38,16,16);}
 x.fillStyle=id==='ps3'?'#bd334d':xbox?'#89b535':'#c8cddd';x.fillRect(0,bandH-3,w,3);
 x.fillStyle='rgba(2,5,12,.65)';x.fillRect(w-78,bandH+14,62,20);x.fillStyle='#e5e9ec';x.font='12px Arial';x.textAlign='center';x.fillText('PAL',w-47,bandH+24);x.textAlign='left';
 x.shadowColor='#02040b';x.shadowBlur=14;x.fillStyle='#f6f5ee';
 pixelText(x,game.name,34,h-247,65,w-68);x.shadowBlur=0;
 x.fillStyle=game.color;pixelText(x,game.genre.toUpperCase(),37,h-202,25,w-74);
 x.font='18px Arial';x.fillStyle='#d7dce8';x.fillText('UNE PARTIE. UNE AVENTURE.',37,h-159,w-74);
 x.fillStyle='#f6f6f1';x.fillRect(34,h-113,70,73);x.fillStyle='#161b26';x.font='bold 21px Arial';x.fillText('01',47,h-85);x.font='10px Arial';x.fillText('JOUEUR',41,h-58);
 x.fillStyle='#e5e8ee';x.font='bold 23px Arial';x.textAlign='right';x.fillText('MORTIZLE',w-32,h-75);x.font='12px Arial';x.fillText('ARCADE COLLECTION • '+String(index+1).padStart(2,'0'),w-32,h-49);x.textAlign='left';
}
export function caseSecondaryMaterial(front:THREE.Material,side:'back'|'spine'){
 const data=front.userData,c=document.createElement('canvas');c.width=side==='spine'?96:768;c.height=1024;
 const x=c.getContext('2d')!;x.fillStyle='#151a24';x.fillRect(0,0,c.width,c.height);
 x.fillStyle=data.platform?.includes('Glorille')?'#a5cd61':'#dee5ed';
 if(side==='spine'){
  x.save();x.translate(48,45);x.rotate(Math.PI/2);x.font='bold 27px Arial';x.fillText(data.title??'MORTIZLE',0,0,750);x.restore();
  x.fillStyle='#8caec9';x.font='14px Arial';x.save();x.translate(45,790);x.rotate(Math.PI/2);x.fillText(data.platform??'MORTIZLE',0,0,185);x.restore();
 }else{
  x.font='bold 38px Arial';x.fillText(data.title??'MORTIZLE',34,70,700);
  x.font='22px Arial';x.fillText('LA SALLE EST À VOUS.',34,120);
  const image=(front as THREE.MeshBasicMaterial).map?.image as HTMLCanvasElement;
  if(image)x.drawImage(image,0,130,768,650,34,160,700,435);
  x.fillStyle='#d8e0e8';x.font='22px Arial';x.fillText(data.platform??'',34,650,700);
  x.font='18px Arial';x.fillText('Jouez. Explorez. Recommencez.',34,702);x.fillText('Un univers Mortizle Arcade.',34,737);
  x.strokeStyle='#526073';x.beginPath();x.moveTo(34,775);x.lineTo(734,775);x.stroke();
  x.font='15px Arial';x.fillText('1 JOUEUR    •    SAUVEGARDE LOCALE',34,820);
  x.fillText('MORTIZLE INTERACTIVE',34,855);
  x.fillStyle='#f0f0e9';x.fillRect(490,887,242,101);x.fillStyle='#141720';
  for(let i=0;i<75;i++)if((i*7%11)<7)x.fillRect(503+i*2.85,897,1+(i%2),62);
  x.font='13px monospace';x.fillText('MZ 2026 000001',521,981);
 }
 const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;texture.flipY=false;texture.anisotropy=4;
 const mat=new THREE.MeshBasicMaterial({map:texture,toneMapped:false});mat.userData.inkShaded=true;return mat;
}
