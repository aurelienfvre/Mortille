'use client';
import {useGLTF} from '@react-three/drei';
import {useFrame} from '@react-three/fiber';
import {useMemo,useEffect,useRef,useState} from 'react';
import {clone} from 'three/examples/jsm/utils/SkeletonUtils.js';
import {AnimationMixer,LoopOnce,LoopRepeat,Quaternion,Vector3} from 'three';
import {Gamepad,createConsolePose,restoreConsolePose,consolePose} from './playing-console';
import {danceStyle,DANCE_STYLES} from './dance-style';
import {relaxWalkingElbow} from './walk-arms';
import {createTurnPlant,restoreTurnPlant,applyTurnPlant} from './turn-plant';
import {addCharacterInk} from './ink-shading';
import {CastMember,CAST_MODELS,castModelUrl,CAST_STRIDE,characterExpression,createExpressionRig,applyExpression} from './character-expression';

/** The supplied models share a rig contract, without replacing their geometry or textures. */
export default function ReferenceCharacter({walking=false,hero=false,variant,action,motion,animationRate=1,cadence,clipTimeRef,facePreview=-1,expressionPreview,...props}:any){
  const id:CastMember=variant==='cucu'?'julien':variant||(hero?'aurelien':'raphael');
  const model=CAST_MODELS[id],asset=useGLTF(castModelUrl(id));
  const scene=useMemo(()=>addCharacterInk(clone(asset.scene)),[asset.scene]);
  const rig=useMemo(()=>{
    const mixer=new AnimationMixer(scene);
    const actions=Object.fromEntries(asset.animations.map(clip=>[clip.name,mixer.clipAction(clip)]));
    return {mixer,actions};
  },[asset.animations,scene]);
  const face=useMemo(()=>({
    ...createExpressionRig(scene),head:scene.getObjectByName('head'),
    base:new Quaternion(),saved:false,yaw:0,pitch:0,q:new Quaternion(),up:new Vector3(0,1,0),side:new Vector3(1,0,0),
  }),[scene]);
  const fingers=useMemo(()=>{const list:any[]=[];scene.traverse(b=>{const match=/^finger_(\d+)_(\d+)_([LR])$/.exec(b.name);if(match)list.push({bone:b,digit:Number(match[1]),joint:Number(match[2]),side:match[3],base:b.quaternion.clone()});});return list;},[scene]);
  const consoleRig=useMemo(()=>createConsolePose(scene),[scene]);
  const turnPlant=useMemo(()=>createTurnPlant(scene),[scene]);
  const [greeting,setGreeting]=useState(false);
  const requested=action||(walking?'Walk':'Idle'),chosen=greeting&&requested==='Idle'?'Wave':requested,name=rig.actions[chosen]?chosen:'Idle';
  const life=useMemo(()=>({lastYaw:NaN,turn:0,lastGreeting:-20,danceIndex:({aurelien:0,ben:1,julien:2,raphael:3,mango:0,steve:0}[id]),dancing:false,danceAge:0,playAge:0,point:new Vector3(),direction:new Vector3(),
    bones:['handL','handR','spine','forearmL','forearmR','upper_armL','upper_armR'].map(n=>({bone:scene.getObjectByName(n),base:new Quaternion(),saved:false})),
  }),[scene]);
  const lastTelemetry=useRef(-1),faceClock=useRef(0);
  useEffect(()=>{
    const active=rig.actions[name],once=name==='Catch'||name==='Fall'||name==='Kiss'||name==='HighFive'||name==='Wave';
    active?.reset().setLoop(once?LoopOnce:LoopRepeat,once?1:Infinity).fadeIn(.32).play();
    if(active){
      active.clampWhenFinished=once;
      if(name==='Idle')active.time=({aurelien:.17,julien:.31,raphael:.57,ben:1.23,mango:.8,steve:.1}[id]);
    }
    return ()=>{active?.fadeOut(.32);};
  },[rig,name,id]);
  useEffect(()=>()=>{rig.mixer.stopAllAction();rig.mixer.uncacheRoot(scene);},[rig,scene]);

  // Controllers sample at -2; the entire skeleton is ready before the dog reads the palms at 0.
  useFrame((state,delta)=>{
    const dt=Math.min(delta,.05),active=rig.actions[name];
    restoreConsolePose(consoleRig);restoreTurnPlant(turnPlant);
    for(const b of life.bones)if(b.bone&&b.saved)b.bone.quaternion.copy(b.base);
    if(face.head&&face.saved)face.head.quaternion.copy(face.base);
    if(active){
      let rate=cadence?.current??animationRate;
      if(motion){
        const speed=Math.abs(motion.current.speed),scale=typeof props.scale==='number'?props.scale:1;
        rate=motion.current.paused?0:name==='Walk'?speed/(CAST_STRIDE[id].walk*scale):name==='Run'?speed/(CAST_STRIDE[id].run*scale):1;
      }else if(cadence){
        // Lobby controllers express cadence relative to the common .4 / 2.5 m/s gait.
        if(name==='Walk')rate*=.4/CAST_STRIDE[id].walk;
        if(name==='Run')rate*=2.5/CAST_STRIDE[id].run;
      }
      // Gestures retain their authored duration; no more squeezing Dance into a walk cycle.
      active.timeScale=Number.isFinite(rate)?Math.max(0,rate):1;
      active.paused=!!clipTimeRef;
      if(clipTimeRef)active.time=Math.max(0,Math.min(active.getClip().duration,clipTimeRef.current));
    }
    rig.mixer.update(dt);
    if(!motion?.current?.paused)faceClock.current+=dt;
    const pose=characterExpression(id,faceClock.current,name);
    const actor=scene.parent?.parent,now=state.clock.elapsedTime;
    if(actor){
      actor.userData.castAction=requested;actor.userData.sceneTime=now;
      if((actor.userData.bumpUntil??0)>now)pose.pitch+=.14*Math.sin(Math.PI*(now-actor.userData.bumpStart)/.8);
      actor.getWorldDirection(life.direction);const yaw=Math.atan2(life.direction.x,life.direction.z);
      const velocity=Number.isFinite(life.lastYaw)?Math.atan2(Math.sin(yaw-life.lastYaw),Math.cos(yaw-life.lastYaw))/Math.max(dt,.001):0;
      life.lastYaw=yaw;life.turn+=(Math.max(-1.4,Math.min(1.4,velocity))-life.turn)*(1-Math.exp(-dt*5));
      let nearest:any=null,distance=3.8;
      for(const peerName of ['Lobby_Hero','Lobby_Raphael','Lobby_Cucu','Lobby_Ben']){
        const peer=state.scene.getObjectByName(peerName);if(!peer||peer===actor)continue;
        peer.getWorldPosition(life.point);actor.worldToLocal(life.point);const d=life.point.length();
        if(d<distance){nearest=peer;distance=d;}
      }
      if(id==='ben'&&requested==='Idle'&&now-life.lastGreeting>18&&faceClock.current>1&&nearest?.userData.castAction==='Idle'){
        actor.userData.waveAt=now;actor.userData.waveUntil=now+3.2;
        nearest.userData.waveAt=now+.6;nearest.userData.waveUntil=now+3.8;life.lastGreeting=now;
      }
      const waving=requested==='Idle'&&now>=(actor.userData.waveAt??Infinity)&&now<(actor.userData.waveUntil??0);
      if(waving!==greeting)setGreeting(waving);
      if(nearest&&(requested==='Idle'||name==='Wave')){
        nearest.getWorldPosition(life.point);actor.worldToLocal(life.point);
        pose.yaw=Math.max(-.38,Math.min(.38,Math.atan2(life.point.x,life.point.z)))*.65;
      }
      if(requested!=='Catch'&&requested!=='HighFive')pose.yaw-=life.turn*.09;
    }
    life.playAge=requested==='Play'?life.playAge+dt:0;
    if(name==='Dance'&&!life.dancing)life.danceIndex=(life.danceIndex+1)%4;
    life.dancing=name==='Dance';life.danceAge=life.dancing?life.danceAge+dt:0;
    const dancePose=danceStyle(life.danceIndex,life.danceAge),danceWeight=Math.min(1,life.danceAge/.4);
    // Relaxed wrists and a slight torso follow-through; authored contact poses stay exact.
    for(const [i,b] of life.bones.entries())if(b.bone){
      b.base.copy(b.bone.quaternion);b.saved=true;
      if(requested==='Catch'||requested==='HighFive'||requested==='Play')continue;
      const t=faceClock.current,phase=t*(name==='Walk'?4.1:1.35)+i*2.3;
      if(i>=5){
        if(name==='Dance')b.bone.quaternion.multiply(face.q.setFromAxisAngle(face.side,(i===5?dancePose.left:dancePose.right)*danceWeight));
        continue;
      }
      if(i>=3){
        if(actor&&requested!=='Catch'){
          const gait=(active?.time??t)*Math.PI*2/(active?.getClip().duration??1.6)+(i%2===1?0:Math.PI);
          const side=i===3?'L':'R',upper=scene.getObjectByName('upper_arm'+side),hand=scene.getObjectByName('hand'+side);
          if(upper&&hand)relaxWalkingElbow(upper,b.bone,hand,actor,gait);
        }
        continue;
      }
      const turnStep=name==='Idle'?Math.min(1,Math.abs(life.turn))*Math.max(0,Math.sin(t*7+(i%2)*Math.PI)):0;
      const a=i<2?.055*Math.sin(phase)+.025*Math.sin(phase*.43):i===2?-.035*life.turn:(i<5?.035:.065)*turnStep;
      const dance=name==='Dance'?(i<2?dancePose.wrist:dancePose.twist)*danceWeight:0;
      b.bone.quaternion.multiply(face.q.setFromAxisAngle(i<2?face.up:face.side,a+dance));
    }
    if(name==='Dance')pose.pitch+=dancePose.lean*danceWeight;
    if(facePreview>=0)pose.blink=facePreview;
    if(expressionPreview==='Neutral'){pose.smile=0;pose.mouth=0;pose.tongue=0;}
    if(expressionPreview==='Smile')pose.smile=1;
    if(expressionPreview==='MouthOpen')pose.mouth=1;
    if(expressionPreview==='TongueOut'){pose.mouth=.85;pose.tongue=1;}
    applyExpression(face,pose);
    if(face.head){
      face.yaw+=(pose.yaw-face.yaw)*(1-Math.exp(-dt*5));face.pitch+=(pose.pitch-face.pitch)*(1-Math.exp(-dt*5));
      face.base.copy(face.head.quaternion);face.saved=true;
      face.head.quaternion.multiply(face.q.setFromAxisAngle(face.up,face.yaw)).multiply(face.q.setFromAxisAngle(face.side,face.pitch));
    }
    for(const f of fingers){
      const t=faceClock.current,phase=t*1.7+f.digit*.8+(f.side==='L'?0:1.2);
      const curl=requested==='Play'?.38+.09*Math.sin(t*7+f.digit):requested==='HighFive'?.025:requested==='Catch'?.12:name==='Wave'?.12+.09*Math.sin(t*7+f.digit):name==='Walk'||name==='Run'?.28+.045*Math.sin(phase):.20+.045*Math.sin(phase);
      f.bone.quaternion.copy(f.base).multiply(face.q.setFromAxisAngle(face.side,curl*(f.joint===1?1.4:.85)));
    }
    if(actor){
      applyTurnPlant(turnPlant,actor,dt,requested);
      if(requested==='Play')consolePose(consoleRig,actor,life.playAge);

    }
    if(process.env.NODE_ENV==='development'&&state.clock.elapsedTime-lastTelemetry.current>.08){
      const key=id==='aurelien'?'hero':id==='julien'?'cucu':id;
      state.gl.domElement.dataset[key+'Model']=model;
      state.gl.domElement.dataset[key+'Face']=JSON.stringify({...pose,meshes:face.targets.length,closedCount:face.closedCount,closedFrames:face.closedFrames,clip:name,dance:name==='Dance'?DANCE_STYLES[life.danceIndex]:null});
      lastTelemetry.current=state.clock.elapsedTime;
    }
  },-1);
  return <group {...props} dispose={null}><primitive object={scene}/><Gamepad actor={null} active={requested==='Play'}/></group>;
}
