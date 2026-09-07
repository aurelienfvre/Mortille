'use client';
import {Suspense,useEffect,useRef,useState} from 'react';
import {Canvas,useThree} from '@react-three/fiber';
import {OrbitControls} from '@react-three/drei';
import {useSearchParams} from 'next/navigation';
import Character from '../reference-character';
import {CAST_STRIDE,type CastMember} from '../character-expression';
const names:Record<CastMember,string>={aurelien:'Aurélien',julien:'Julien / Pote Cucu',raphael:'Raphaël',ben:'Ben',mango:'Mango',steve:'Steve'};
function View({direction,member}:{direction:string;member:CastMember}){
  const {camera}=useThree(),controls=useRef<any>(null);
  const height=member==='raphael'?1.02:member==='mango'?.38:member==='steve'?.2:.79;
  useEffect(()=>{
    const r=member==='steve'?1.35:member==='mango'?2.5:member==='raphael'?4.4:3.65;
    const a=direction==='Profil'?Math.PI/2:direction==='Dos'?Math.PI:direction==='Trois quarts'?.55:0;
    camera.position.set(Math.sin(a)*r,height,Math.cos(a)*r);camera.lookAt(0,height,0);
    if(controls.current){controls.current.target.set(0,height,0);controls.current.update();}
  },[camera,direction,member,height]);
  return <OrbitControls ref={controls} target={[0,height,0]}/>;
}
export default function Atelier(){
  const params=useSearchParams(),initial=params.get('personnage') as CastMember;
  const [member,setMember]=useState<CastMember>(initial&&names[initial]?initial:'aurelien'),[action,setAction]=useState('Idle'),[paused,setPaused]=useState(false),[blink,setBlink]=useState(-1),[expression,setExpression]=useState('Auto'),[direction,setDirection]=useState('Trois quarts');
  const motion=useRef({speed:0,paused});motion.current={speed:action==='Walk'?CAST_STRIDE[member].walk:CAST_STRIDE[member].run,paused};
  if(process.env.NODE_ENV!=='development')return null;
  const clips=member==='steve'?['Idle','Walk','Fall','Held','Kiss']:member==='mango'?['Idle','Walk','Run','Sit']:['Idle','Walk','Run','Dance','HighFive','Wave',...(member==='julien'?['Catch']:[])];
  return <main style={{height:'100vh',background:'#263445',color:'white'}}>
    <div style={{position:'absolute',zIndex:2,top:12,left:12,right:12,display:'flex',flexWrap:'wrap',gap:10,alignItems:'center',padding:12,background:'#111d2de6',borderRadius:12,font:'13px system-ui'}}>
      <label>Personnage <select aria-label="Personnage" value={member} onChange={e=>{setMember(e.target.value as CastMember);setAction('Idle');}}>{Object.entries(names).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
      <label>Animation <select aria-label="Animation" value={action} onChange={e=>setAction(e.target.value)}>{clips.map(x=><option key={x}>{x}</option>)}</select></label>
      <label>Expression <select aria-label="Expression" value={expression} onChange={e=>setExpression(e.target.value)}>{['Auto','Neutral','Smile','MouthOpen','TongueOut'].map(x=><option key={x}>{x}</option>)}</select></label>
      <label>Vue <select aria-label="Vue" value={direction} onChange={e=>setDirection(e.target.value)}>{['Face','Trois quarts','Profil','Dos'].map(x=><option key={x}>{x}</option>)}</select></label>
      <button onClick={()=>setPaused(v=>!v)}>{paused?'Reprendre':'Pause'}</button>
      <button onClick={()=>setBlink(v=>v===1?0:1)}>{blink===1?'Ouvrir les yeux':'Fermer les yeux'}</button>
      <button onClick={()=>setBlink(-1)}>Clignements auto</button>
      <a href="/" style={{color:'#89efff'}}>Salle d’arcade</a>
    </div>
    <Canvas camera={{position:[2,1,4],fov:34}} shadows dpr={[1,1.5]}>
      <color attach="background" args={['#344354']}/><ambientLight intensity={1.5}/>
      <directionalLight position={[-3,5,4]} intensity={2.3} castShadow/><directionalLight position={[3,3,-3]} color="#afdfff" intensity={1.6}/>
      <Suspense fallback={null}><Character key={member} variant={member} action={action} motion={motion} facePreview={blink} expressionPreview={expression}/></Suspense>
      <mesh rotation={[-Math.PI/2,0,0]} receiveShadow><planeGeometry args={[20,20]}/><meshStandardMaterial color="#465867" roughness={1}/></mesh>
      <View direction={direction} member={member}/>
    </Canvas>
  </main>;
}
