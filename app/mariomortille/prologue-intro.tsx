'use client';
import { prologueActionFinished, prologueDialogueReady } from './prologue-timeline';
/* oxlint-disable next/no-img-element -- Existing transparent pixel PNGs use nearest sampling. */
import { memo, useEffect, useRef, useState, type CSSProperties } from 'react';
import { bitmapText, menuIdleFrame } from './menu-art';
import styles from './prologue-intro.module.css';
import { mangoStoryMotion, steveStoryMotion } from './dog-story-motion';
import { leadStoryMotion } from './lead-story-motion';
import { companionStoryMotion } from './companion-story-motion';
import { currentStoryAssets, currentStoryFrame } from './current-story-art';
import { raphStoryAssets, raphStoryFrame, raphPickupContact } from './raph-story-art';
import { currentSteveStoryAssets, steveCapturePlacement, steveStandaloneVisible } from './current-steve-story-art';
import { preloadStoryImages } from './story-assets';
import { prologueScenes, sceneStart, tickPrologue } from './prologue-timeline';

export type StorySound = 'step' | 'surprise' | 'dash';
export type PrologueIntroProps = { onComplete: () => void; onSkip?: () => void; onSound?: (cue: StorySound) => void };
const sceneEnds = prologueScenes.map(scene=>scene.end);
const PixelText = memo(function PixelText({ children }: { children: string }) { const art = bitmapText(children); return <svg aria-hidden="true" viewBox={`0 0 ${art.width} 7`} style={{width:`calc(${art.width}px * var(--text-scale, 2))`,height:'calc(7px * var(--text-scale, 2))'}} shapeRendering="crispEdges">{art.pixels.map((p, i) => <rect key={i} {...p} width="1" height="1" fill="currentColor" />)}</svg>; });
function PixelSentence({text,visible}:{text:string;visible:number}) {let offset=0; return <p className={styles.sentence}><span className={styles.srOnly}>{text}</span><span aria-hidden="true" className={styles.words}>{text.split(' ').map((word,i)=>{const start=offset;offset+=word.length+1;return <span key={i} style={{position:'relative',display:'inline-flex'}}><span style={{visibility:'hidden'}}><PixelText>{word}</PixelText></span><span style={{position:'absolute',inset:0,overflow:'hidden',width:`calc(${Math.max(0,bitmapText(word.slice(0,Math.max(0,visible-start))).width-2)}px * var(--text-scale, 2))`}}><PixelText>{word}</PixelText></span></span>;})}</span></p>;}

const assets = ['aurelien', 'julien', 'ben', 'raphael', 'mango'].flatMap(c => Array.from({ length: 8 }, (_, i) => `/mariomortille/story/${c}-idle-${String(i + 1).padStart(2, '0')}.png`)).concat(['aurelien', 'raphael'].flatMap(c => Array.from({ length: 8 }, (_, i) => `/mariomortille/story/${c}-run-${String(i + 1).padStart(2, '0')}.png`)));

