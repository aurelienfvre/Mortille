'use client';
import {useMemo,useRef,useEffect,useState,Suspense,type ReactNode} from 'react';
import {useFrame} from '@react-three/fiber';
import {useGLTF} from '@react-three/drei';
import * as THREE from 'three';
import {getHardware,prepareHardware} from './hardware-scene';
import {cartridgeEase} from './cartridge-sequence';
function Exhibit({consoleId,screen}:{consoleId:string;screen:THREE.Material}){
 const spec=getHardware(consoleId),asset=useGLTF(spec.asset),television=useGLTF(`/models/hardware/tv-${spec.display==='modern'?'modern':'crt'}.glb?v=2`);
 const device=useMemo(()=>prepareHardware(asset.scene),[asset.scene]),tv=useMemo(()=>prepareHardware(television.scene),[television.scene]);
 useEffect(()=>{const glass=(spec.display==='handheld'?device:tv).getObjectByName('Display_Surface') as THREE.Mesh;if(glass)glass.material=screen;},[device,tv,spec,screen]);
 return <>
  <group position={[0,1.157,.12]} scale={spec.display==='handheld'?.7:.48}><primitive object={device}/></group>
  {spec.display!=='handheld'&&<group position={[0,2.15,-.08]} scale={.36}><primitive object={tv}/></group>}
 </>;
}
/** The swap is concealed below the floor. Both directions use the same mechanical stages. */
export default function EraStation({consoleId,position,rotation=0,screen,children,onClick}:{consoleId:string;position:[number,number,number];rotation?:number;screen:THREE.Material;children:ReactNode;onClick?:()=>void}){
 const source=useGLTF('/models/hardware/showroom-stand.glb?v=1');
 const model=useMemo(()=>prepareHardware(source.scene),[source.scene]);
 const stand=useMemo(()=>model.getObjectByName('Display_Stand')!.clone(true),[model]);
 const doors=useMemo(()=>['Stand_Hatch_Left','Stand_Hatch_Right'].map(n=>model.getObjectByName(n)!.clone(true)),[model]);
 const [shown,setShown]=useState(consoleId),next=useRef(consoleId),time=useRef(3.4),moving=useRef<THREE.Group>(null),left=useRef<THREE.Group>(null),right=useRef<THREE.Group>(null);
 const modern=shown!=='nes'&&shown!=='n64';
 useEffect(()=>{
  const sameEra=['nes','n64'].includes(consoleId)&&['nes','n64'].includes(next.current);
  if(next.current!==consoleId){next.current=consoleId;if(sameEra)setShown(consoleId);else time.current=0;}
 },[consoleId]);
 useFrame((_,dt)=>{
  const t=time.current=Math.min(3.4,time.current+Math.min(dt,.05)),down=cartridgeEase((t-.3)/.85),up=cartridgeEase((t-1.5)/1.3);
  if(t>=1.48&&shown!==next.current)setShown(next.current);
  if(moving.current){moving.current.position.y=-3.8*down*(1-up);moving.current.position.x=t<.5?Math.sin(t*88)*.014*Math.sin(Math.PI*t/.5):0;moving.current.rotation.z=t<.5?Math.sin(t*62)*.004:0;}
  const open=cartridgeEase(t/.4)*(1-cartridgeEase((t-2.9)/.5));if(left.current)left.current.position.x=-1.04*open;if(right.current)right.current.position.x=1.04*open;
 });
 return <group userData={{roomObstacle:true,halfX:1.12,halfZ:.85}} position={position} rotation={[0,rotation,0]} onClick={onClick}>
  <group ref={left}><primitive object={doors[0]}/></group><group ref={right}><primitive object={doors[1]}/></group>
  <group ref={moving}>
   {modern?<><primitive object={stand}/><Suspense fallback={null}><Exhibit consoleId={shown} screen={screen}/></Suspense></>:children}
  </group>
 </group>;
}
useGLTF.preload('/models/hardware/showroom-stand.glb?v=1');
