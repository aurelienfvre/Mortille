'use client';
import { useEffect, useRef, useState } from 'react';
import type { Bridge } from './scene';
import { quartierLevels } from './levels';
import { prologueLevel, prologueHints } from './prologue-level';
import { AdventureAudio } from './audio';
import { RankedRun, arcadeRequest } from './ranked-run';
import TitleMenu, { PixelText } from './title-menu';
import { completeStage, progressKey, readProgress, unlockedThrough, type CampaignProgress } from './progress';
const levelIds = quartierLevels.map(level => level.id);
const powerNames = { none: 'AUCUN', turbo: 'BASKETS TURBO', ember: 'GANT BRAISE', cloud: 'VESTE NUAGE', cobalt: 'CARAPACE COBALT' };
export default function Mariomortille({ onExit, muted = false }: { onExit: () => void; muted?: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<'menu' | 'play' | 'pause' | 'finish'>('menu');
  const [levelIndex, setLevelIndex] = useState(0);
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
  const [hud, setHud] = useState({ score: 0, power: 'AUCUN', checkpoint: false, health: 3, secrets: 0, bossHealth: -1, x: 0 });
  const audio = useRef<AdventureAudio | null>(null);
  const [musicVolume, setMusicVolume] = useState(.25);
  const [effectsVolume, setEffectsVolume] = useState(.8);
  const bridge = useRef<Bridge>({ paused: true, muted, pause: () => {}, update: () => {}, sound: () => {} });
  useEffect(() => {
  bridge.current.paused = phase !== 'play'; bridge.current.muted = muted;
  bridge.current.pause = () => setPhase(p => p === 'play' ? 'pause' : p === 'pause' ? 'play' : p);
  bridge.current.update = state => {
    if (state.won || state.ticks % 6 === 0 || state.events.length) setHud({ score: state.score, power: powerNames[state.player.power], checkpoint: state.checkpoint, health: state.player.health, secrets: state.pickups.filter(i => i.kind === 'secret' && i.collected).length, bossHealth: state.boss?.health ?? -1, x: state.player.x });
    if (state.won && !completedRun.current) {
      completedRun.current = true; bridge.current.paused = true;
      if (mode === 'prologue') { try { localStorage.setItem('mariomortille-prologue-complete', '1'); } catch { /* Optional local record. */ } }
      else { setProgress(previous => completeStage(previous, levelIds[levelIndex], levelIds)); submitScore(); }
      setPhase('finish');
    }
  };
  bridge.current.sound = event => audio.current?.play(event);
  bridge.current.record = input => ranked.current?.record(input);
  }, [phase, muted, levelIndex, mode]);
  useEffect(() => {
    let disposed = false; let game: { destroy: (children: boolean) => void } | undefined;
    void Promise.all([import('phaser'), import('./scene')]).then(([Phaser, { createScene }]) => {
      if (disposed || !host.current) return;
      game = new Phaser.Game({ type: Phaser.AUTO, parent: host.current, width: 640, height: 360, canvasStyle: 'image-rendering: pixelated;', pixelArt: true, roundPixels: true, antialias: false, scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH }, scene: createScene(bridge.current, currentLevel), audio: { noAudio: true }, input: { keyboard: true } });
    });
    return () => { disposed = true; game?.destroy(true); };
  }, [round, levelIndex, mode]);
  useEffect(() => {
    audio.current?.mix(muted, musicVolume, effectsVolume);
    audio.current?.setPlaying(phase === 'play', !!currentLevel.boss);
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
    audio.current.setPlaying(true, !!currentLevel.boss);
    void unlockAudio();
    if (mode === 'campaign') {
      setSavedLevel(levelIndex);
      try { localStorage.setItem('mariomortille-last-level', String(levelIndex)); } catch { /* Storage can be disabled. */ }
    }
    setPhase('play');
  };
  const startLevel = async (index: number) => {
    if (startingRef.current || !Number.isInteger(index) || index < 0 || index > unlockedThrough(progress, levelIds)) return;
    startingRef.current = true; setStarting(true); bridge.current.paused = true;
    void unlockAudio();
    const current = ++generation.current;
    await pendingSave.current;
    let run: RankedRun | null = null, message = '';
    try { const data = await arcadeRequest<{ runId: string }>('runs', { action: 'start', gameId: 'mario', levelId: levelIds[index] }); run = new RankedRun(data.runId); }
    catch (error) { message = `Partie non classée : ${error instanceof Error ? error.message : 'connexion indisponible.'}`; }
    if (current !== generation.current) return;
    ranked.current = run; completedRun.current = false; setSaveFailed(false); setRankMessage(message);
    setMode('campaign'); setLevelIndex(index); setRound(r => r + 1); setSavedLevel(index);
    try { localStorage.setItem('mariomortille-last-level', String(index)); } catch { /* Storage can be disabled. */ }
    void unlockAudio(); audio.current?.setPlaying(true, !!quartierLevels[index].boss); setPhase('play');
    startingRef.current = false; setStarting(false);
  };
  const startPrologue = async () => {
    if (startingRef.current) return;
    startingRef.current = true; setStarting(true); bridge.current.paused = true; void unlockAudio();
    const current = ++generation.current; await pendingSave.current;
    if (current !== generation.current) return;
    ranked.current = null; completedRun.current = false; setSaveFailed(false); setRankMessage('');
    setMode('prologue'); setRound(r => r + 1); setPhase('play');
    startingRef.current = false; setStarting(false);
  };
  const tutorialHint = mode === 'prologue' ? prologueHints.find(hint => hud.x >= hint.fromX && hud.x < hint.toX) : undefined;
  return <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: '#141d2a', color: '#fff4d6', fontFamily: 'monospace' }}>
    <div ref={host} style={{ position: 'absolute', inset: 0 }} />
    {phase === 'play' && !ranked.current && rankMessage && <button onClick={() => setPhase('pause')} style={{ position: 'absolute', top: 52, left: '4%', padding: '5px 8px', color: '#ffdc9c', background: '#142c39dd', border: '1px solid #80673c', font: '12px monospace', cursor: 'pointer' }}>PARTIE NON CLASSÉE · DÉTAILS</button>}
    {phase !== 'menu' && <div style={{ position: 'absolute', top: 20, left: '4%', right: '4%', display: 'flex', justifyContent: 'space-between', pointerEvents: 'none', textShadow: '2px 2px #152638' }}><b>{mode === 'prologue' ? 'PROLOGUE · PRISE EN MAIN' : `QUARTIER MORTILLE · 1–${levelIndex + 1}`}</b><b>{'♥'.repeat(hud.health)} · {hud.power} · {hud.score} PTS · {hud.bossHealth < 0 ? `${hud.secrets}/3 ✦` : ''} {hud.checkpoint ? '⚑' : ''}{hud.bossHealth >= 0 ? ` · RAPHAËL ${'◆'.repeat(hud.bossHealth)}` : ''}</b></div>}
    {phase === 'menu' && <TitleMenu onPrologue={startPrologue} onStart={startLevel} onExit={onExit} music={musicVolume} effects={effectsVolume} onMusic={setMusicVolume} onEffects={setEffectsVolume} onSound={menuSound} savedLevel={savedLevel === null ? null : Math.min(savedLevel, unlockedThrough(progress, levelIds))} completed={progress.completed} unlocked={unlockedThrough(progress, levelIds)} />}
    {phase !== 'play' && phase !== 'menu' && <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', background: '#132237c9' }}><div style={{ textAlign: 'center', width: 'min(86vw,650px)', maxHeight: '88vh', overflowY: 'auto', padding: 24, background: '#142c39ed', border: '4px solid #efac37', boxShadow: '5px 5px #614c27' }}>
      <p style={{ color: '#62dfb4', letterSpacing: 5 }}>L’AVENTURE D’AURÉLIEN</p>
      <h1 style={{ fontSize: 'clamp(25px,5vw,58px)', color: '#ffc669', textShadow: '4px 4px #3c2846', margin: '12px 0 24px' }}><span style={{display:'block',height:'clamp(28px,6vh,56px)'}}><PixelText text={phase === 'pause' ? 'PAUSE' : 'NIVEAU TERMINE !'} /></span><span style={{position:'absolute',width:1,height:1,overflow:'hidden',clipPath:'inset(50%)'}}>{phase === 'pause' ? 'Pause' : 'Niveau terminé'}</span></h1>
      <p>{phase === 'finish' ? `${hud.score} points · ${currentLevel.title} terminé.` : `${currentLevel.title} — Ramasse ton équipement pour découvrir son pouvoir.`}</p>
      <p style={{ lineHeight: 2, color: '#b8d5d8' }}>← → / Q D : bouger · ↑ / ESPACE : sauter<br/>MAJ : courir · X : pouvoir · ↓ en l’air : écraser</p>
      {rankMessage && <p role="status" style={{ color: '#ffdc9c' }}>{rankMessage}</p>}
      {phase === 'finish' && saveFailed && <button onClick={submitScore} style={{ padding: 10, marginBottom: 12 }}>RÉESSAYER L’ENREGISTREMENT</button>}
      <button onClick={() => { if (phase === 'finish') { if (mode === 'prologue') void startPrologue(); else void startLevel(levelIndex); } else start(); }} style={{ padding: '15px 30px', background: '#ffca70', color: '#242537', border: '3px solid #fff0c7', fontWeight: 900, cursor: 'pointer' }}>{phase === 'pause' ? 'REPRENDRE' : phase === 'finish' ? 'REJOUER' : 'COMMENCER L’AVENTURE'}</button>
      {phase === 'finish' && mode === 'campaign' && levelIndex < quartierLevels.length - 1 && <button onClick={() => startLevel(levelIndex + 1)} style={{ display: 'block', margin: '18px auto', padding: '12px 24px', background: '#62dfb4', color: '#162838', border: 0, cursor: 'pointer' }}>NIVEAU SUIVANT →</button>}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: 20, flexWrap: 'wrap' }}>
        <label>Musique {Math.round(musicVolume * 100)} %<br/><input aria-label="Volume de la musique" type="range" min="0" max="1" step="0.05" value={musicVolume} onChange={e => setMusicVolume(Number(e.target.value))} /></label>
        <label>Effets {Math.round(effectsVolume * 100)} %<br/><input aria-label="Volume des effets sonores" type="range" min="0" max="1" step="0.05" value={effectsVolume} onChange={e => setEffectsVolume(Number(e.target.value))} /></label>
      </div>
      <button onClick={() => setPhase('menu')} style={{ display: 'block', margin: '22px auto', background: 'none', border: 0, color: '#ffc669', cursor: 'pointer' }}>MENU DU JEU</button>
      <button onClick={onExit} style={{ display: 'block', margin: '22px auto', background: 'none', border: 0, color: '#fff4d6', cursor: 'pointer' }}>RETOUR À L’ARCADE</button>
    </div></div>}
    {phase === 'play' && tutorialHint && <aside aria-live="polite" style={{ position: 'absolute', top: 56, left: '4%', maxWidth: 'min(540px,82vw)', padding: '10px 14px', border: '2px solid #f1b74f', background: '#152b3de8', pointerEvents: 'none', lineHeight: 1.5 }}><strong style={{ color: '#ffc76e' }}>{tutorialHint.title}</strong><div>{tutorialHint.text}</div></aside>}
    {phase === 'finish' && mode === 'prologue' && <button onClick={() => startLevel(0)} style={{ position: 'absolute', bottom: '8%', left: '50%', transform: 'translateX(-50%)', padding: '14px 24px', background: '#62dfb4', color: '#132b36', border: '3px solid #c7ffe8', fontWeight: 900, cursor: 'pointer' }}>COMMENCER LA CAMPAGNE →</button>}
    {starting && <div role="status" style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', background: '#142c39e8', zIndex: 5, color: '#ffc776' }}>PRÉPARATION DE LA PARTIE…</div>}
  </div>;
}
