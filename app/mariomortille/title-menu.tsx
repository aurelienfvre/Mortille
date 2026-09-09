'use client';
import GameplayGuide from './gameplay-guide';
/* oxlint-disable next/no-img-element -- Pixel PNGs require exact nearest sampling. */
import { useEffect, useRef, useState } from 'react';
import { quartierLevels } from './levels';
import styles from './title-menu.module.css';
import CampaignMap from './campaign-map';
import RankingsPanel from './rankings-panel';
import { bitmapText, menuTitle, menuSubtitle, menuFooter, menuLabels, idleDurations } from './menu-art';

// A tiny authored bitmap alphabet: SVG rectangles retain their pixel grid at every size.
export function PixelText({ text, title = false }: { text: string; title?: boolean }) {
 const { pixels, width } = bitmapText(text);
 return <svg aria-hidden="true" viewBox={`-1 -1 ${width} ${title ? 11 : 9}`} shapeRendering="crispEdges" className={title ? styles.titlePixels : styles.pixelText}>
  {title && <g fill="#172124">{pixels.map((p, i) => <rect key={i} x={p.x - 1} y={p.y - 1} width="3" height="3" />)}</g>}
  {title && <g fill="#885010" transform="translate(0 2)">{pixels.map((p, i) => <rect key={i} {...p} width="1" height="1" />)}</g>}
  <g fill="currentColor">{pixels.map((p, i) => <rect key={i} {...p} width="1" height="1" />)}</g>
  {title && <g fill="#ffd477">{pixels.filter(p => p.y === 0).map((p, i) => <rect key={i} {...p} width="1" height="1" />)}</g>}
 </svg>;
}

