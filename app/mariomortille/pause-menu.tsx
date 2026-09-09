'use client';
import { useEffect, useRef, useState } from 'react';
import { bitmapText } from './menu-art';
import styles from './pause-menu.module.css';

export type PauseMenuProps = {
 onResume: () => void; onRestart: () => void; onMenu: () => void; onArcade: () => void;
 music: number; effects: number; onMusic: (value: number) => void; onEffects: (value: number) => void;
 onSound?: (cue: 'move' | 'confirm' | 'back') => void; message?: string;
};
function Text({ children }: { children: string }) {
 const { pixels, width } = bitmapText(children);
 return <svg aria-hidden="true" viewBox={`0 0 ${width} 7`} shapeRendering="crispEdges">{pixels.map((p, i) => <rect key={i} {...p} width="1" height="1" fill="currentColor" />)}</svg>;
}
const clampVolume = (value: number) => Math.max(0, Math.min(1, Math.round(value * 20) / 20));

export default function PauseMenu({ onResume, onRestart, onMenu, onArcade, music, effects, onMusic, onEffects, onSound, message }: PauseMenuProps) {
 const [selected, setSelected] = useState(0);
 const root = useRef<HTMLDivElement>(null);
 const buttons = useRef<(HTMLButtonElement | null)[]>([]);
 const previousMusic = useRef(music || .25), previousEffects = useRef(effects || .6);
 useEffect(() => { const previous = document.activeElement; buttons.current[0]?.focus(); return () => { if (previous instanceof HTMLElement && previous.isConnected) previous.focus(); }; }, []);
 const select = (index: number) => { const next = (index + 6) % 6; setSelected(next); buttons.current[next]?.focus(); onSound?.('move'); };
 const changeVolume = (index: number, amount: number) => { if (index === 1) onMusic(clampVolume(music + amount)); else onEffects(clampVolume(effects + amount)); onSound?.('move'); };
 const activate = (index: number) => {
  onSound?.('confirm');
  if (index === 0) onResume();
  else if (index === 1) { if (music > 0) previousMusic.current = music; onMusic(music > 0 ? 0 : previousMusic.current); }
  else if (index === 2) { if (effects > 0) previousEffects.current = effects; onEffects(effects > 0 ? 0 : previousEffects.current); }
  else if (index === 3) onRestart(); else if (index === 4) onMenu(); else onArcade();
 };
 const labels = ['REPRENDRE', 'MUSIQUE', 'SONS', 'RECOMMENCER LA ZONE', 'MENU PRINCIPAL', "SALLE D'ARCADE"];
 return <div ref={root} className={styles.overlay} role="dialog" aria-modal="true" aria-label="Jeu en pause" onKeyDown={event => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 'Escape', 'Tab', ' '].includes(event.key)) { event.preventDefault(); event.stopPropagation(); }
  if (event.key === 'Escape') { onSound?.('back'); onResume(); }
  else if (event.key === 'ArrowUp' || (event.key === 'Tab' && event.shiftKey)) select(selected - 1);
  else if (event.key === 'ArrowDown' || event.key === 'Tab') select(selected + 1);
  else if ((event.key === 'ArrowLeft' || event.key === 'ArrowRight') && (selected === 1 || selected === 2)) changeVolume(selected, event.key === 'ArrowLeft' ? -.05 : .05);
  else if ((event.key === 'Enter' || event.key === ' ') && !event.repeat) activate(selected);
 }}>
  <h2 className={styles.title}><span className={styles.srOnly}>Pause</span><Text>PAUSE</Text></h2>
  <div className={styles.choices}>{labels.map((label, index) => {
   const volume = index === 1 ? music : effects, audio = index === 1 || index === 2;
   return <div key={label} className={`${styles.row} ${selected === index ? styles.selected : ''}`} onMouseEnter={() => { setSelected(index); buttons.current[index]?.focus(); }}>
    <button ref={node => { buttons.current[index] = node; }} type="button" className={styles.choice} tabIndex={selected === index ? 0 : -1} aria-label={audio ? `${label} : ${Math.round(volume * 100)} %. Entrée pour couper ou rétablir, flèches gauche et droite pour régler.` : label} onFocus={() => setSelected(index)} onClick={() => activate(index)}><Text>{audio ? `${label} : ${Math.round(volume * 100)}` : label}</Text></button>
    {audio && <div className={styles.volumeButtons}>
     <button type="button" tabIndex={-1} aria-label={`Baisser ${label.toLowerCase()}`} onClick={() => changeVolume(index, -.05)}>−</button>
     <button type="button" tabIndex={-1} aria-label={`Augmenter ${label.toLowerCase()}`} onClick={() => changeVolume(index, .05)}>+</button>
    </div>}
   </div>;
  })}</div>
  {message && <p className={styles.message}>{message}</p>}
  <p className={styles.help}><span>↑ ↓ CHOISIR · ENTRÉE VALIDER</span><span>← → VOLUME · ÉCHAP REPRENDRE</span></p>
 </div>;
}
