'use client';
import {encounterMusic} from './music';
import { useEffect, useRef, useState } from 'react';
import type { Player, Power } from './simulation';
import type { Bridge } from './scene';
import { quartierLevels } from './levels';
import { prologueLevel, prologueHints } from './prologue-level';
import { AdventureAudio } from './audio';
import { RankedRun, arcadeRequest } from './ranked-run';
import HouseVisit from './house-visit';
import { useHouseDoorway } from './use-house-doorway';
import doorwayStyles from './house-doorway.module.css';
import PrologueIntro from './prologue-intro';
import PauseMenu from './pause-menu';
import type { PartyId } from './party';
import AdventureHud from './adventure-hud';
import { pixelDisplay } from './pixel-display';
import TitleMenu from './title-menu';
import StageResult from './stage-result';
import CampaignEnding from './campaign-ending';
import { completeStage, progressKey, readProgress, unlockedThrough, type CampaignProgress } from './progress';
const levelIds = quartierLevels.map(level => level.id);
const powerNames = { none: 'AUCUN', turbo: 'BASKETS TURBO', ember: 'GANT BRAISE', cloud: 'VESTE NUAGE', cobalt: 'CARAPACE COBALT' };
export default function Mariomortille({ onExit, muted = false }: { onExit: () => void; muted?: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const outdoorAppearance = useRef<Pick<Player, 'power' | 'health'> & {character?:PartyId}>({ power: 'none', health: 3 });
  const [house, setHouse] = useState(false);
  const doorway = useHouseDoorway(setHouse);
  const [houseError, setHouseError] = useState(false);
  const [intro, setIntro] = useState(false);
  const [menuPage, setMenuPage] = useState<'main'|'campaign'>('main');
  const [mapNode, setMapNode] = useState(0);
  const returnToMap = () => { setMapNode(mode === 'prologue' ? 0 : levelIndex + 1); setMenuPage('campaign'); setPhase('menu'); };
  const [phase, setPhase] = useState<'menu' | 'play' | 'pause' | 'finish' | 'ending'>('menu');
  const [levelIndex, setLevelIndex] = useState(0);
  const [prologueCompleted, setPrologueCompleted] = useState(false);
  useEffect(() => { try { setPrologueCompleted(localStorage.getItem('mariomortille-prologue-complete') === '1'); } catch {} }, []);
  const [mode, setMode] = useState<'campaign' | 'prologue'>('campaign');
  const currentLevel = mode === 'prologue' ? prologueLevel : quartierLevels[levelIndex];
  const [round, setRound] = useState(0);
  const ranked = useRef<RankedRun | null>(null);
  const completedRun = useRef(false);
  const pendingSave = useRef<Promise<void> | null>(null);
  const generation = useRef(0);
  const startingRef = useRef(false);
  const [starting, setStarting] = useState(false);
  const [rankMessage, setRankMessage] = useState('');
  const [saveFailed, setSaveFailed] = useState(false);
  useEffect(() => () => { generation.current++; ranked.current = null; }, []);
  const submitScore = () => {
    const run = ranked.current; if (!run) return;
    setRankMessage('Enregistrement du score…'); setSaveFailed(false);
    pendingSave.current = run.finish().then(result => {
      if (ranked.current === run) setRankMessage(`Score enregistré : ${result.score} points.`);
    }).catch(error => { if (ranked.current === run) { setRankMessage(error.message); setSaveFailed(true); } });
  };
  const [savedLevel, setSavedLevel] = useState<number | null>(null);
  const [progress, setProgress] = useState<CampaignProgress>({ version: 1, completed: [] });
  useEffect(() => { const timer = setTimeout(() => {
    try { setProgress(readProgress(localStorage.getItem(progressKey), levelIds)); } catch { /* Local saves are optional. */ }
  }, 0); return () => clearTimeout(timer); }, []);
  useEffect(() => {
    if (!progress.completed.length) return;
    try { localStorage.setItem(progressKey, JSON.stringify(progress)); } catch { /* Keep this session playable. */ }
  }, [progress]);
  useEffect(() => {
    const controller = new AbortController();
    void arcadeRequest<{ progress: { gameId: string; levelId: string }[] }>('session', undefined, controller.signal).then(data => {
      const remote = data.progress.filter(row => row.gameId === 'mario').map(row => row.levelId);
      setProgress(previous => readProgress(JSON.stringify({ version: 1, completed: [...previous.completed, ...remote] }), levelIds));
    }).catch(() => { /* Device-local progress stays playable offline. */ });
    return () => controller.abort();
  }, []);
  const audioUnlock = useRef<Promise<void> | null>(null);
  useEffect(() => { const timer = setTimeout(() => { try { const value = localStorage.getItem('mariomortille-last-level'); if (value !== null && Number.isInteger(Number(value)) && Number(value) >= 0 && Number(value) < quartierLevels.length) setSavedLevel(Number(value)); } catch { /* Storage can be disabled. */ } }, 0); return () => clearTimeout(timer); }, []);
  const [partyInfo,setPartyInfo]=useState<{active:PartyId;members:PartyId[]}>({active:'aurel',members:['aurel']});
  const [hud, setHud] = useState({ score: 0, power: 'AUCUN', checkpoint: false, health: 3, secrets: 0, bossHealth: -1, bossName:'RAPHAEL', x: 0, powerId: 'none' as Power, dashCooldown: 0, ticks: 0 });
  const audio = useRef<AdventureAudio | null>(null);
  const [musicVolume, setMusicVolume] = useState(.25);
  const [effectsVolume, setEffectsVolume] = useState(.8);
  const bridge = useRef<Bridge>({ paused: true, muted, pause: () => {}, update: () => {}, sound: () => {} });
  useEffect(() => {
  bridge.current.paused = phase !== 'play' || house || doorway.active;
  bridge.current.visitHouse = () => { bridge.current.paused = true; setHouseError(false); doorway.request(true); }; bridge.current.muted = muted;
  bridge.current.pause = () => setPhase(p => p === 'play' ? 'pause' : p === 'pause' ? 'play' : p);
  bridge.current.party = (active,members)=>setPartyInfo({active,members});
  bridge.current.update = state => {
    audio.current?.setTheme(encounterMusic(state.boss));
    outdoorAppearance.current = { power: state.player.power, health: state.player.health, character:partyInfo.active };
    if (state.won || state.ticks % 6 === 0 || state.events.length) setHud({ score: state.score, power: powerNames[state.player.power], checkpoint: state.checkpoint, health: state.player.health, secrets: state.pickups.filter(i => i.kind === 'secret' && i.collected).length, bossHealth: state.boss?.health ?? -1, bossName:state.boss?.kind==='pirate'?'PIRATE':state.boss?.kind==='lola'?'LOLA':state.boss?.kind==='mango'?'MANGO':'RAPHAEL', x: state.player.x, powerId: state.player.power, dashCooldown: state.player.dashCooldown, ticks: state.ticks });
    if (state.won && !completedRun.current) {
      completedRun.current = true; bridge.current.paused = true;
      if (mode === 'prologue') { setPrologueCompleted(true); try { localStorage.setItem('mariomortille-prologue-complete', '1'); } catch { /* Optional local record. */ } }
      else { setProgress(previous => completeStage(previous, levelIds[levelIndex], levelIds)); submitScore(); }
      setPhase(mode === 'campaign' && levelIndex === quartierLevels.length - 1 ? 'ending' : 'finish');
    }
  };
  bridge.current.sound = event => audio.current?.play(event);
  bridge.current.record = input => ranked.current?.record(input);
  }, [phase, muted, levelIndex, mode, house, doorway.active, doorway.request]);
  useEffect(() => {
    let resizeObserver: ResizeObserver | undefined;
    let disposed = false; let game: { destroy: (children: boolean) => void } | undefined;
    void Promise.all([import('phaser'), import('./scene')]).then(([Phaser, { createScene }]) => {
      if (disposed || !host.current) return;
      const view = pixelDisplay(host.current.clientWidth,host.current.clientHeight,window.devicePixelRatio);
      const instance = new Phaser.Game({ type: Phaser.AUTO, parent: host.current, width: 640, height: 360, canvasStyle: 'image-rendering: pixelated;', pixelArt: true, roundPixels: true, antialias: false, scale: { mode: Phaser.Scale.NONE, zoom:view.zoom, autoCenter: Phaser.Scale.CENTER_BOTH }, scene: createScene(bridge.current, currentLevel), audio: { noAudio: true }, input: { keyboard: true } });
      game = instance;
      const resize = () => {
        if (!host.current) return;
        const v = pixelDisplay(host.current.clientWidth,host.current.clientHeight,window.devicePixelRatio);
        if (instance.canvas) instance.scale.setZoom(v.zoom);
        const el = host.current.parentElement;
        el?.style.setProperty('--playfield-top',`${v.top}px`);
        el?.style.setProperty('--playfield-height',`${v.height}px`);
        el?.style.setProperty('--playfield-left',`${v.left}px`);
      };
      instance.events.once(Phaser.Core.Events.READY,resize);
      resizeObserver = new ResizeObserver(resize); resizeObserver.observe(host.current); resize();
    });
    return () => { disposed = true; resizeObserver?.disconnect(); game?.destroy(true); };
  }, [round, levelIndex, mode]);
  useEffect(() => {
    audio.current?.mix(muted, musicVolume, effectsVolume);
    audio.current?.setPlaying(phase === 'play');
  }, [muted, musicVolume, effectsVolume, phase, levelIndex, mode]);
  useEffect(() => () => { audio.current?.dispose(); audio.current = null; }, []);
  const unlockAudio = () => {
    audio.current ??= new AdventureAudio();
    audio.current.mix(muted, musicVolume, effectsVolume);
    audioUnlock.current ??= audio.current.unlock().catch(() => { audioUnlock.current = null; });
    return audioUnlock.current;
  };
  const menuSound = (cue: 'move' | 'confirm' | 'back') => { void unlockAudio().then(() => audio.current?.menu(cue)); };
  const start = () => {
    audio.current ??= new AdventureAudio();
    audio.current.mix(muted, musicVolume, effectsVolume);
    audio.current.setTheme('exploration');audio.current.setPlaying(true);
    void unlockAudio();
    if (mode === 'campaign') {
      setSavedLevel(levelIndex);
      try { localStorage.setItem('mariomortille-last-level', String(levelIndex)); } catch { /* Storage can be disabled. */ }
    }
    setPhase('play');
  };
  const startLevel = async (index: number) => {
    if (!prologueCompleted || startingRef.current || !Number.isInteger(index) || index < 0 || index > unlockedThrough(progress, levelIds)) return;
    startingRef.current = true; setStarting(true); bridge.current.paused = true;
    void unlockAudio();
    const current = ++generation.current;
    await pendingSave.current;
    let run: RankedRun | null = null, message = '';
    try { const data = await arcadeRequest<{ runId: string }>('runs', { action: 'start', gameId: 'mario', levelId: levelIds[index] }); run = new RankedRun(data.runId); }
    catch (error) { message = `Partie non classée : ${error instanceof Error ? error.message : 'connexion indisponible.'}`; }
    if (current !== generation.current) return;
    ranked.current = run; completedRun.current = false; setSaveFailed(false); setRankMessage(message);
    setMenuPage('main'); setMode('campaign'); setLevelIndex(index); setRound(r => r + 1); setSavedLevel(index);
    try { localStorage.setItem('mariomortille-last-level', String(index)); } catch { /* Storage can be disabled. */ }
    void unlockAudio(); audio.current?.setTheme('exploration');audio.current?.setPlaying(true); setPhase('play');
    startingRef.current = false; setStarting(false);
  };
  const startPrologue = async () => {
    if (startingRef.current) return;
    startingRef.current = true; setStarting(true); bridge.current.paused = true; void unlockAudio();
    const current = ++generation.current; await pendingSave.current;
    if (current !== generation.current) return;
    ranked.current = null; completedRun.current = false; setSaveFailed(false); setRankMessage('');
    setMenuPage('main'); setMode('prologue'); setRound(r => r + 1); setPhase('play');
    startingRef.current = false; setStarting(false);
  };
  const finishIntro = () => { setIntro(false); void startPrologue(); };
  const beginPrologue = () => { bridge.current.paused = true; setIntro(true); void unlockAudio(); };
  const tutorialHint = mode === 'prologue' ? prologueHints.find(hint => hud.x >= hint.fromX && hud.x < hint.toX) : undefined;
  return <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: '#141d2a', color: '#fff4d6', fontFamily: 'monospace' }}>
    <div ref={host} style={{ position: 'absolute', inset: 0 }} />
    {(phase === 'play' || phase === 'pause') && !house && <AdventureHud active={partyInfo.active} partySize={partyInfo.members.length} bossName={hud.bossName} prologue={mode === 'prologue'} level={levelIndex} health={hud.health} power={hud.powerId} score={hud.score} ticks={hud.ticks} secrets={hud.secrets} secretTotal={currentLevel.pickups.filter(p => p.kind === 'secret').length} bossHealth={hud.bossHealth} checkpoint={hud.checkpoint} dashCooldown={hud.dashCooldown} showDash={phase === 'play'} unranked={phase === 'play' && !ranked.current && !!rankMessage} onDetails={() => setPhase('pause')} hint={phase === 'play' ? tutorialHint : undefined} />}
    {phase === 'menu' && !intro && <TitleMenu initialPage={menuPage} initialNode={mapNode} prologueCompleted={prologueCompleted} onPrologue={beginPrologue} onStart={startLevel} onExit={onExit} music={musicVolume} effects={effectsVolume} onMusic={setMusicVolume} onEffects={setEffectsVolume} onSound={menuSound} savedLevel={savedLevel === null ? null : Math.min(savedLevel, unlockedThrough(progress, levelIds))} completed={progress.completed} unlocked={unlockedThrough(progress, levelIds)} />}
    {phase === 'pause' && <PauseMenu onResume={start} onRestart={() => { doorway.cancel(); setHouse(false); if (mode === 'prologue') void startPrologue(); else void startLevel(levelIndex); }} onMenu={() => { doorway.cancel(); setHouse(false); setPhase('menu'); }} onArcade={onExit} music={musicVolume} effects={effectsVolume} onMusic={setMusicVolume} onEffects={setEffectsVolume} onSound={menuSound} message={[rankMessage, hud.powerId !== 'none' ? `${hud.power} : reste équipé jusqu’au prochain dégât.` : 'C : dash disponible sans équipement.'].filter(Boolean).join(' ')} />}
    {phase === 'ending' && <CampaignEnding onComplete={() => setPhase('finish')} />}
    {phase === 'finish' && <StageResult title={currentLevel.title} prologue={mode === 'prologue'} score={hud.score} ticks={hud.ticks} secrets={hud.secrets} secretTotal={currentLevel.pickups.filter(p => p.kind === 'secret').length} rankMessage={rankMessage} saveFailed={saveFailed} onRetry={submitScore} onReplay={() => { if (mode === 'prologue') void startPrologue(); else void startLevel(levelIndex); }} onMap={returnToMap} onMenu={() => { setMenuPage('main'); setPhase('menu'); }} onArcade={onExit} onSound={menuSound} />}
    {house && <HouseVisit appearance={outdoorAppearance.current} paused={phase !== 'play' || doorway.active} onReady={doorway.rendered} onError={() => { doorway.cancel(); setHouse(false); setHouseError(true); }} onExit={() => doorway.request(false)} onPause={() => setPhase('pause')} onSound={event => { if (!muted) audio.current?.play(event); }} />}
    {houseError && phase === 'play' && <div role="alert" style={{position:'absolute',bottom:56,left:'4%',zIndex:6,background:'#171321',padding:12}}>La maison n’a pas pu se charger. Appuie sur E pour réessayer. <button onClick={() => setHouseError(false)}>FERMER</button></div>}
    {doorway.active && <div aria-label="Passage de la porte" className={`${doorwayStyles.cover} ${doorway.stage === 'waiting' ? '' : doorwayStyles[doorway.stage]}`} />}
    {intro && <PrologueIntro onComplete={finishIntro} onSkip={finishIntro} onSound={cue => audio.current?.play(cue === 'dash' ? 'boost' : cue === 'surprise' ? 'hurt' : 'land')} />}
    {starting && <div role="status" style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', background: '#142c39e8', zIndex: 5, color: '#ffc776' }}>PRÉPARATION DE LA PARTIE…</div>}
  </div>;
}
