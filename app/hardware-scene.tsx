'use client';
import {createGamePreview} from './game-preview';
import {useMemo,useRef,useLayoutEffect,useEffect} from 'react';
import {useFrame,useThree} from '@react-three/fiber';
import {useGLTF} from '@react-three/drei';
import * as THREE from 'three';
import assets from './hardware-assets.json';
import cases from './hardware-cases.json';
import {caseOpenAmount} from './case-motion';
import {caseSecondaryMaterial} from './media-art';
import {cartridgeEase, type DisplayCartridgePose} from './cartridge-sequence';
import {hardwarePose,mediaDisplayScale,HARDWARE_DURATION,type HardwareSpec} from './hardware-motion';
import {returnMechanismProgress} from './return-motion';
import {createEngine,W,H} from './engine';
import {games} from './catalog';
const hardware=Object.fromEntries(Object.entries(assets).map(([id,spec])=>[id,{...spec,caseSize:(cases as any)[id]?.size,caseDisc:(cases as any)[id]?.disc.position}])) as unknown as Record<string,HardwareSpec>;
export const getHardware=(id:string)=>hardware[id];
export function prepareHardware(source:THREE.Object3D){
 const object=source.clone(true),materials=new Map<THREE.Material,THREE.Material>();
 object.traverse(o=>{if(!(o instanceof THREE.Mesh))return;
  const finish=(original:THREE.Material)=>{
   if(materials.has(original))return materials.get(original)!;
   let material:THREE.Material=original.clone();
   if(original instanceof THREE.MeshStandardMaterial && /Disc_Reflective|Disc_Polycarbonate/i.test(original.name)){
    const physical=new THREE.MeshPhysicalMaterial();THREE.MeshStandardMaterial.prototype.copy.call(physical,original);
    physical.metalness=.94;physical.roughness=.09;physical.iridescence=1;physical.iridescenceIOR=1.5;physical.iridescenceThicknessRange=[100,520];physical.clearcoat=1;physical.clearcoatRoughness=.08;physical.envMapIntensity=1.6;material=physical;
   }
   material.userData.inkShaded=true;materials.set(original,material);return material;
  };
  o.material=Array.isArray(o.material)?o.material.map(finish):finish(o.material);
 });return object;
}
export function HardwareMedia({consoleId,material,display=false}:{consoleId:string;material:THREE.Material;display?:boolean}){
 const spec=getHardware(consoleId),asset=useGLTF(spec.media.asset);
 const object=useMemo(()=>prepareHardware(asset.scene),[asset.scene]);
 const label=spec.media.label;
 const labelPosition=useMemo(()=>{const bounds=new THREE.Box3().setFromObject(object);return [label.position[0],label.position[1],Math.max(label.position[2],bounds.max.z+.002)] as [number,number,number];},[object,label]);
 material.polygonOffset=true;material.polygonOffsetFactor=-2;material.polygonOffsetUnits=-2;
 // Device and display are prefetched while the player browses the matching media.
 useGLTF.preload(spec.asset);useGLTF.preload('/models/hardware/lift-hatch.glb');
 if(spec.display!=='handheld')useGLTF.preload(`/models/hardware/tv-${spec.display}.glb?v=2`);
 return <group position={display?[0,.6,0]:[0,0,0]} scale={display?mediaDisplayScale(spec):1}>
  <primitive object={object}/>
  <mesh position={labelPosition}>
   {spec.media.type==='disc'?<ringGeometry args={[.085,label.size[0]/2,64]}/>:<planeGeometry args={label.size}/>}
   <primitive object={material} attach="material"/>
  </mesh>
 </group>;
}
export function HardwareSequence({consoleId,index,timeline,handoff,screen,mediaMaterial,caseMaterial,onReady}: {consoleId:string;index:number;onReady?:()=>void;timeline:React.RefObject<number>;handoff:React.RefObject<DisplayCartridgePose>;screen:THREE.ShaderMaterial;mediaMaterial:THREE.Material;caseMaterial?:THREE.Material}){
 const spec=getHardware(consoleId),asset=useGLTF(spec.asset),hatchAsset=useGLTF('/models/hardware/lift-hatch.glb');
 const television=useGLTF(`/models/hardware/tv-${spec.display==='modern'?'modern':'crt'}.glb?v=2`);
 const consoleObject=useMemo(()=>prepareHardware(asset.scene),[asset.scene]);
 const hatch=useMemo(()=>hatchAsset.scene.clone(true),[hatchAsset.scene]);
 const tv=useMemo(()=>prepareHardware(television.scene),[television.scene]);
 useEffect(()=>{onReady?.();},[onReady]);
 const device=useRef<THREE.Group>(null),disc=useRef<THREE.Group>(null),televisionRoot=useRef<THREE.Group>(null);
 const start=useRef<DisplayCartridgePose|null>(null),running=useRef(false);
 const preview=useMemo(()=>createGamePreview(games[index].id),[index]);
 useEffect(() => () => preview.dispose?.(), [preview]);
 const input=useMemo(()=>({held:new Set<string>(),pressed:new Set<string>(),pointer:{x:0,y:0,active:false}}),[]),frame=useRef(0);
 const {gl}=useThree();
 const moving=useMemo(()=>Object.fromEntries(Object.entries(spec.moving).map(([name,data])=>{const node=consoleObject.getObjectByName(data.node);return [name,{node,position:node?.position.clone(),rotation:node?.rotation.clone()}];})),[spec,consoleObject]);
 const doors=useMemo(()=>['Hatch_Left','Hatch_Right'].map(name=>{const node=hatch.getObjectByName(name);return {node,x:node?.position.x??0};}),[hatch]);
 const platform=hatch.getObjectByName('Platform');
 useLayoutEffect(()=>{
  const glass=(spec.display==='handheld'?consoleObject:tv).getObjectByName('Display_Surface') as THREE.Mesh;
  if(glass)glass.material=screen;
  screen.uniforms.displayKind.value=spec.display==='modern'?1:spec.display==='handheld'?2:0;
 },[spec,consoleObject,tv,screen]);
 useFrame((_,dt)=>{
  const active=timeline.current>=0;
  if(active&&!running.current)start.current={...handoff.current};
  running.current=active;
  const t=timeline.current>=20?HARDWARE_DURATION*(1-returnMechanismProgress(timeline.current-20)):Math.max(0,timeline.current);
  const p=hardwarePose(spec,t,start.current??handoff.current);
  device.current!.visible=active;disc.current!.visible=active;televisionRoot.current!.visible=active&&spec.display!=='handheld';
  device.current!.position.set(...p.consolePosition);device.current!.scale.setScalar(p.consoleScale);
  disc.current!.position.set(...p.mediaPosition);disc.current!.rotation.set(...p.mediaRotation);disc.current!.scale.setScalar(p.mediaScale);
  televisionRoot.current!.position.set(...p.displayPosition);
  for(const [name,part] of Object.entries(moving)){
   if(!part.node)continue;
   part.node.position.copy(part.position!);part.node.rotation.copy(part.rotation!);
   if(name==='lid')part.node.rotation.x+=spec.moving.lid!.openAngle*p.mechanism;
   if(name==='tray')part.node.position.z+=spec.moving.tray!.openDistance*p.mechanism;
   if(name==='power')part.node.position[spec.moving.power!.axis]+=spec.moving.power!.travel*p.powerPress;
  }
  doors.forEach(({node,x},i)=>{if(node)node.position.x=x+(i===0?-1:1)*1.6*p.hatch;});
  if(platform){platform.visible=active;platform.position.y=p.consolePosition[1]-.05;}
  screen.uniforms.power.value=p.power;
  if(p.power>0){frame.current+=dt;if(frame.current>=1/30){preview.update(Math.min(frame.current,.05),input);frame.current=0;const tex=screen.uniforms.screen.value as THREE.CanvasTexture,c=tex.image as HTMLCanvasElement,x=c.getContext('2d')!;x.save();x.scale(c.width/W,c.height/H);preview.draw(x);x.restore();tex.needsUpdate=true;}}
  if(process.env.NODE_ENV==='development')gl.domElement.dataset.hardware=JSON.stringify({consoleId,time:t,phase:p.phase,display:spec.display,power:p.power,media:p.mediaPosition,device:p.consolePosition,mechanism:p.mechanism,discSpin:p.discSpin,glass:p.displayPosition});
 });
 return <>
  <group position={[0,0,-.7]}><primitive object={hatch}/></group>
  <group ref={device}><primitive object={consoleObject}/></group>
  {spec.caseSize&&caseMaterial&&<LaunchingCase consoleId={consoleId} material={caseMaterial} timeline={timeline} handoff={handoff}/>}
  <group ref={disc}><HardwareMedia consoleId={consoleId} material={mediaMaterial}/></group>
  <group ref={televisionRoot}><primitive object={tv}/></group>
 </>;
}

