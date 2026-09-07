'use client';
import {useMemo,useRef,useEffect} from 'react';
import {useGLTF} from '@react-three/drei';
import {useFrame} from '@react-three/fiber';
import * as THREE from 'three';
import {STORAGE_DURATION,storageBox} from './storage-motion';
export function StorageCarton({progress,consoleMode}:{progress:React.RefObject<number>;consoleMode:boolean}){
 const {scene}=useGLTF('/models/hardware/storage-crate.glb?v=1');
 const object=useMemo(()=>scene.clone(true),[scene]),root=useRef<THREE.Group>(null);
 const label=useMemo(()=>{const c=document.createElement('canvas');c.width=640;c.height=180;const x=c.getContext('2d')!;x.fillStyle='#dddcd2';x.fillRect(0,0,640,180);x.fillStyle='#172e3e';x.font='600 38px Arial';x.textAlign='center';x.fillText('MORTIZLE',320,63);x.font='27px Arial';x.fillText(consoleMode?'ARCHIVES / CONSOLES':'ARCHIVES / JEUX',320,127);const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;return tex;},[consoleMode]);
 useEffect(()=>()=>label.dispose(),[label]);
 useFrame(()=>{
  if(!root.current)return;
  const p=storageBox(progress.current);root.current.visible=progress.current<STORAGE_DURATION&&p.visible;
  root.current.position.set(p.x,p.y,.55);
  for(const [name,axis,sign] of [['Flap_Front','x',1],['Flap_Back','x',-1],['Flap_Left','z',1],['Flap_Right','z',-1]] as const){const flap=object.getObjectByName(name);if(flap)flap.rotation[axis]=sign*(axis==='x'?Math.min(1,p.open/ .78):Math.max(0,(p.open-.18)/.82))*(110*Math.PI/180);}
 });
 return <group ref={root} visible={false}><primitive object={object}/><mesh position={[0,.64,.787]}><planeGeometry args={[1.55,.44]}/><meshBasicMaterial map={label} toneMapped={false}/></mesh></group>;
}