export default function PrologueIntro({ onComplete, onSkip, onSound }: PrologueIntroProps) {
 const [dogStride, setDogStride] = useState(4);
 const [viewport,setViewport] = useState({width:960,height:600});
 const [raphReply, setRaphReply] = useState(false), replyStarted = useRef(0);
 const [loadFailed,setLoadFailed]=useState(false),[loadAttempt,setLoadAttempt]=useState(0);
 const [scene,setScene]=useState(0),[revealed,setRevealed]=useState(false),[ambient,setAmbient]=useState(0);
 const beatRef=useRef(0),ambientClock=useRef(0),dialogueStarted=useRef<number|null>(null);
 const [elapsed, setElapsed] = useState(0), [ready, setReady] = useState(false), [reduced, setReduced] = useState(false);
 const clock = useRef(0), finished = useRef(false), lastStep = useRef(-1), previousScene = useRef(-1), root = useRef<HTMLDivElement>(null);
 const callbacks = useRef({ onComplete, onSkip, onSound });
 useEffect(() => { callbacks.current = { onComplete, onSkip, onSound }; }, [onComplete, onSkip, onSound]);
 useEffect(() => {
  let cancelled = false; root.current?.focus(); setReady(false); setLoadFailed(false);
  const size = () => { const el = root.current; if (!el) return; setViewport({width:el.clientWidth,height:el.clientHeight}); const actorSize = parseFloat(getComputedStyle(el).getPropertyValue('--story-actor-size')) || 96; setDogStride(24 * actorSize / 96 / Math.max(1, el.clientWidth) * 100); };
  size(); const observer = new ResizeObserver(size); if (root.current) observer.observe(root.current);
  const motion = matchMedia('(prefers-reduced-motion: reduce)'); const change = () => setReduced(motion.matches); change(); motion.addEventListener('change', change);
  preloadStoryImages([...currentStoryAssets, ...raphStoryAssets, ...currentSteveStoryAssets, '/mariomortille/story/retro/village.png', ...[1,2,3].map(n=>`/mariomortille/menu/cloud-${n}.png`), ...[...assets, ...['idle','walk','run'].flatMap(action=>Array.from({length:8},(_,i)=>`/mariomortille/characters/steve/${action}-${String(i+1).padStart(2,'0')}.png?v=steve-size-2`)), ...['julien','ben'].flatMap(c=>Array.from({length:4},(_,i)=>`/mariomortille/characters/${c}/hurt-${String(i+1).padStart(2,'0')}.png`))]]).then(() => { if (!cancelled) setReady(true); }).catch(() => { if (!cancelled) setLoadFailed(true); });
  return () => { cancelled = true; motion.removeEventListener('change', change); observer.disconnect(); };
 }, [loadAttempt]);
 useEffect(() => {
  if (!ready) return;
  let animation = 0, last = performance.now();
  const update = (now: number) => {
   if (finished.current) return;
   const dt = Math.min(64, now - last); last = now;
   if (!document.hidden) { clock.current = tickPrologue(clock.current,beatRef.current,dt); ambientClock.current += dt; setAmbient(ambientClock.current); }
   if (dialogueStarted.current===null && prologueDialogueReady(clock.current,beatRef.current,reduced)) dialogueStarted.current=ambientClock.current;
   setElapsed(clock.current);
   const beat = beatRef.current;
   if (beat !== previousScene.current) { previousScene.current = beat; if (beat === 1 || beat === 2) callbacks.current.onSound?.('surprise'); if (beat === 4) callbacks.current.onSound?.('dash'); }
   if (clock.current > 14000) { const step = Math.floor((clock.current - 14000) / 170); if (step !== lastStep.current) { lastStep.current = step; callbacks.current.onSound?.('step'); } }

   if(beat===4 && prologueActionFinished(clock.current,beat)){finished.current=true;callbacks.current.onComplete();return;}
   animation = requestAnimationFrame(update);
  };
  animation = requestAnimationFrame(update); return () => cancelAnimationFrame(animation);
 }, [ready,reduced]);
 const line = scene === 1 && raphReply ? {speaker:'RAPH', text:'À vos ordres ! Viens ici, petit chien.'} : prologueScenes[scene];
 const visible = scene === 1 && raphReply ? revealed || reduced ? line.text.length : Math.min(line.text.length, Math.floor((ambient - replyStarted.current) / 28)) : revealed || reduced ? line.text.length : Math.min(line.text.length,Math.floor(Math.max(0,ambient-(dialogueStarted.current??ambient))/28));
 const advance = () => {
  if (!ready || finished.current || !prologueDialogueReady(elapsed,scene,reduced)) return;
  if (visible < line.text.length) {setRevealed(true);return;}
  if (scene === 1 && !raphReply) {setRaphReply(true);replyStarted.current=ambient;setRevealed(false);return;}
  if (!prologueActionFinished(elapsed,scene)) return;
  if (scene === 4) {finished.current=true;callbacks.current.onComplete();return;}
  const next=scene+1;dialogueStarted.current=null;beatRef.current=next;clock.current=sceneStart(next);setElapsed(clock.current);setRevealed(false);setScene(next);
 };
 const skip = () => { if (finished.current) return; finished.current = true; (callbacks.current.onSkip ?? callbacks.current.onComplete)(); };
 const idle = reduced ? 1 : menuIdleFrame(ambient) + 1;
 const steve = steveStoryMotion(elapsed, reduced, dogStride * 14 / 24, 8);
 const mango = mangoStoryMotion(elapsed, 8, reduced, dogStride);
 const actors = [
  { id: 'ben', lift: 0, ...companionStoryMotion('ben', elapsed, reduced, dogStride * 32 / 24) },
  { id: 'julien', lift: 0, ...companionStoryMotion('julien', elapsed, reduced, dogStride * 32 / 24) },
  { id: 'aurelien', lift: 0, ...leadStoryMotion('aurelien', elapsed, reduced, dogStride * 54 / 24) },
  { id: 'mango', ...mango, action: mango.moving ? 'trot' : 'idle' },
  { id: 'raphael', lift: 0, ...leadStoryMotion('raphael', elapsed, reduced, dogStride * 48 / 24) },
  { id: 'steve', ...steve, action: steve.moving ? 'walk' : 'idle' },
 ];
 const speakerId = ({JUJU:'julien', BEN:'ben', AURELIEN:'aurelien', MANGO:'mango', RAPH:'raphael'} as Record<string,string>)[line.speaker];
 const speakingActor = actors.find(actor=>actor.id===speakerId);
 const bubbleWidth=Math.min(viewport.height<=480?340:viewport.width<=700?270:380,viewport.width-32);
 const speakerX=Math.max(8,Math.min(92,speakingActor?.x??50))*viewport.width/100;
 const bubbleLeft=Math.max(16,Math.min(viewport.width-bubbleWidth-16,speakerX-bubbleWidth/2));
 const bubbleStyle = {'--bubble-width': `${bubbleWidth}px`, '--bubble-left': `${bubbleLeft}px`, '--tail-x':`${Math.max(16,Math.min(bubbleWidth-32,speakerX-bubbleLeft-8))}px`} as CSSProperties;
 return <div ref={root} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Prologue : sauver Steve" className={styles.intro} onKeyDown={event => { if ((event.key === 'Enter' || event.key === ' ') && (event.target as HTMLElement).closest('button')) { event.stopPropagation(); return; } if (event.key === 'Enter' || event.key === ' ' || event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); if (event.repeat) return; if (event.key === 'Escape') skip(); else if(loadFailed) setLoadAttempt(n=>n+1); else advance(); } }}>
  <div className={styles.world} aria-hidden="true" />
  <div className={styles.clouds} aria-hidden="true">{[1,2,3].map((cloud,i)=><img key={cloud} src={`/mariomortille/menu/cloud-${cloud}.png`} alt="" draggable={false} style={{left:`${reduced ? [10,49,82][i] : (([10,49,82][i] + ambient / (1250+i*400)) % 135)-15}%`,top:`${[17,28,12][i]}%`}}/>)}</div>
  <header className={styles.header}><div><PixelText>PROLOGUE</PixelText><span className={styles.srOnly}>Prologue</span></div><div className={styles.chapter}><PixelText>{`0${scene+1}/05`}</PixelText></div><button type="button" onClick={skip} aria-label="Passer le prologue"><PixelText>PASSER</PixelText></button></header>
  <div className={styles.cast} aria-hidden="true" style={{visibility:ready?'visible':'hidden'}}>{actors.map(actor => {
   if (actor.id === 'steve' && !steveStandaloneVisible(elapsed)) return null;
   const style = { left: `${actor.x}%`, marginBottom: `calc(var(--story-actor-size) * ${actor.lift / 174})` };
   if (actor.id === 'raphael') {
    const contact = raphPickupContact(elapsed,actor.frame);
    const dog = steveCapturePlacement(contact.frame, contact);
    const layer = (x: number, y: number) => ({position:'absolute' as const, left:`${x/96*100}%`, top:`${y/96*100}%`, width:'100%', height:'100%'});
    return <div key={actor.id} className={styles.actor} style={style}><div style={{position:'relative',width:'100%',height:'100%',transform:elapsed<7600?'scaleX(-1)':'none'}}>
     <img src={raphStoryFrame(actor.action, actor.frame, elapsed, ambient,reduced)} alt="" draggable={false}/>
     {elapsed >= 6500 && <><img src={dog.src} alt="" draggable={false} style={layer(dog.x,dog.y)}/><img src={contact.arms} alt="" draggable={false} style={layer(0,0)}/></>}
    </div></div>;
   }
   const src = currentStoryFrame(actor.id, actor.action, actor.frame, elapsed, ambient, reduced) ?? (actor.id === 'steve' ? `/mariomortille/characters/steve/${actor.action}-${String(actor.action === 'idle' ? idle : actor.frame).padStart(2, '0')}.png?v=steve-size-2` : actor.action !== 'idle' && (actor.id === 'ben' || actor.id === 'julien' || actor.id === 'mango') ? `/mariomortille/characters/${actor.id}/${actor.action}-${String(actor.frame).padStart(2, '0')}.png` : `/mariomortille/story/${actor.id}-${actor.action}-${String(actor.action === 'idle' ? idle : actor.frame).padStart(2, '0')}.png`);
   return <div key={actor.id} className={styles.actor} style={style}><img src={src} alt="" draggable={false} style={{transform: actor.id === 'mango' && mango.facing < 0 ? 'scaleX(-1)' : undefined}}/></div>;
  })}</div>
  {(loadFailed || ready&&prologueDialogueReady(elapsed,scene,reduced)&&(scene!==4||elapsed<17500)) && <div className={styles.dialogue} style={bubbleStyle} aria-live="polite" aria-atomic="true"><strong><PixelText>{ready ? line.speaker : 'UN INSTANT'}</PixelText><span className={styles.srOnly}>{ready ? line.speaker : 'Un instant'}</span></strong><PixelSentence text={ready ? line.text : loadFailed ? 'Chargement interrompu. Reessayons !' : 'Le quartier se reveille.'} visible={ready?visible:99}/><button type="button" onClick={loadFailed?()=>setLoadAttempt(n=>n+1):advance} disabled={(!ready&&!loadFailed)||(ready&&visible===line.text.length&&!(scene===1&&!raphReply)&&!prologueActionFinished(elapsed,scene))} aria-label={loadFailed?'Réessayer le chargement':visible<line.text.length?'Afficher le dialogue':scene === 4 ? 'Commencer' : 'Continuer'}><PixelText>{loadFailed?'REESSAYER':visible<line.text.length?'LIRE':scene === 4 ? 'COMMENCER' : 'CONTINUER'}</PixelText><span className={styles.nextArrow} aria-hidden="true"/></button></div>}
  <div className={styles.progress} aria-hidden="true">{sceneEnds.map((_, i) => <i key={i} className={i <= scene ? styles.seen : ''} />)}</div>
 </div>;
}