type Props = { initialPage?: 'main'|'campaign'; initialNode?: number; prologueCompleted: boolean; onPrologue: () => void; onStart: (level: number) => void; onExit: () => void; music: number; effects: number; onMusic: (value: number) => void; onEffects: (value: number) => void; onSound: (cue: 'move' | 'confirm' | 'back') => void; savedLevel: number | null; completed: string[]; unlocked: number };
export default function TitleMenu({ initialPage = 'main', initialNode = 0, prologueCompleted, onPrologue, onStart, onExit, music, effects, onMusic, onEffects, onSound, savedLevel, completed, unlocked }: Props) {
 const [page, setPage] = useState<'main' | 'campaign' | 'help' | 'options' | 'scores'>(initialPage === 'campaign' && prologueCompleted ? 'campaign' : 'main');
 const [selected, setSelected] = useState(0);
 const [idleFrame, setIdleFrame] = useState(0);
 const switchPage = (next: typeof page) => { setSelected(0); setPage(next); };
 useEffect(() => {
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let timer: ReturnType<typeof setTimeout>; let frame = 0;
  const durations = idleDurations;
  const tick = () => { frame = (frame + 1) % 8; setIdleFrame(frame); timer = setTimeout(tick, durations[frame]); };
  const change = () => { clearTimeout(timer); frame = 0; setIdleFrame(0); if (!motion.matches) timer = setTimeout(tick, durations[0]); };
  if (!motion.matches) timer = setTimeout(tick, durations[0]); motion.addEventListener('change', change);
  return () => { clearTimeout(timer); motion.removeEventListener('change', change); };
 }, []);
 const root = useRef<HTMLDivElement>(null);
 const buttons = useRef<(HTMLButtonElement | null)[]>([]);
 const labels = menuLabels;
 const actions = [onPrologue, () => { if (prologueCompleted) switchPage('campaign'); }, () => { if (savedLevel !== null) onStart(savedLevel); }, () => switchPage('scores'), () => switchPage('help'), () => switchPage('options'), onExit];
 const focus = (next: number) => { setSelected(next); buttons.current[next]?.focus(); };
 useEffect(() => { root.current?.focus(); }, []);
 useEffect(() => { root.current?.focus(); }, [page]);
 if (page === 'campaign') return <CampaignMap initialNode={initialNode} prologueCompleted={prologueCompleted} completed={completed} unlocked={unlocked} onStart={onStart} onPrologue={onPrologue} onBack={() => switchPage('main')} onSound={onSound} />;
 return <div ref={root} role="menu" tabIndex={-1} className={styles.menu} aria-label="Menu de Mariomortille" onKeyDown={event => {
  if (event.key === 'Escape' && page !== 'main') { event.preventDefault(); switchPage('main'); onSound('back'); return; }
  if (page !== 'main') return;
  const count = labels.length;
  if (['ArrowDown', 'ArrowUp', 'z', 'Z', 's', 'S', ...[]].includes(event.key)) {
   event.preventDefault(); let next = (selected + (['ArrowUp','ArrowLeft','z','Z'].includes(event.key) ? -1 : 1) + count) % count;
   while (page === 'main' && ((next === 1 && !prologueCompleted) || (next === 2 && (!prologueCompleted || savedLevel === null)))) next = (next + (['ArrowUp','ArrowLeft','z','Z'].includes(event.key) ? -1 : 1) + count) % count;
   focus(next); onSound('move');
  } else if (event.key === 'Enter' && event.target === root.current) { event.preventDefault(); buttons.current[selected]?.click(); }
 }}>
  <div className={styles.landscape} aria-hidden="true" />
  <img src="/mariomortille/menu/cloud-1.png" className={`${styles.cloud} ${styles.cloudOne}`} alt="" aria-hidden="true" />
  <img src="/mariomortille/menu/cloud-2.png" className={`${styles.cloud} ${styles.cloudTwo}`} alt="" aria-hidden="true" />
  <div className={styles.motes} aria-hidden="true">{Array.from({ length: 12 }, (_, i) => <i key={i} style={{ left: `${(i * 37 + 9) % 100}%`, top: `${(i * 17 + 13) % 75}%`, animationDelay: `${-i * 1.3}s`, animationDuration: `${8 + i % 4}s` }} />)}</div>
  <div className={styles.hero} aria-hidden="true"><img src={`/mariomortille/menu/aurelien/idle-${String(idleFrame + 1).padStart(2, '0')}.png`} alt="" draggable={false} /></div>
  <header className={styles.header}><h1 aria-label="Mariomortille"><PixelText text={menuTitle} title /></h1><p><PixelText text={menuSubtitle} /><span className={styles.srOnly}>L’aventure d’Aurélien</span></p></header>
  {page === 'main' ? <nav className={styles.choices} aria-label="Menu principal">{labels.map((label, i) => <button key={label} ref={node => { buttons.current[i] = node; }} className={selected === i ? styles.selected : ''} disabled={(i === 1 && !prologueCompleted) || (i === 2 && (!prologueCompleted || savedLevel === null))} aria-label={label} onFocus={() => setSelected(i)} onMouseEnter={() => { if (i !== 2 || savedLevel !== null) setSelected(i); }} onClick={() => { onSound('confirm'); actions[i](); }}><PixelText text={label} /></button>)}</nav> : <section className={styles.panel} aria-label={{ campaign: 'Campagne', help: 'Comment jouer', options: 'Options', scores: 'Classements' }[page]}>
   <h2><PixelText text={{ campaign: 'CAMPAGNE', help: 'COMMENT JOUER', options: 'OPTIONS', scores: 'CLASSEMENTS' }[page]} /></h2>

   {page === 'help' && <GameplayGuide onSound={() => onSound('move')} />}
   {page === 'options' && <div className={styles.options}><label>Musique <output>{Math.round(music * 100)} %</output><input aria-label="Volume de la musique" type="range" min="0" max="1" step="0.05" value={music} onChange={e => onMusic(Number(e.target.value))} /></label><label>Effets sonores <output>{Math.round(effects * 100)} %</output><input aria-label="Volume des effets sonores" type="range" min="0" max="1" step="0.05" value={effects} onChange={e => { onEffects(Number(e.target.value)); onSound('move'); }} /></label></div>}
   {page === 'scores' && <RankingsPanel />}
   <button className={styles.back}  onClick={() => { switchPage('main'); onSound('back'); }}>← RETOUR</button>
  </section>}
  <footer className={styles.footer}>{page === 'main' && !prologueCompleted && <p>Termine le prologue pour ouvrir la campagne.</p>}<PixelText text={page === 'main' ? menuFooter : 'TAB : CHOISIR - ENTREE : VALIDER - ECHAP : RETOUR'} /><span className={styles.srOnly}>{page === 'main' ? 'Flèches pour choisir, Entrée pour valider.' : 'Tabulation pour choisir, Entrée pour valider, Échap pour revenir. Fais défiler le panneau pour lire la suite.'} La souris et le tactile fonctionnent aussi.</span></footer>
 </div>;
}
