'use client';

import { useEffect, useRef, useState } from 'react';
import { bitmapText } from './menu-art';
import styles from './stage-result.module.css';

export type StageResultProps = {
 title: string;
 prologue: boolean;
 score: number;
 ticks: number;
 secrets: number;
 secretTotal?: number;
 rankMessage: string;
 saveFailed: boolean;
 onRetry: () => void;
 onReplay: () => void;
 onMap: () => void;
 onMenu: () => void;
 onArcade: () => void;
 onSound?: (cue: 'move' | 'confirm' | 'back') => void;
};

function PixelText({ children }: { children: string }) {
 const { pixels, width } = bitmapText(children);
 return <svg aria-hidden="true" viewBox={`0 0 ${width} 7`} shapeRendering="crispEdges">{pixels.map((pixel, index) => <rect key={index} {...pixel} width="1" height="1" fill="currentColor" />)}</svg>;
}

export default function StageResult({ title, prologue, score, ticks, secrets, secretTotal = 3, rankMessage, saveFailed, onRetry, onReplay, onMap, onMenu, onArcade, onSound }: StageResultProps) {
 const [selected, setSelected] = useState(0);
 const buttons = useRef<(HTMLButtonElement | null)[]>([]);
 const actions = [
  { id: 'map', label: 'CARTE DU MONDE', run: onMap },
  { id: 'replay', label: prologue ? 'REJOUER LE PROLOGUE' : 'REJOUER LA ZONE', run: onReplay },
  { id: 'menu', label: 'MENU PRINCIPAL', run: onMenu },
  { id: 'arcade', label: "SALLE D'ARCADE", run: onArcade },
  ...(saveFailed ? [{ id: 'retry', label: 'REENVOYER LE SCORE', run: onRetry }] : []),
 ];
 const seconds = Math.max(0, Math.floor(ticks / 60));
 const elapsed = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
 useEffect(() => {
  const previous = document.activeElement;
  buttons.current[0]?.focus();
  return () => { if (previous instanceof HTMLElement && previous.isConnected) previous.focus(); };
 }, []);
 useEffect(() => {
  if (selected >= actions.length) { setSelected(0); buttons.current[0]?.focus(); }
 }, [selected, actions.length]);
 const select = (index: number) => {
  const next = (index + actions.length) % actions.length;
  setSelected(next); buttons.current[next]?.focus(); onSound?.('move');
 };
 const activate = (index: number) => { onSound?.('confirm'); actions[index]?.run(); };
 return <div className={styles.overlay} role="dialog" aria-modal="true" aria-label={title} onKeyDown={event => {
  if (!['ArrowUp', 'ArrowDown', 'Tab', 'Enter', ' ', 'Escape'].includes(event.key)) return;
  event.preventDefault(); event.stopPropagation();
  if (event.key === 'ArrowUp' || (event.key === 'Tab' && event.shiftKey)) select(selected - 1);
  else if (event.key === 'ArrowDown' || event.key === 'Tab') select(selected + 1);
  else if (!event.repeat && event.key === 'Escape') { onSound?.('back'); onMap(); }
  else if (!event.repeat && (event.key === 'Enter' || event.key === ' ')) activate(selected);
 }} onKeyUp={event => {
  // Space normally clicks the focused button on release; activation is handled above.
  if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); event.stopPropagation(); }
 }}>
  <p className={styles.eyebrow}><PixelText>{prologue ? 'CAMPAGNE DEBLOQUEE' : 'ZONE TERMINEE'}</PixelText><span className={styles.srOnly}>{prologue ? 'Campagne débloquée' : 'Zone terminée'}</span></p>
  <h2 className={styles.title}><span className={styles.srOnly}>{title}</span><PixelText>{title.toUpperCase()}</PixelText></h2>
  <dl className={styles.results}>
   {([['POINTS', String(Math.max(0, Math.floor(score)))], ['TEMPS', elapsed], ...(secretTotal > 0 ? [['SECRETS', `${secrets} / ${secretTotal}`]] : [])] as const).map(([label, value]) => <div key={label}><dt><span className={styles.srOnly}>{label}</span><PixelText>{label}</PixelText></dt><dd><span className={styles.srOnly}>{value}</span><PixelText>{value}</PixelText></dd></div>)}
  </dl>
  <p className={`${styles.message} ${saveFailed ? styles.failure : ''}`} role="status" aria-live="polite">{rankMessage || (prologue ? 'Le premier niveau vous attend sur la carte.' : 'Choisissez la prochaine étape sur la carte.')}</p>
  <div className={styles.choices}>{actions.map((action, index) => <button key={action.id} ref={node => { buttons.current[index] = node; }} type="button" className={`${styles.choice} ${selected === index ? styles.selected : ''}`} tabIndex={selected === index ? 0 : -1} aria-label={action.label} onFocus={() => setSelected(index)} onMouseEnter={() => { setSelected(index); buttons.current[index]?.focus(); }} onClick={() => activate(index)}><PixelText>{action.label}</PixelText></button>)}</div>
  <p className={styles.help}>↑ ↓ CHOISIR · ENTRÉE VALIDER · ÉCHAP CARTE</p>
 </div>;
}