export function CarouselConsole({consoleId}:{consoleId:string}){
 const spec=getHardware(consoleId),asset=useGLTF(spec?.asset??'/models/console-nes-fit.glb?v=2');
 const object=useMemo(()=>prepareHardware(asset.scene),[asset.scene]);
 const layout=useMemo(()=>{const box=new THREE.Box3().setFromObject(object),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());return {scale:1.2/Math.max(size.x,size.y,size.z),center};},[object]);
 return <group position={[0,.6,0]} rotation={[.16,0,0]} scale={layout.scale}><group position={layout.center.clone().negate()}><primitive object={object}/></group></group>;
}

export function HardwareCase({consoleId,material,display=false,rootRef}:{consoleId:string;material:THREE.Material;display?:boolean;rootRef?:React.RefObject<THREE.Object3D|null>}){
 const spec=(cases as any)[consoleId],asset=useGLTF(spec.asset as string),object=useMemo(()=>prepareHardware(asset.scene),[asset.scene]);
 const secondary=useMemo(()=>({back:caseSecondaryMaterial(material,'back'),spine:caseSecondaryMaterial(material,'spine')}),[material]);
 useLayoutEffect(()=>{const front=object.getObjectByName(spec.front.node) as THREE.Mesh;if(front)front.material=material;for(const key of ['back','spine'] as const){const face=object.getObjectByName(spec[key]?.node??'') as THREE.Mesh;if(face)face.material=secondary[key];}if(rootRef)rootRef.current=object;},[object,material,spec,rootRef,secondary]);
 useEffect(()=>()=>{for(const mat of Object.values(secondary)){mat.map?.dispose();mat.dispose();}},[secondary]);
 return <group position={display?[0,.6,0]:[0,0,0]} scale={display?1.2/Math.max(...spec.size):1}><primitive object={object}/></group>;
}
function LaunchingCase({consoleId,material,timeline,handoff}:any){
 const spec=(cases as any)[consoleId],group=useRef<THREE.Group>(null),object=useRef<THREE.Object3D>(null),start=useRef<DisplayCartridgePose|null>(null),active=useRef(false);
 useFrame(()=>{
  const running=timeline.current>=0;if(running&&!active.current)start.current={...handoff.current};active.current=running;
  const t=timeline.current>=20?7.6*(1-returnMechanismProgress(timeline.current-20)):Math.max(0,timeline.current),p=start.current??handoff.current;
  const retreat=cartridgeEase((t-1.3)/.8),scale=p.scale*1.2/Math.max(...spec.size)*(1-retreat);
  if(!group.current)return;group.current.visible=running&&t<2.1;
  group.current.position.set(p.x-3.3*retreat,p.y+Math.cos(p.pitch)*.6*p.scale-.6*retreat,p.z+Math.sin(p.pitch)*.6*p.scale+.2*retreat);
  group.current.rotation.set(p.pitch,p.yaw-.35*retreat,0);group.current.scale.setScalar(Math.max(.001,scale));
  const lid=object.current?.getObjectByName(spec.cover.node);if(lid)lid.rotation.y=spec.cover.openAngle*caseOpenAmount(t);
 });
 return <group ref={group}><HardwareCase consoleId={consoleId} material={material} rootRef={object}/></group>;
}
// Fetch the small hardware collection during the initial lobby load, so switching stays in-scene.
if(typeof window!=='undefined'){
 for(const spec of Object.values(assets)){useGLTF.preload(spec.asset);useGLTF.preload(spec.media.asset);}
 for(const spec of Object.values(cases))useGLTF.preload(spec.asset);
 useGLTF.preload('/models/hardware/tv-crt.glb?v=2');useGLTF.preload('/models/hardware/tv-modern.glb?v=2');
}
