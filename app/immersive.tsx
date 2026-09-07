'use client';
import {createGamePreview} from './game-preview';
import SocialPhysics from './social-physics';
import {STORAGE_DURATION,STORAGE_SWAP,storageItem} from './storage-motion';
import {StorageCarton} from './storage-carton';
import Yeti from './character';
import MidnightRoom from './midnight-room';
import EraStation from './era-station';
import {CONSOLES,getConsole} from './console-catalog';
import {useMediaArtwork} from './media-art';
import {HardwareMedia,HardwareSequence,getHardware,CarouselConsole,HardwareCase} from './hardware-scene';
import {hardwareCamera,HARDWARE_DURATION,type V3} from './hardware-motion';
const ConsoleContext = createContext('n64');
const HardwareReadyContext=createContext<(()=>void)|undefined>(undefined);
import CucuSteve from './cucu-steve';
import Mango from './mango';
import Ben from './ben';
import {RETURN_DURATION,returnCameraProgress,returnMechanismProgress} from './return-motion';
import { friendPose } from './lobby-behavior';
import { inkMaterial } from './ink-shading';
import { pixelText } from './pixel-type';
import { Canvas, useFrame, useThree, createPortal } from '@react-three/fiber';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';
import {
  SWAP_DURATION,
  swapDuration,
  carouselPose,
  slotPose,
  slotOf,
  swipeDirection,
} from './cartridge-motion';
import { useGLTF, RoundedBox, Html } from '@react-three/drei';
import {
  useEffect,
  createContext,
  useContext,
  Suspense,
  useState,
  useLayoutEffect,
  useMemo,
  useRef,
  Component,
  type ReactNode,
} from 'react';
import * as THREE from 'three';
import cartridgeSpec from './cartridge-nes-measures.json';
import {createCartridgeSampler,type DisplayCartridgePose} from './cartridge-sequence';
import { games } from './catalog';
import { drawSprite } from './sprites';
import { createEngine, W, H } from './engine';
const vertex = `varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const fragment = `uniform sampler2D screen;uniform float time;uniform float power;uniform float printed;uniform float displayKind;varying vec2 vUv;
void main(){
 if(printed>.5){
  gl_FragColor=texture2D(screen,vUv);
  #include <colorspace_fragment>
  return;
 }
 if(displayKind>.5){
  vec3 digital=texture2D(screen,vUv).rgb;
  if(displayKind>1.5){float l=dot(digital,vec3(.299,.587,.114));digital=mix(vec3(.08,.17,.08),vec3(.66,.76,.39),floor(l*4.)/3.);}
  digital=mix(vec3(.006,.009,.016),digital,smoothstep(.04,1.,power));
  gl_FragColor=vec4(digital,1.);
  #include <colorspace_fragment>
  return;
 }
 vec2 p=vUv*2.-1.;vec2 uv=vUv+p*dot(p,p)*.017*(1.-printed);
 float noise=fract(sin(dot(floor(uv*vec2(640.,480.)),vec2(12.9898,78.233))+floor(time*30.))*43758.5453);
 float row=floor(uv.y*240.);float hum=sin(uv.y*9.-time*2.3)*.0012;
 uv.x+=hum*(1.-printed);
 vec3 col;col.r=texture2D(screen,uv+vec2(.0017*(1.-printed),0)).r;col.g=texture2D(screen,uv).g;col.b=texture2D(screen,uv-vec2(.0017*(1.-printed),0)).b;
 float line=fract(uv.y*240.);float scan=mix(.45+.55*pow(sin(line*3.14159265),.55),.78,smoothstep(.5,1.3,fwidth(uv.y)*240.));
 float column=mod(floor(uv.x*640.),3.);vec3 phosphor=column<1.?vec3(1.17,.72,.72):column<2.?vec3(.72,1.17,.72):vec3(.72,.72,1.17);
 // A 60 Hz raster with phosphor persistence and a slow analog rolling band.
 float beamRow=mod(time*60.*240.,240.);float age=mod(beamRow-row+240.,240.)/240.;float persistence=.9+.16*exp(-age*4.);
 float roll=exp(-pow((fract(uv.y-time*.11)-.5)*24.,2.));
 vec3 glow=(texture2D(screen,uv+vec2(.003,0)).rgb+texture2D(screen,uv-vec2(.003,0)).rgb+texture2D(screen,uv+vec2(0,.004)).rgb+texture2D(screen,uv-vec2(0,.004)).rgb)*.035;
 phosphor=mix(phosphor,vec3(.87),smoothstep(.65,1.5,fwidth(uv.x)*640.));
 vec3 crt=col*scan*phosphor*persistence*(1.-.27*pow(length(p)*.7,2.))+glow+roll*.022+(noise-.5)*.021;
 crt*=1.+.008*sin(time*113.);col=mix(crt,col,printed);
 col*=step(0.,uv.x)*step(uv.x,1.)*step(0.,uv.y)*step(uv.y,1.);
 float opening=smoothstep(.02,.65,power);float beam=exp(-pow((uv.y-.5)/max(.0015,opening*.62),2.));
 vec3 boot=mix(vec3(.006,.009,.008),vec3(.77,.96,.86)*beam,smoothstep(0.,.08,power));col=mix(boot,col,smoothstep(.65,1.,power));
 gl_FragColor=vec4(col,1.);
 #include <colorspace_fragment>
}`;
function useScreen(
  index: number,
  info = false,
  gltf = false,
  cartridge = false,
  television = false,
) {
  const game = games[index];
  const tex = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = info ? 1024 : 640;
    c.height = info ? 410 : 480;
    const x = c.getContext('2d')!;
    x.imageSmoothingEnabled = false;
    const write = (text: string, xx: number, yy: number) => {
      const font = Number(x.font.match(/([0-9]+)px/)?.[1] || 22);
      pixelText(
        x,
        text,
        xx,
        yy,
        font * 0.79,
        x.textAlign === 'right' ? xx - 20 : c.width - xx - 20,
        x.textAlign,
      );
    };
    x.fillStyle = '#0c1212';
    x.fillRect(0, 0, c.width, c.height);
    x.fillStyle = game.color;
    x.font = `bold ${info ? 28 : 34}px monospace`;
    write(
      info ? `${game.genre.toUpperCase()} / 1 JOUEUR` : 'MORTIZLE INTERACTIVE',
      info ? 30 : 50,
      info ? 45 : 48,
    );
    x.fillStyle = '#f1dfb4';
    x.font = `bold ${info ? 76 : 47}px monospace`;
    write(game.name, info ? 30 : 50, info ? 118 : 111);
    if (info) {
      x.fillStyle = game.color;
      x.fillRect(30, 133, 960, 4);
      x.textAlign = 'right';
      x.font = 'bold 25px monospace';
      x.fillStyle = '#91c771';
      write('■ DISPONIBLE', 990, 45);
      x.textAlign = 'left';
      x.fillStyle = game.color;
      x.font = '26px monospace';
      const subtitles = [
        'L’AVENTURE DE LA RÉNOVATION ÉNERGÉTIQUE',
        'LA CHASSE AUX ÉNERGIES PERDUES',
        'DÉFENSE DU RÉSEAU',
        'LE DUEL ÉLECTRIQUE',
        'LA COURSE AUX CELLULES',
        'MISSION CHAUDIÈRE',
        'OPÉRATION ANTI-GASPILLAGE',
        'CONSTRUISEZ UN AVENIR SOLIDE',
        'LE GRAND PRIX ÉLECTRIQUE',
      ];
      write(subtitles[index], 30, 176);
      x.fillStyle = '#b3bc93';
      x.font = '28px monospace';
      const words = game.description.split(' ');
      let line = '',
        y = 220;
      for (const word of words) {
        if (x.measureText(line + word).width > 930) {
          write(line, 30, y);
          line = '';
          y += 34;
        }
        line += word + ' ';
      }
      write(line, 30, y);
      x.fillStyle = game.color;
      x.font = '22px monospace';
      write(game.genre.toUpperCase() + ' · SOLO · ARCADE', 30, 345);
      let record = 0;
      try {
        record =
          Number(localStorage.getItem('arcad-neo-record-' + game.id)) || 0;
      } catch {}
      x.textAlign = 'right';
      write('RECORD ' + record.toLocaleString('fr-FR'), 990, 389);
      x.textAlign = 'left';
      x.fillStyle = '#98b776';
      write(`MORTIZLE   0${index + 1} / 09`, 30, 389);
    } else {
      if (index === 0 || index === 6) {
        x.fillStyle = '#80a9b2';
        x.fillRect(35, 144, 570, 224);
        x.fillStyle = '#5b7251';
        x.fillRect(35, 319, 570, 49);
        x.fillStyle = '#a0b876';
        x.fillRect(35, 313, 570, 7);
        drawSprite(x, 'gorilla', 160, 293, 3);
        drawSprite(x, 'house', 480, 267, 4);
        for (let j = 0; j < 5; j++)
          drawSprite(x, 'energy', 225 + j * 40, 246, 2);
      } else if (index === 2) {
        for (let j = 0; j < 3; j++)
          for (let i = 0; i < 7; i++)
            drawSprite(x, 'drone', 90 + i * 77, 173 + j * 55, 2);
        drawSprite(x, 'ship', 320, 360, 2);
      } else if (index === 5) {
        drawSprite(x, 'boiler', 320, 251, 7);
      } else if (index === 1) {
        x.strokeStyle = '#677c64';
        x.lineWidth = 8;
        for (let i = 0; i < 8; i++) {
          x.strokeRect(48 + i * 72, 160, 48, 60);
          x.strokeRect(48 + i * 72, 280, 48, 60);
        }
        drawSprite(x, 'pac', 200, 252, 2);
        drawSprite(x, 'drone', 400, 252, 2);
      } else {
        for (let j = 0; j < 5; j++)
          for (let i = 0; i < 9; i++) {
            if ((i + j) % 3 !== 0) {
              x.fillStyle = [game.color, '#739e7a', '#c3af79'][j % 3];
              x.fillRect(140 + i * 40, 157 + j * 35, 32, 28);
            }
          }
      }
      x.fillStyle = game.color;
      x.font = '20px monospace';
      write('APPUYEZ SUR INSÉRER', 180, 429);
      x.fillStyle = '#8b977c';
      x.font = '13px monospace';
      write(
        `MZ-00${index + 1}-FR                   ${game.genre.toUpperCase()}`,
        50,
        462,
      );
    }
    if (cartridge) {
      const picture = document.createElement('canvas');
      picture.width = 570;
      picture.height = 224;
      picture.getContext('2d')!.drawImage(c, 35, 144, 570, 224, 0, 0, 570, 224);
      c.height=Math.round(640*cartridgeSpec.label.size[1]/cartridgeSpec.label.size[0]);
      const printHeight=c.height;
      x.fillStyle = '#171b18';
      x.fillRect(0, 0, 640, printHeight);
      x.drawImage(picture, 0, 0, 570, 224, 20, 15, 600, printHeight*.694);
      x.fillStyle = game.color;
      x.fillRect(20, printHeight*.762, 600, 3);
      x.font = '18px monospace';
      write(game.genre.toUpperCase() + ' / 1 JOUEUR', 24, printHeight*.835);
      x.fillStyle = '#d2c9ae';
      x.font = '13px monospace';
      write('MORTIZLE ARCADE SYSTEM', 24, printHeight*.906);
      x.fillStyle = '#8e927c';
      x.font = '11px monospace';
      write('MZ-00' + (index + 1) + '-FR  ·  PRÊT À JOUER', 24, printHeight*.976);
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.flipY = !gltf;
    return t;
  }, [index, info, gltf, cartridge]);
  useEffect(() => () => tex.dispose(), [tex]);
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          screen: { value: tex },
          time: { value: 0 },
          power: { value: 1 },
          printed: { value: television ? 0 : 1 },
          displayKind: { value: 0 },
        },
        vertexShader: vertex,
        fragmentShader: fragment,
        toneMapped: false,
      }),
    [tex],
  );
  useFrame(({ clock }) => (material.uniforms.time.value = clock.elapsedTime));
  useEffect(() => () => material.dispose(), [material]);
  return material;
}
function Block({
  p = [0, 0, 0],
  s = [1, 1, 1],
  c = '#24211d',
  r = 0.018,
  ...rest
}: any) {
  return (
    <RoundedBox position={p} args={s} radius={r} smoothness={2} {...rest}>
      <meshStandardMaterial color={c} roughness={0.43} metalness={0.25} />
    </RoundedBox>
  );
}
function InkScene() {
  const { scene } = useThree();
  useFrame(() => {
    scene.traverse((o:any) => {
      if(!o.isMesh || o.name==='Ink_Outline')return;
      const materials=Array.isArray(o.material)?o.material:[o.material];
      for(const m of materials)if(m?.isMeshStandardMaterial && !m.userData.inkShaded)inkMaterial(m,false);
    });
  },-2);
  return null;
}
function DiffuseRoomLights(){
 useMemo(()=>RectAreaLightUniformsLib.init(),[]);
 return <>
  <rectAreaLight position={[0,4.8,4.5]} rotation={[-.38,0,0]} color="#ffe4bc" intensity={2.2} width={5.5} height={2.5}/>
  <rectAreaLight position={[-5.8,3.0,-1.0]} rotation={[0,-Math.PI/2,0]} color="#b5d9e4" intensity={1.2} width={3.5} height={3.2}/>
 </>;
}
function LightMotes() {
 const points=useMemo(()=>{
  const positions=new Float32Array(176*3),phases=new Float32Array(176);
  for(let i=0;i<176;i++){
   const hash=(n:number)=>{const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x);};
   positions.set([(hash(i+1)-.5)*14,.3+hash(i+20)*5.6,-5.7+hash(i+70)*8.4],i*3);phases[i]=hash(i+123)*6.28;
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.setAttribute('phase',new THREE.BufferAttribute(phases,1));
  const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,uniforms:{time:{value:0}},vertexShader:`attribute float phase;uniform float time;varying float sparkle;void main(){vec3 p=position;p.y=.3+mod(p.y-.3+time*(.035+.014*sin(phase)),5.6);p.x+=.13*sin(time*.31+phase);p.z+=.09*cos(time*.24+phase);vec4 v=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*v;gl_PointSize=clamp(32./(-v.z),1.6,5.0);sparkle=.48+.22*sin(time*.8+phase);}`,fragmentShader:`varying float sparkle;void main(){float radius=length(gl_PointCoord-.5);float glow=1.-smoothstep(.08,.5,radius);gl_FragColor=vec4(vec3(1.,.88,.65),glow*sparkle);}`});
  return {geometry,material};
 },[]);
 useFrame(({clock})=>{points.material.uniforms.time.value=clock.elapsedTime;});
 useEffect(()=>()=>{points.geometry.dispose();points.material.dispose();},[points]);
 return <points geometry={points.geometry} material={points.material} frustumCulled={false}/>;
}
function CockpitPupitres() {
 const {scene}=useGLTF('/models/midnight-pupitres.glb?v=1');
 const object=useMemo(()=>scene.clone(true),[scene]);
 return <primitive object={object}/>;
}
function SelectionCounter({timeline}:any) {
 const {scene}=useGLTF('/models/midnight-counter.glb?v=3');
 const clone=useMemo(()=>{const c=scene.clone(true);c.traverse((o:any)=>{if(o.isMesh){o.geometry=o.geometry.clone();o.material=o.material.clone();o.frustumCulled=false;}});return c;},[scene]);
 useLayoutEffect(()=>{const plinth=clone.getObjectByName('Display_Plinth');if(plinth)plinth.visible=false;},[clone]);
 return <group dispose={null}>
  <primitive object={clone}/>
 </group>;
}
function Cabinet({index,position,rotation=0,onClick}:any){
 const consoleId=useContext(ConsoleContext),screen=useScreen(index,false,true);
 return <Suspense fallback={null}><EraStation consoleId={consoleId} position={position} rotation={rotation} screen={screen} onClick={onClick}><LegacyCabinet index={index} position={[0,0,0]} rotation={0}/></EraStation></Suspense>;
}
function LegacyCabinet({ index, position, rotation = 0, onClick }: any) {
  const { scene } = useGLTF('/models/midnight-cabinet.glb?v=1');
  const clone = useMemo(() => {
    const c = scene.clone(true);
    c.traverse((o: any) => {
      if (!o.isMesh) return;
      const recolor = (original: THREE.MeshStandardMaterial) => {
        const m = original.clone();
        if (m.name.startsWith('Coque')) m.color.set('#302e28');
        if (m.name.startsWith('Enseigne')) {
          m.color.set('#1f211d');
          m.emissive?.set('#000000');
        }
        return m;
      };
      o.material = Array.isArray(o.material)
        ? o.material.map(recolor)
        : recolor(o.material);
    });
    return c;
  }, [scene]);
  const m = useScreen(index, false, true);
  useEffect(() => {
    clone.traverse((o) => {
      if (o.name === 'CRT_Surface' && (o as THREE.Mesh).isMesh)
        (o as THREE.Mesh).material = m;
    });
  }, [clone, m]);
  return (
    <group position={position} rotation={[0, rotation, 0]} onClick={onClick}>
      <primitive object={clone} />
      <Sign
        text={`GAME 00${index + 1}`}
        width={1.3}
        height={0.26}
        position={[0, 3.035, 0.573]}
        color="#8fe6f2"
      />
    </group>
  );
}
function Sign({
  text,
  width = 3,
  height = 0.5,
  color = '#a6d9ef',
  icon = false,
  clear = false,
  ...props
}: any) {
  const texture = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = icon ? 256 : 1024;
    c.height = icon ? 256 : Math.max(48, Math.round((1024 * height) / width));
    const x = c.getContext('2d')!;
    x.fillStyle = '#111210';
    if (!icon && !clear) x.fillRect(0, 0, c.width, c.height);
    x.fillStyle = color;
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    let font = icon ? 220 : Math.round(c.height * 0.84);
    x.font = `bold ${font}px monospace`;
    while (x.measureText(text).width > 940 && font > 18) {
      font -= 2;
      x.font = `bold ${font}px monospace`;
    }
    if (icon) x.fillText(text, c.width / 2, c.height / 2);
    else
      pixelText(
        x,
        text,
        c.width / 2,
        c.height * 0.9,
        c.height * 0.8,
        c.width * 0.94,
        'center',
      );
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, [text, color, icon, clear, width, height]);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <mesh {...props}>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial
        map={texture}
        transparent={icon || clear}
        toneMapped={false}
      />
    </mesh>
  );
}
const smooth = (x: number) => {
  const t = THREE.MathUtils.clamp(x, 0, 1);
  return t * t * (3 - 2 * t);
};
function CartridgeVisual({id}:{id:number}) {
 const consoleId=useContext(ConsoleContext);
 return <SelectedMedia id={id} consoleId={consoleId}/>;
}
function SelectedMedia({id,consoleId}:{id:number;consoleId:string}){
 const isCase=!!getHardware(consoleId).caseSize;
 const material=useMediaArtwork(id,consoleId,isCase?'case':'cartridge');
 if(isCase)return <HardwareCase consoleId={consoleId} material={material} display/>;
 return <HardwareMedia consoleId={consoleId} material={material} display/>;
}
function LegacyCartridgeVisual({id}:{id:number}) {
  const { scene } = useGLTF(cartridgeSpec.asset);
  const mesh = useMemo(() => {
    const c = scene.clone(true);
    c.traverse((o: any) => {
      if (/Titre.cartouche|Serie.cartouche/i.test(o.name)) o.visible = false;
      if (!o.isMesh) return;
      const copy = (m: any) => {
        const n = m.clone();
        if (n.name.startsWith('Coque')) {
          n.color.set('#f1eee5');
          n.roughness = 0.32;
          n.metalness = 0.03;
        }
        return n;
      };
      o.material = Array.isArray(o.material)
        ? o.material.map(copy)
        : copy(o.material);
    });
    return c;
  }, [scene]);
  const material = useScreen(id, false, false, true);
  return <group>
    <primitive object={mesh}/>
    <mesh position={cartridgeSpec.label.position as [number,number,number]}>
      <planeGeometry args={cartridgeSpec.label.size as [number,number]}/>
      <primitive attach="material" object={material}/>
    </mesh>
    <Sign text={games[id].name} width={cartridgeSpec.title.size[0]} height={cartridgeSpec.title.size[1]} position={cartridgeSpec.title.position} color={games[id].color}/>
    <Sign text={`MZ-00${id+1} / ${games[id].genre.toUpperCase()}`} width={cartridgeSpec.serial.size[0]} height={cartridgeSpec.serial.size[1]} position={cartridgeSpec.serial.position} color="#b3a58a"/>
  </group>;
}
function CartridgeObject({
  id,
  index,
  motion,
  timeline,
  spacing,
  select,
  drag,
  handoff,
  consoleMode=false,
  count=9,
  presentation,
}: any) {
  const { gl } = useThree();
  // React must never write a new target transform over an in-flight object.
  const initial = useRef(slotPose(slotOf(id,index,count),spacing,count));
  const initialPosition = useRef<[number,number,number]>([initial.current.x,initial.current.y,initial.current.z]);
  const root = useRef<THREE.Group>(null),
    pivot = useRef<THREE.Group>(null);
  const box = useMemo(() => new THREE.Box3(), []);
  const safePosition = useMemo(() => new THREE.Vector3(), []),
    safeRotation = useMemo(() => new THREE.Euler(), []);
  const rotation = useRef(new THREE.Vector2());
  const release = () => {
    if (drag.current?.id !== id) return;
    const d = drag.current;
    drag.current = null;
    gl.domElement.style.cursor = '';
    const slot = slotOf(id, index,count);
    if (
      slot !== 0 &&
      Math.abs(d.dx) > 35 &&
      Math.sign(d.dx) === -Math.sign(slot)
    )
      select(id);
    else if (slot === 0) {
      const dir = swipeDirection(d.dx);
      if (dir) select((index + dir + count) % count);
    } else if (Math.abs(d.dx) < 6 && Math.abs(d.dy) < 6 && slot !== 0)
      select(id);
  };
  useEffect(() => {
    const cancel = () => {
      if (drag.current?.id === id) drag.current = null;
      gl.domElement.style.cursor = '';
    };
    window.addEventListener('pointerup', release);
    window.addEventListener('pointercancel', cancel);
    window.addEventListener('blur', cancel);
    return () => {
      window.removeEventListener('pointerup', release);
      window.removeEventListener('pointercancel', cancel);
      window.removeEventListener('blur', cancel);
    };
  }, [id, index, select]);
  useFrame(({ clock }, delta) => {
    const o = root.current,
      p = pivot.current;
    if (!o || !p) return;
    const m = motion.current,
      oldSlot = slotOf(id, m.from,count),
      slot = slotOf(id, index,count);
    if (timeline.current >= 0) { o.visible=false; m.boxes[id].makeEmpty(); return; }
    const dt = Math.min(delta, 0.05),
      active = m.t < m.duration;
    const pos = active
      ? carouselPose(
          oldSlot,
          slot,
          m.t,
          spacing,
          m.starts[id],
          count,
        )
      : slotPose(slot, spacing,count);
    o.visible=Math.abs(pos.x)<7*spacing/2.3;
    if(!o.visible){m.boxes[id].makeEmpty();o.position.set(pos.x,pos.y,pos.z);o.scale.setScalar(pos.scale);m.live[id]={...pos};return;}
    const transition=presentation?.current??STORAGE_DURATION;
    const packing=transition<STORAGE_DURATION;
    if(packing){
      const state=storageItem(transition,slot),q=state.pack;
      o.visible=o.visible&&state.visible;
      pos.x=THREE.MathUtils.lerp(pos.x,slot*.34,q);
      pos.y=THREE.MathUtils.lerp(pos.y,1.31,q)+1.25*Math.sin(Math.PI*q);
      pos.z=THREE.MathUtils.lerp(pos.z,.55,q);
      pos.scale*=1-.77*q;pos.yaw=THREE.MathUtils.lerp(pos.yaw,0,q);
    }
    const d = drag.current?.id === id ? drag.current : null;
    if (d && !active) {
      if (slot === 0) {
        rotation.current.set(
          THREE.MathUtils.clamp(d.dy * 0.007, consoleMode?-.55:-.27, consoleMode?.55:.27),
          THREE.MathUtils.clamp(d.dx * 0.009, consoleMode?-1.15:-.48, consoleMode?1.15:.48),
        );
      } else {
        pos.x += THREE.MathUtils.clamp(d.dx*.007,-spacing,spacing);
        rotation.current.set(
          0,
          THREE.MathUtils.clamp(d.dx * 0.003, -0.25, 0.25),
        );
      }
    } else rotation.current.lerp(new THREE.Vector2(), 1 - Math.exp(-dt * 9));
    if (!active && !d && !packing)
      pos.y += Math.sin(clock.elapsedTime * 0.95 + id * 0.35) * 0.045;
    safePosition.copy(o.position);
    safeRotation.copy(p.rotation);
    if(active||packing){o.position.set(pos.x,pos.y,pos.z);o.scale.setScalar(pos.scale);}
    else {o.position.lerp(new THREE.Vector3(pos.x,pos.y,pos.z),1-Math.exp(-dt*14));o.scale.setScalar(THREE.MathUtils.damp(o.scale.x,pos.scale,18,dt));}
    p.rotation.x = THREE.MathUtils.damp(
      p.rotation.x,
      active ? 0 : rotation.current.x,
      12,
      dt,
    );
    p.rotation.y = THREE.MathUtils.damp(
      p.rotation.y,
      pos.yaw + (active ? 0 : rotation.current.y),
      12,
      dt,
    );
    p.rotation.z = 0;
    o.updateWorldMatrix(true, true);
    box.setFromObject(o);
    if (d && !active) {
      const collision = m.boxes.some(
        (other: THREE.Box3, j: number) =>
          j !== id &&
          !other.isEmpty() &&
          box.intersectsBox(other),
      );
      if (collision) {
        o.position.copy(safePosition);
        p.rotation.copy(safeRotation);
        o.updateWorldMatrix(true, true);
        box.setFromObject(o);
      }
    }
    m.boxes[id].copy(box);
    if(process.env.NODE_ENV==='development' && active)(m.samples[id]??=[]).push(Number(o.position.x.toFixed(5)));
    if(slot===0){
      const origin=new THREE.Vector3(0,-cartridgeSpec.pivot[1],0).applyQuaternion(p.quaternion).add(new THREE.Vector3(0,cartridgeSpec.pivot[1],0)).multiplyScalar(o.scale.x).add(o.position);
      handoff.current={x:origin.x,y:origin.y,z:origin.z,scale:o.scale.x,pitch:p.rotation.x,yaw:p.rotation.y};
    }
    m.live[id] = {
      x: o.position.x,
      y: o.position.y,
      z: o.position.z,
      scale: o.scale.x,
    };
  });
  return (
    <group
      ref={root}
      position={initialPosition.current}
      scale={initial.current.scale}
      onPointerOver={() => {
        if (timeline.current < 0) gl.domElement.style.cursor = 'grab';
      }}
      onPointerOut={() => {
        if (!drag.current) gl.domElement.style.cursor = '';
      }}
      onPointerDown={(e) => {
        if (timeline.current >= 0 || motion.current.t < motion.current.duration || (presentation?.current??STORAGE_DURATION)<STORAGE_DURATION) return;
        e.stopPropagation();
        drag.current = { id, x: e.clientX, y: e.clientY, dx: 0, dy: 0 };
        gl.domElement.style.cursor = 'grabbing';
        (e.target as any).setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (drag.current?.id !== id) return;
        e.stopPropagation();
        drag.current.dx = e.clientX - drag.current.x;
        drag.current.dy = e.clientY - drag.current.y;
      }}
      onPointerUp={(e) => {
        e.stopPropagation();
        release();
        (e.target as any).releasePointerCapture(e.pointerId);
      }}
    >
      <group position={[0, cartridgeSpec.pivot[1], 0]}>
        <group ref={pivot}>
          <group position={[0, -cartridgeSpec.pivot[1], 0]}>
            {consoleMode?<CarouselConsole consoleId={CONSOLES[id].id}/>:<CartridgeVisual id={id}/>}
          </group>
        </group>
      </group>
    </group>
  );
}
function Cartridges({ index, timeline, select, fit, handoff,consoleMode=false,presentation }: any) {
  const count=consoleMode?CONSOLES.length:games.length;
  const drag = useRef<any>(null);
  const renderer=useThree(state=>state.gl);
  const motion = useRef<any>({
    from: index,
    to: index,
    t: SWAP_DURATION,
    duration: SWAP_DURATION,
    live: [],
    starts: [],
    samples: {},
    traceWritten: false,
    boxes: Array.from({ length: count }, () => new THREE.Box3()),
  });
  useLayoutEffect(() => {
    if (motion.current.to !== index) {
      motion.current.starts = Array.from({length:count},(_,id)=>motion.current.live[id]);
      motion.current.samples={};
      motion.current.traceWritten=false;
      motion.current.from = motion.current.to;
      motion.current.to = index;
      motion.current.duration=swapDuration(motion.current.from,index,count);
      motion.current.t = 0;
      drag.current = null;
    }
  }, [index]);
  useFrame((_, dt) => {
    if(process.env.NODE_ENV==='development' && !motion.current.traceWritten && motion.current.t>=motion.current.duration && Object.keys(motion.current.samples).length){renderer.domElement.dataset.carousel=JSON.stringify({from:motion.current.from,to:motion.current.to,samples:motion.current.samples});motion.current.traceWritten=true;}
    motion.current.t = Math.min(
      motion.current.duration,
      motion.current.t + Math.min(dt, 0.05),
    );
  },-1);
  return (
    <>
      {Array.from({length:count},(_, id) => (
        <CartridgeObject
          key={id}
          id={id}
          count={count}
          consoleMode={consoleMode}
          presentation={presentation}
          index={index}
          timeline={timeline}
          select={select}
          spacing={Math.max(2.3 * fit, 1.65)}
          motion={motion}
          drag={drag}
          handoff={handoff}
        />
      ))}
    </>
  );
}
function ModeCarousel({consoleMode,consoleIndex,gameIndex,...props}:any){
 const [shown,setShown]=useState(consoleMode),progress=useRef(STORAGE_DURATION),next=useRef(consoleMode);
 const {gl}=useThree();
 useEffect(()=>{if(next.current!==consoleMode){next.current=consoleMode;progress.current=0;}},[consoleMode]);
 useFrame((_,dt)=>{
  progress.current=Math.min(STORAGE_DURATION,progress.current+Math.min(dt,.05));
  if(progress.current>=STORAGE_SWAP&&shown!==next.current)setShown(next.current);
  if(process.env.NODE_ENV==='development')gl.domElement.dataset.storage=JSON.stringify({time:progress.current,shown:shown?'consoles':'games',requested:next.current?'consoles':'games'});
 },-2);
 return <><Suspense fallback={null}><Cartridges key={shown?'consoles':'games'} {...props} presentation={progress} consoleMode={shown} index={shown?consoleIndex:gameIndex} select={shown?props.selectConsole:props.selectGame}/></Suspense><Suspense fallback={null}><StorageCarton progress={progress} consoleMode={shown}/></Suspense></>;
}
function FittedConsoleBody(){
 const asset=useGLTF(cartridgeSpec.consoleAsset);
 const object=useMemo(()=>{
  const c=asset.scene.clone(true);
  c.traverse((o:any)=>{if(o.isMesh){
   const materials=Array.isArray(o.material)?o.material:[o.material];
   if(materials.some((m:THREE.Material)=>m.name.startsWith('Boutons')))o.visible=false;
  }});
  return c;
 },[asset.scene]);
 return <primitive object={object}/>;
}
function StationSequence(props:any){
 const consoleId=useContext(ConsoleContext);
 return <SelectedHardwareSequence key={consoleId} {...props} consoleId={consoleId}/>;
}
function SelectedHardwareSequence(props:any){
 const onReady=useContext(HardwareReadyContext);
 const screen=useScreen(props.index,false,true,false,true),mediaMaterial=useMediaArtwork(props.index,props.consoleId,getHardware(props.consoleId).media.type==='disc'?'disc':'cartridge');
 const caseMaterial=useMediaArtwork(props.index,props.consoleId,'case');
 return <HardwareSequence {...props} caseMaterial={caseMaterial} onReady={onReady} screen={screen} mediaMaterial={mediaMaterial}/>;
}
function LegacyStationSequence({ index, timeline, handoff }: any) {
  const asset = useGLTF('/models/console-tv-sequence.glb?v=11');
  const onReady=useContext(HardwareReadyContext);
  useEffect(()=>{onReady?.();},[onReady]);
  const renderer=useThree(state=>state.gl);
  const scene = useMemo(() => {
    const c = asset.scene.clone(true);
    c.traverse((o: any) => {
      if (o.isMesh) {
        o.material = o.material.clone();
        if (o.material.name.startsWith('Coque'))
          o.material.color.set('#f1eee5');
      }
      if (/Titre.cartouche|Serie.cartouche/i.test(o.name)) o.visible = false;
    });
    // Replace the complete old cartridge subtree. Labels and shell now share
    // exactly the same visual component as the five displayed cartridges.
    c.getObjectByName('Cartridge_Lift')?.clear();
    const lift=c.getObjectByName('Console_Lift');
    for(const child of [...(lift?.children||[])])if(child.name!=='Console_Play_Button')lift?.remove(child);
    return c;
  }, [asset.scene]);
  const sampler=useMemo(()=>createCartridgeSampler(asset.animations[0]),[asset.animations]);
  const launchPose=useRef<DisplayCartridgePose>({...slotPose(0,2.3),pitch:0});
  const wasRunning=useRef(false);
  const mixer = useMemo(() => new THREE.AnimationMixer(scene), [scene]);
  const action = useMemo(() => {
    const a = mixer.clipAction(asset.animations[0]);
    a.play();
    a.paused = true;
    return a;
  }, [mixer, asset.animations]);
  const screen = useScreen(index, false, true, false, true);
  const preview = useMemo(() => createGamePreview(games[index].id), [index]);
 useEffect(() => () => preview.dispose?.(), [preview]);
  const previewFrame = useRef(0);
  const previewInput = useMemo(
    () => ({
      held: new Set<string>(),
      pressed: new Set<string>(),
      pointer: { x: 0, y: 0, active: false },
    }),
    [],
  );
  const tv = scene.getObjectByName('Television_Lift')!;
  const consoleNode = scene.getObjectByName('Console_Lift')!;
  const cart = scene.getObjectByName('Cartridge_Lift')!;
  useEffect(() => {
    scene.traverse((o: any) => {
      if (o.isMesh && o.name === 'CRT_Television_Screen') o.material = screen;
    });
  }, [scene, screen]);
  useEffect(() => {
    action.play();
    action.paused = true;
    return () => {
      mixer.stopAllAction();
    };
  }, [mixer, action]);
  useFrame((_, delta) => {
    const t = timeline.current;
    const sample =
      t < 0
        ? 0
        : t >= 20
          ? (action.getClip().duration - 0.001) * (1 - returnMechanismProgress(t - 20))
          : Math.min(action.getClip().duration - 0.001, t);
    action.time = sample;
    mixer.update(0);
    if(t>=0 && !wasRunning.current) launchPose.current={...handoff.current};
    wasRunning.current=t>=0;
    const pose=sampler(sample,launchPose.current);
    cart.position.set(pose.x,pose.y,pose.z);
    cart.scale.setScalar(pose.scale);
    cart.rotation.set(pose.pitch,pose.yaw,0);
    consoleNode.visible = t >= 0;
    cart.visible = t >= 0;
    tv.visible = true;
    screen.uniforms.power.value = smooth((sample - 5.25) / 0.54);
    if(process.env.NODE_ENV==='development'){const glass=scene.getObjectByName('CRT_Television_Screen') as THREE.Mesh;renderer.domElement.dataset.sequence=JSON.stringify({sample,power:screen.uniforms.power.value,glass:glass?.visible,material:(glass?.material as THREE.Material)?.type,matched:glass?.material===screen,cartridge:{...pose},cartridgeAsset:cartridgeSpec.asset});}
    if (sample > 5.25) {
      previewFrame.current += delta;
      if (previewFrame.current > 1 / 30) {
        preview.update(Math.min(previewFrame.current, 0.05), previewInput);
        previewFrame.current = 0;
        const tex = screen.uniforms.screen.value as THREE.CanvasTexture,
          c = tex.image as HTMLCanvasElement,
          ctx = c.getContext('2d')!;
        ctx.save();
        ctx.scale(c.width / W, c.height / H);
        preview.draw(ctx);
        ctx.restore();
        tex.needsUpdate = true;
      }
    }
  });
  return (
    <>
      <primitive object={scene} />
      {createPortal(<CartridgeVisual id={index}/>,cart)}
      {createPortal(<FittedConsoleBody/>,consoleNode)}
    </>
  );
}
function RenderMeter() {
  const { gl } = useThree();
  const frames = useRef<number[]>([]),
    last = useRef(0);
  useFrame(({ clock }, dt) => {
    if (process.env.NODE_ENV !== 'development') return;
    frames.current.push(dt * 1000);
    if (clock.elapsedTime - last.current > 2) {
      const values = frames.current.sort((a, b) => a - b);
      gl.domElement.dataset.frameMedianMs = String(
        Math.round(values[Math.floor(values.length / 2)] * 10) / 10,
      );
      gl.domElement.dataset.frameP95Ms = String(
        Math.round(values[Math.floor(values.length * 0.95)] * 10) / 10,
      );
      gl.domElement.dataset.drawCalls = String(gl.info.render.calls);
      gl.domElement.dataset.triangles = String(gl.info.render.triangles);
      frames.current = [];
      last.current = clock.elapsedTime;
    }
  });
  return null;
}
function Reflections() {
  const { gl, scene } = useThree();
  useEffect(() => {
    const generator = new THREE.PMREMGenerator(gl),
      room = new RoomEnvironment();
    const target = generator.fromScene(room, 0.04);
    const previous = scene.environment;
    scene.environment = target.texture;
    scene.environmentIntensity = 0.28;
    room.dispose();
    generator.dispose();
    return () => {
      scene.environment = previous;
      target.dispose();
    };
  }, [gl, scene]);
  return null;
}
function PhysicalButton({ p, label, action, large = false, fit = 1, modeIcon, ariaLabel }: any) {
  const cap = useRef<THREE.Group>(null);
  const asset = useGLTF('/models/midnight-button.glb?v=1');
  const icons=useGLTF('/models/button-icons.glb?v=2');
  const icon=useMemo(()=>icons.scene.getObjectByName(large?'Play_Relief':label==='❮'?'Chevron_Left':'Chevron_Right')!.clone(true),[icons.scene,large,label]);
  const parts = useMemo(() => {
    const base = asset.scene.getObjectByName('Button_Base')!.clone(true);
    const top = asset.scene.getObjectByName('Button_Cap')!.clone(true);
    top.traverse((o: any) => {
      if (o.isMesh) {
        o.material = o.material.clone();
        o.material.color.set(large ? '#67ddeb' : '#b0b3cf');
        o.material.envMapIntensity = 1.35;
      }
    });
    return { base, top };
  }, [asset.scene, large]);
  const hovered = useRef(false),
    pressed = useRef(false),
    pressUntil = useRef(0),
    lastActivation = useRef(-1000);
  useEffect(() => {
    const release = () => {
      pressed.current = false;
    };
    window.addEventListener('pointerup', release);
    window.addEventListener('pointercancel', release);
    window.addEventListener('blur', release);
    return () => {
      window.removeEventListener('pointerup', release);
      window.removeEventListener('pointercancel', release);
      window.removeEventListener('blur', release);
    };
  }, []);
  const press = () => {
    pressed.current = true;
    pressUntil.current = performance.now() + 150;
    lastActivation.current = performance.now();
    action();
  };
  useFrame((_, delta) => {
    if (!cap.current) return;
    const down = pressed.current || performance.now() < pressUntil.current;
    cap.current.position.y = THREE.MathUtils.damp(
      cap.current.position.y,
      down ? -0.047 : hovered.current ? 0.05 : 0,
      down ? 38 : 18,
      Math.min(delta, 0.05),
    );
  });
  return (
    <group
      position={p}
      scale={large ? [1.86, 1.38 * fit, 1.86 * fit] : [1.38, 1.38 * fit, 1.38 * fit]}
      onPointerOver={() => {
        hovered.current = true;
      }}
      onPointerOut={() => {
        hovered.current = false;
      }}
      onPointerDown={(e) => {
        e.stopPropagation();
        press();
      }}
    >
      <primitive object={parts.base} />
      <group ref={cap}>
        <primitive object={parts.top} />
        {modeIcon?<Sign text={modeIcon} width={.19} height={.19} position={[0,.148,0]} rotation={[-Math.PI/2,0,0]} color="#152032" clear/>:<primitive object={icon} />}
      </group>
      <Html
        transform
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.175, 0]}
        distanceFactor={2}
      >
        <button
          className={'world-button ' + (large ? 'large' : '')}
          style={{ color: 'transparent' }}
          onPointerEnter={() => {
            hovered.current = true;
          }}
          onPointerLeave={() => {
            hovered.current = false;
          }}
          onFocus={() => {
            hovered.current = true;
          }}
          onBlur={() => {
            hovered.current = false;
            pressed.current = false;
          }}
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            press();
          }}
          onClick={(e) => {
            e.stopPropagation();
            if (
              e.detail === 0 ||
              performance.now() - lastActivation.current > 500
            ) {
              press();
              pressed.current = false;
            }
          }}
          aria-label={ariaLabel??(
            large
              ? 'Jouer au jeu sélectionné'
              : label === '❮'
                ? 'Jeu précédent'
                : 'Jeu suivant')
          }
        >
          {label}
        </button>
      </Html>
    </group>
  );
}
function Camera({
  timeline,
  launching,
  onEntered,
  onWarp,
  index,
  exploring,
  moveInput,
  exiting,
  onExited,
  onTimeline,
}: any) {
  const { camera, size } = useThree();
  const consoleId=useContext(ConsoleContext);
  const elapsed = useRef(-1),
    fired = useRef(false),
    indexTime = useRef(0);
  const look = useRef(new THREE.Vector3(0, 1.65, 0.25));
  const oldIndex = useRef(index);
  const keys = useRef(new Set<string>()),
    yaw = useRef(0),
    pitch = useRef(0),
    walkPos = useRef(new THREE.Vector3(5.0, 1.8, 0.3)),
    drag = useRef(false),
    enterTime = useRef(0);
  useEffect(() => {
    if (!exploring) return;
    enterTime.current = 0;
    walkPos.current.set(5.0, 1.8, 0.3);
    yaw.current = 0.35;
    pitch.current = 0;
    const keydown = (e: KeyboardEvent) => {
      if (
        [
          'w',
          'a',
          's',
          'd',
          'z',
          'q',
          'ArrowUp',
          'ArrowDown',
          'ArrowLeft',
          'ArrowRight',
        ].includes(e.key)
      ) {
        e.preventDefault();
        keys.current.add(e.key);
      }
    };
    const up = (e: KeyboardEvent) => keys.current.delete(e.key);
    const down = (e: PointerEvent) => {
      if ((e.target as HTMLElement).tagName === 'CANVAS') drag.current = true;
    };
    const pointerup = () => (drag.current = false);
    const move = (e: PointerEvent) => {
      if (drag.current) {
        yaw.current -= e.movementX * 0.0035;
        pitch.current = THREE.MathUtils.clamp(
          pitch.current - e.movementY * 0.003,
          -0.95,
          0.95,
        );
      }
    };
    const blur = () => {
      keys.current.clear();
      drag.current = false;
    };
    window.addEventListener('keydown', keydown);
    window.addEventListener('keyup', up);
    window.addEventListener('pointerdown', down);
    window.addEventListener('pointerup', pointerup);
    window.addEventListener('pointermove', move);
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('keydown', keydown);
      window.removeEventListener('keyup', up);
      window.removeEventListener('pointerdown', down);
      window.removeEventListener('pointerup', pointerup);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('blur', blur);
      keys.current.clear();
      drag.current = false;
    };
  }, [exploring]);
  useEffect(() => {
    elapsed.current = -1;
    fired.current = false;
    timeline.current = -1;
  }, [launching, exiting, timeline]);
  useFrame(({ clock }, delta) => {
    const dt = Math.min(delta, 0.05),
      portrait = size.width / size.height < 1,
      homeZ = portrait ? 12.6 : 9.05,
      cam = camera as THREE.PerspectiveCamera;
    if(process.env.NODE_ENV==='development'){
      const query=new URLSearchParams(window.location.search),at=query.get('sequenceTime');
      if(query.has('inspectHardware')&&at!==null&&getHardware(consoleId)){
        const time=Math.max(0,Math.min(7.6,Number(at)||0)),pose=hardwareCamera(getHardware(consoleId),time,portrait);
        timeline.current=time;camera.position.set(...pose.position);camera.lookAt(...pose.look);cam.fov=pose.fov;cam.updateProjectionMatrix();return;
      }
    }
    if (oldIndex.current !== index) {
      oldIndex.current = index;
      indexTime.current = clock.elapsedTime;
    }
    if (exiting) {
      if (elapsed.current < 0) elapsed.current = 0;
      elapsed.current += dt;
      const t = elapsed.current,
        a = returnCameraProgress(t);
      timeline.current = 20 + t;
      camera.position.set(
        THREE.MathUtils.lerp(-0.18, 0, a),
        THREE.MathUtils.lerp(3.03, portrait ? 4.4 : 4.15, a),
        THREE.MathUtils.lerp(-1.41, homeZ, a),
      );
      look.current.set(
        THREE.MathUtils.lerp(-0.18, 0, a),
        THREE.MathUtils.lerp(3.03, 1.65, a),
        THREE.MathUtils.lerp(-1.67, 0.25, a),
      );
      if(getHardware(consoleId)){
        const end=hardwareCamera(getHardware(consoleId),HARDWARE_DURATION,portrait);
        camera.position.set(...end.position).lerp(new THREE.Vector3(0,portrait?4.4:4.15,homeZ),a);
        look.current.set(...end.look).lerp(new THREE.Vector3(0,1.65,.25),a);
      }
      camera.lookAt(look.current);
      cam.fov = THREE.MathUtils.lerp(64, portrait ? 53 : 46, a);
      cam.updateProjectionMatrix();
      onTimeline?.(t, true);
      if (t >= RETURN_DURATION) onExited();
    } else if (launching) {
      if (elapsed.current < 0) elapsed.current = 0;
      elapsed.current += dt;
      const t = elapsed.current;
      timeline.current = t;
      const focus = smooth(t / 1.5),
        pan = smooth((t - 3.7) / 1.7);
      // Stay above the inserted cartridge before descending into the television glass.
      const z = THREE.MathUtils.lerp(homeZ, 5.0, focus);
      const base = new THREE.Vector3(
        0,
        THREE.MathUtils.lerp(portrait ? 4.4 : 4.15, 4.15, focus),
        z,
      );
      if(t>4.75){
        const hop=smooth((t-4.75)/1.05), plunge=smooth((t-5.95)/1.65);
        camera.position.set(THREE.MathUtils.lerp(0,-.18,hop),THREE.MathUtils.lerp(4.15,3.03,hop),t<5.95?THREE.MathUtils.lerp(5,1.35,hop):THREE.MathUtils.lerp(1.35,-1.41,plunge));
      } else camera.position.copy(base);
      look.current.set(
        THREE.MathUtils.lerp(0, -0.18, pan),
        THREE.MathUtils.lerp(THREE.MathUtils.lerp(1.65, 1.8, focus), 3.03, pan),
        THREE.MathUtils.lerp(
          THREE.MathUtils.lerp(0.25, -0.48, focus),
          -1.67,
          pan,
        ),
      );
      camera.lookAt(look.current);
      cam.fov = THREE.MathUtils.lerp(
        portrait ? 53 : 46,
        64,
        smooth((t - 6.8) / 0.8),
      );
      if(getHardware(consoleId)){
        const pose=hardwareCamera(getHardware(consoleId),t,portrait);
        camera.position.set(...pose.position);look.current.set(...pose.look);camera.lookAt(look.current);cam.fov=pose.fov;
      }
      cam.updateProjectionMatrix();
      onTimeline?.(t, false);
      if (t >= 6.75 && !fired.current) {
        fired.current = true;
        onWarp();
      }
      if (t >= 7.6) {
        elapsed.current = -100;
        onEntered();
      }
    } else if (exploring) {
      timeline.current = -1;
      enterTime.current += dt;
      const h = keys.current;
      const forward =
        Number(h.has('w') || h.has('z') || h.has('ArrowUp')) -
        Number(h.has('s') || h.has('ArrowDown')) +
        (moveInput?.current?.forward || 0);
      const side =
        Number(h.has('d') || h.has('ArrowRight')) -
        Number(h.has('a') || h.has('q') || h.has('ArrowLeft')) +
        (moveInput?.current?.side || 0);
      const norm = Math.max(1, Math.hypot(forward, side));
      const dx =
          ((Math.cos(yaw.current) * side - Math.sin(yaw.current) * forward) *
            dt *
            2.25) /
          norm,
        dz =
          ((-Math.sin(yaw.current) * side - Math.cos(yaw.current) * forward) *
            dt *
            2.25) /
          norm;
      const valid = (x: number, z: number) => {
        if (Math.abs(x) > 8 || z > 4.8 || z < -5.6) return false;
        if (Math.abs(x) < 4.75 && z > 2.45 && z < 4.75) return false;
        if (Math.abs(x) < 1.2 && z > .55 && z < 2.50) return false;
        if (timeline.current>=0 && Math.abs(x) < 1.9 && z > -3.3 && z < 0.85) return false;
        if (x > 3.9 && x < 6.5 && z > -2.65 && z < -1.05) return false;
        for (const [cx, cz] of [
          [-4.8, -5.5],
          [0, -4.35],
          [4.8, -5.5],
          [-7, -3],
          [-7, 0],
          [-7, 3],
          [7, -3],
          [7, 0],
          [7, 3],
        ])
          if (Math.abs(x - cx) < 1.18 && Math.abs(z - cz) < 1.05) return false;
        return true;
      };
      const p = walkPos.current;
      if (valid(p.x + dx, p.z)) p.x += dx;
      if (valid(p.x, p.z + dz)) p.z += dz;
      const blend = 1 - Math.exp(-dt * 4);
      camera.position.lerp(p, blend);
      const lookTarget = new THREE.Vector3(
        camera.position.x - Math.sin(yaw.current) * Math.cos(pitch.current) * 3,
        camera.position.y + Math.sin(pitch.current) * 3,
        camera.position.z - Math.cos(yaw.current) * Math.cos(pitch.current) * 3,
      );
      look.current.lerp(lookTarget, 1 - Math.exp(-dt * 10));
      camera.lookAt(look.current);
      cam.fov = THREE.MathUtils.lerp(cam.fov, 62, blend);
      cam.updateProjectionMatrix();
    } else {
      timeline.current = -1;
      // The selection station is fixed: only exploration and cinematics move the view.
      const a = 1 - Math.exp(-dt * 4.5);
      camera.position.lerp(
        new THREE.Vector3(0, portrait ? 4.4 : 4.15, homeZ),
        a,
      );
      look.current.lerp(new THREE.Vector3(0, 1.65, 0.25), a);
      camera.lookAt(look.current);
      cam.fov = THREE.MathUtils.lerp(cam.fov, portrait ? 53 : 46, a);
      cam.updateProjectionMatrix();
    }
  });
  return null;
}
const friendClocks=new WeakMap<{current:number},number>();
function LobbyFriends({ timeline }: { timeline: { current: number } }) {
  const hero = useRef<THREE.Group>(null), yeti = useRef<THREE.Group>(null);
  const elapsed = useRef(friendClocks.get(timeline)??0), lastTelemetry = useRef(0), telemetryClock=useRef(0);
  const starting=useRef({hero:friendPose('hero',elapsed.current),yeti:friendPose('yeti',elapsed.current)});
  const initialPositions=useRef({hero:[starting.current.hero.x,0,starting.current.hero.z] as [number,number,number],yeti:[starting.current.yeti.x,0,starting.current.yeti.z] as [number,number,number]});
  const evacuation = useRef<null|{hero:THREE.Vector3;yeti:THREE.Vector3}>(null);
  const renderer = useThree(s=>s.gl);
  const [states,setStates] = useState({hero:friendPose('hero',elapsed.current),yeti:friendPose('yeti',elapsed.current)});
  const current = useRef(states);
  const heroCadence=useRef(1),yetiCadence=useRef(1);
  useFrame((_,dt)=>{
    dt=Math.min(dt,.05);
    const active=timeline.current>=0;
    if(!active && !evacuation.current)elapsed.current+=dt;
    friendClocks.set(timeline,elapsed.current);
    if(active && !evacuation.current && hero.current && yeti.current){
      const clear=(p:THREE.Vector3)=>new THREE.Vector3(Math.abs(p.x)<2.15?(p.x>=0?2.7:-2.7):p.x,0,p.z);
      evacuation.current={hero:clear(hero.current.position),yeti:clear(yeti.current.position)};
    }
    const next={hero:friendPose('hero',elapsed.current),yeti:friendPose('yeti',elapsed.current)};
    for(const [name,object] of [['hero',hero.current],['yeti',yeti.current]] as const){
      if(!object)continue;
      const pose=next[name];object.userData.highFiveTime=pose.gestureTime;
      if(evacuation.current){
        const target=active?evacuation.current[name]:new THREE.Vector3(pose.x,0,pose.z);
        const delta=target.clone().sub(object.position),distance=delta.length();
        if(distance>.012){
          const angle=Math.atan2(delta.x,delta.z);
          object.rotation.y+=Math.atan2(Math.sin(angle-object.rotation.y),Math.cos(angle-object.rotation.y))*Math.min(1,dt*12);
          object.position.addScaledVector(delta,Math.min(distance,4*dt)/distance);pose.action='Run';pose.rate=1;
        }else{
          object.position.copy(target);pose.action='Idle';pose.rate=1;
          if(!active)object.rotation.y+=Math.atan2(Math.sin(pose.yaw-object.rotation.y),Math.cos(pose.yaw-object.rotation.y))*Math.min(1,dt*8);
        }
      }else{object.position.set(pose.x,0,pose.z);object.rotation.y=pose.yaw;}
      pose.x=object.position.x;pose.z=object.position.z;
    }
    if(evacuation.current && !active){
      const hp=friendPose('hero',elapsed.current),yp=friendPose('yeti',elapsed.current);
      const aligned=(o:THREE.Group,p:ReturnType<typeof friendPose>)=>Math.hypot(o.position.x-p.x,o.position.z-p.z)<.015 && Math.abs(Math.atan2(Math.sin(p.yaw-o.rotation.y),Math.cos(p.yaw-o.rotation.y)))<.02;
      if(hero.current && yeti.current && aligned(hero.current,hp) && aligned(yeti.current,yp))evacuation.current=null;
    }
    heroCadence.current=next.hero.rate;yetiCadence.current=next.yeti.rate;
    if(next.hero.action!==current.current.hero.action || next.yeti.action!==current.current.yeti.action){current.current=next;setStates(next);}
    telemetryClock.current+=dt;
    if(process.env.NODE_ENV==='development' && telemetryClock.current-lastTelemetry.current>.25){
      renderer.domElement.dataset.friends=JSON.stringify({time:elapsed.current,...next});lastTelemetry.current=telemetryClock.current;
    }
  },-2);
  return <>
    <group ref={yeti} name="Lobby_Raphael" position={initialPositions.current.yeti}>
      <mesh rotation={[-Math.PI/2,0,0]} position={[0,.012,0]} scale={[.46,.36,1]}><circleGeometry args={[1,24]}/><meshBasicMaterial color="#11151a" transparent opacity={.2} depthWrite={false}/></mesh>
      <Yeti action={states.yeti.action} cadence={yetiCadence} scale={1.6}/>
    </group>
    <group ref={hero} name="Lobby_Hero" position={initialPositions.current.hero}>
      <mesh rotation={[-Math.PI/2,0,0]} position={[0,.012,0]} scale={[.42,.36,1]}><circleGeometry args={[1,24]}/><meshBasicMaterial color="#11151a" transparent opacity={.2} depthWrite={false}/></mesh>
      <Yeti hero action={states.hero.action} cadence={heroCadence} scale={1.6}/>
    </group>
  </>;
}

function useConsoleInfo(id:string){
 const material=useMemo(()=>{
  const c=document.createElement('canvas');c.width=900;c.height=410;const x=c.getContext('2d')!,device=getConsole(id as any);
  x.fillStyle='#0b1321';x.fillRect(0,0,900,410);
  x.fillStyle='#6ddbea';pixelText(x,'CHOIX DE LA CONSOLE',28,44,24,840);
  x.fillStyle='#bcefff';pixelText(x,device.name.toUpperCase(),28,127,56,840);
  x.fillStyle='#6ddbea';x.fillRect(28,145,844,3);
  pixelText(x,device.insertion.toUpperCase(),28,210,26,840);
  x.fillStyle='#c3cada';pixelText(x,'GLISSEZ POUR CHANGER DE MACHINE',28,287,22,840);
  pixelText(x,'JEUX / CHOISIR : RETOUR AUX JEUX',28,333,22,840);
  x.fillStyle='#7debab';pixelText(x,'LES 9 JEUX MORTIZLE VOUS ATTENDENT',28,384,20,840);
  const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;return new THREE.MeshBasicMaterial({map,toneMapped:false});
 },[id]);useEffect(()=>()=>{material.map?.dispose();material.dispose();},[material]);return material;
}
function Room({
  consoleMode=false,
  onConsoleModeChange,
  onSelectConsole,
  consoleId='n64',
  index,
  select,
  onPlay,
  launching,
  onEntered,
  onWarp,
  exploring,
  moveInput,
  exiting,
  onExited,
  onTimeline,
}: any) {
  const gameInfo = useScreen(index, true);
  const consoleInfo=useConsoleInfo(consoleId);
  const info=consoleMode?consoleInfo:gameInfo;
  const displayedIndex=consoleMode?CONSOLES.findIndex(c=>c.id===consoleId):index;
  const selectDisplayed=(n:number)=>consoleMode?onSelectConsole?.(CONSOLES[n].id):select(n);
  const { size } = useThree();
  const deskFit = Math.min(1, Math.max(0.49, size.width / size.height / 1.65));
  const timeline = useRef(-1);
  const handoff=useRef<DisplayCartridgePose>({...slotPose(0,2.3),pitch:0});
  const colliders = useRef([
    new THREE.Box3(new THREE.Vector3(-3, 0, 0), new THREE.Vector3(-1.15, 3, 2)),
    new THREE.Box3(new THREE.Vector3(1.15, 0, 0), new THREE.Vector3(3, 3, 2)),
  ]);
  return (
    <>
      <Reflections />
      <InkScene />
      <RenderMeter />
      <Camera
        exiting={exiting}
        onExited={onExited}
        onTimeline={onTimeline}
        exploring={exploring}
        moveInput={moveInput}
        index={index}
        timeline={timeline}
        launching={launching}
        onEntered={onEntered}
        onWarp={onWarp}
      />
      <MidnightRoom />
      <Sign
        text="MORTIZLE"
        width={8.9}
        height={1.05}
        color="#a6e8ff"
        position={[0, 4.82, -6.043]}
      />
      <Sign
        text="ARCADE ENTERTAINMENT SYSTEM"
        width={4.1}
        height={0.17}
        position={[0, 4.23, -6.02]}
        color="#91b5d6"
      />
      <Cabinet
        index={(index + 8) % 9}
        position={[-4.8, 0, -5.5]}
        rotation={0.16}
        onClick={() => select((index + 8) % 9)}
      />

      <Cabinet
        index={(index + 1) % 9}
        position={[4.8, 0, -5.5]}
        rotation={-0.16}
        onClick={() => select((index + 1) % 9)}
      />
      {[-1, 1].map((side) => (
        <group key={side}>
          {(exploring ? [-3, 0, 3] : [-3]).map((z, j) => (
            <Cabinet
              key={z}
              index={(j + (side < 0 ? 0 : 3)) % 9}
              position={[side * 7, 0, z]}
              rotation={(-side * Math.PI) / 2}
              onClick={() => select((j + (side < 0 ? 0 : 3)) % 9)}
            />
          ))}
          <Sign
            text={side < 0 ? 'INSERT COIN' : 'POWER ON'}
            width={1.4}
            height={0.3}
            position={[side * 6, 3.6, -6.12]}
            color={side < 0 ? '#9aad7a' : '#d3bc7d'}
          />
          <Block p={[side * 6, 0.8, -4.9]} s={[0.75, 1.6, 0.45]} c="#211f1a" />
          {Array.from({ length: 12 }, (_, i) => (
            <group
              key={i}
              position={[
                side * 6 + ((i % 3) - 1) * 0.2,
                0.26 + Math.floor(i / 3) * 0.36,
                -4.65,
              ]}
            >
              <Block s={[0.14, 0.27, 0.035]} c={games[i % 9].color} />
            </group>
          ))}

        </group>
      ))}
      {[-1, 1].map((side) => (
        <group key={'poster' + side}>
          <group position={[side * 5.85, 4.0, -6.15]}>
            <Block s={[1.8, 2.15, 0.06]} c="#151a30" />
            <Block p={[0, 1.065, 0.045]} s={[1.8, 0.025, 0.03]} c="#70bcf2" />
            <Sign
              text={side < 0 ? 'MARIOMORTILLE' : 'PACMORILLE'}
              width={1.55}
              height={0.24}
              position={[0, 0.82, 0.041]}
            />
            <Block p={[0, 0.02, 0.06]} s={[0.57, 0.84, 0.04]} c="#c8d5e5" />
            <Block p={[0, 0.13, 0.084]} s={[0.45, 0.26, 0.01]} c="#8b74e6" />
            <Block p={[0, -0.14, 0.084]} s={[0.45, 0.22, 0.01]} c="#272d28" />
            <Sign
              text={side < 0 ? 'GAME 001' : 'GAME 002'}
              width={1.5}
              height={0.24}
              position={[0, -0.72, 0.041]}
              color="#bdb7a6"
            />
          </group>
        </group>
      ))}
      <SelectionCounter timeline={timeline}/>
      <group scale={[deskFit, 1, 1]}>
        <Sign
          text="MORTIZLE  SELECTION STATION"
          width={3.55}
          height={0.22}
          position={[-1.78, 0.34, 4.431]}
          color="#9e927d"
          clear
        />
        <Sign
          text="MODÈLE MZ-CNT-01   ·   230V — 50HZ"
          width={3.55}
          height={0.14}
          position={[-1.78, 0.12, 4.433]}
          color="#645f52"
          clear
        />
        <Sign
          text="POWER"
          width={0.86}
          height={0.21}
          position={[1.12, 0.34, 4.432]}
          color="#b59be5"
          clear
        />
        <Sign
          text="READY"
          width={0.86}
          height={0.21}
          position={[2.23, 0.34, 4.432]}
          color="#7ca14f"
          clear
        />
        <CockpitPupitres />
        <group position={[-1.92, 1.36, 3.82]} rotation={[-0.68, 0, 0]}>
          <mesh position={[-.32, 0, 0.096]}>
            <planeGeometry args={[2.53, 1.00]} />
            <primitive attach="material" object={info} />
          </mesh>
          {[false,true].map((isConsole)=><group key={String(isConsole)} position={[1.36,isConsole?-.29:.28,.14]}>
            <group rotation={[Math.PI/2,0,0]} scale={.62}><PhysicalButton fit={deskFit} p={[0,0,0]} modeIcon={isConsole?'C':'J'} label={isConsole?'CONSOLES':'JEUX'} ariaLabel={isConsole?'Choisir une console':'Choisir un jeu'} action={()=>{if(timeline.current<0)onConsoleModeChange?.(isConsole);}}/></group>
            <Sign text={isConsole?'CONSOLES':'JEUX'} width={.55} height={.073} position={[0,-.225,.012]} color={consoleMode===isConsole?'#82edff':'#969db1'} clear/>
          </group>)}
        </group>
      </group>
      <ModeCarousel
        consoleIndex={CONSOLES.findIndex(c=>c.id===consoleId)}
        gameIndex={index}
        selectConsole={(n:number)=>onSelectConsole?.(CONSOLES[n].id)}
        selectGame={select}
        consoleMode={consoleMode}
        index={displayedIndex}
        timeline={timeline}
        select={selectDisplayed}
        fit={deskFit}
        handoff={handoff}
      />
      <Suspense fallback={null}><StationSequence index={index} timeline={timeline} handoff={handoff} /></Suspense>
      <group
        position={[2.0 * deskFit, 1.23, 3.9]}
        scale={[deskFit, 1, 1]}
        rotation={[0.65, 0, 0]}
      >
        <PhysicalButton
          fit={deskFit}
          p={[-0.82, 0.105, -0.15]}
          label="❮"
          ariaLabel={consoleMode?'Console précédente':'Jeu précédent'}
          action={() => selectDisplayed((displayedIndex + (consoleMode?7:8)) % (consoleMode?8:9))}
        />
        <PhysicalButton
          fit={deskFit}
          p={[-0.18, 0.105, -0.15]}
          label="❯"
          ariaLabel={consoleMode?'Console suivante':'Jeu suivant'}
          action={() => selectDisplayed((displayedIndex + 1) % (consoleMode?8:9))}
        />
        <PhysicalButton
          fit={deskFit}
          p={[0.78, 0.12, -0.15]}
          large
          label="▶"
          ariaLabel={consoleMode?'Choisir cette console et revenir aux jeux':'Jouer au jeu sélectionné'}
          action={onPlay}
        />
        <Sign
          text="PRÉC. SUIV."
          width={1.3}
          height={0.24}
          position={[-0.49, 0.086, 0.44]}
          rotation={[-Math.PI / 2, 0, 0]}
          color="#cfc9b9"
          clear
        />
        <Sign
          text={consoleMode?"CHOISIR":"INSÉRER"}
          width={1.02}
          height={0.26}
          position={[0.8, 0.086, 0.44]}
          rotation={[-Math.PI / 2, 0, 0]}
          color="#7fe4ed"
          clear
        />
      </group>
      <LobbyFriends timeline={timeline} />
      <CucuSteve timeline={timeline} />
      <Mango timeline={timeline} />
      <Ben timeline={timeline} />
      <SocialPhysics timeline={timeline}/>
    </>
  );
}
class Boundary extends Component<{ children: ReactNode }, { bad: boolean }> {
  state = { bad: false };
  static getDerivedStateFromError() {
    return { bad: true };
  }
  render() {
    return this.state.bad ? (
      <div className="scene-loading">
        La 3D n’est pas disponible sur cet appareil.
        <br />
        Utilisez le sélecteur de cartouches pour jouer.
      </div>
    ) : (
      this.props.children
    );
  }
}
export default function Immersive(props: {
  consoleId?: string;
  consoleMode?:boolean;
  onConsoleModeChange?:(mode:boolean)=>void;
  onSelectConsole?:(id:string)=>void;
  onReady?: ()=>void;
  index: number;
  select: (n: number) => void;
  onPlay: () => void;
  launching: boolean;
  onEntered: () => void;
  onWarp: () => void;
  exploring: boolean;
  moveInput: any;
  exiting: boolean;
  onExited: () => void;
  onTimeline: (t: number, exiting: boolean) => void;
}) {
  return (
    <Boundary>
      <Canvas
        shadows
        resize={{ offsetSize: true, debounce: 0 }}
        camera={{ position: [0, 4.15, 9.05], fov: 46 }}
        dpr={[1, 1.7]}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
      >
        <ConsoleContext.Provider value={process.env.NODE_ENV==='development'&&typeof window!=='undefined'?(new URLSearchParams(window.location.search).get('inspectHardware')??props.consoleId??'n64'):(props.consoleId??'n64')}><HardwareReadyContext.Provider value={props.onReady}><Room {...props} /></HardwareReadyContext.Provider></ConsoleContext.Provider>
      </Canvas>
    </Boundary>
  );
}
