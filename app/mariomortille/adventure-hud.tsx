'use client';
/* oxlint-disable next/no-img-element -- Pixel sprites must keep nearest-neighbor sampling. */
import { memo } from 'react';
import { bitmapText } from './menu-art';
import type { Power } from './simulation';
import styles from './adventure-hud.module.css';
const Glyph = memo(function Glyph({text}:{text:string}) {
 const art=bitmapText(text);
 return <svg aria-hidden="true" viewBox={`0 0 ${art.width} 7`} width={art.width*2} height={14} shapeRendering="crispEdges">{art.pixels.map((p,i)=><rect key={i} x={p.x} y={p.y} width="1" height="1" fill="currentColor"/>)}</svg>;
});
function Text({text}:{text:string}) {return <span className={styles.text} aria-label={text}>{text.split(' ').map((word,i)=><Glyph key={i} text={word}/>)}</span>;}
const powerNames:Record<Power,string>={none:'AUCUN',turbo:'TURBO',ember:'BRAISE',cloud:'NUAGE',cobalt:'COBALT'};
type Props={active?:'aurel'|'juju'|'ben';partySize?:number;bossName?:string;prologue:boolean;level:number;health:number;power:Power;score:number;ticks:number;secrets:number;secretTotal:number;bossHealth:number;checkpoint:boolean;dashCooldown:number;showDash:boolean;unranked:boolean;onDetails:()=>void;hint?:{title:string;text:string}};
export default function AdventureHud(p:Props) {
 const time=`${Math.floor(p.ticks/3600)}:${String(Math.floor(p.ticks/60)%60).padStart(2,'0')}`;
 const brief:Record<string,string>={'Bienvenue, Aurélien':'GAUCHE / DROITE : MARCHE. PRENDS LES PIECES.','Un petit saut':'HAUT / ESPACE : SAUT. MAINTIENS POUR MONTER.','Prends de la vitesse':'MAJ : COURS. SAUTE SUR LE GARDE.','Équipe Turbo':'PRENDS TURBO. X : CASSE LES BLOCS FISSURES.','Frappe le sol':'SAUTE PUIS BAS / S : FRAPPE LE PLANCHER.','Les braises':'PRENDS BRAISE. X : TIRE ET FAIS FONDRE LA GLACE.','Plane avec Nuage':'PRENDS NUAGE. MAINTIENS HAUT / ESPACE EN VOL.','L’armure Cobalt':'PRENDS COBALT. SAUTE PUIS BAS / S : FRACASSE.','Tu es prêt !':'SAUTE SUR LE GARDE. REJOINS LE DRAPEAU !'};
 const instructions=(p.hint && (brief[p.hint.title] ?? p.hint.text))?.replace(/← →/g,'GAUCHE / DROITE').replace(/↑/g,'HAUT').replace(/↓/g,'BAS');
 return <div className={styles.overlay}>
  <div className={styles.bar} role="group" aria-label="Informations de partie">
   <div className={`${styles.cell} ${styles.lives}`}><span className={styles.label}><Text text={(p.active??'aurel').toUpperCase()}/></span><span className={styles.value} role="img" aria-label={`${p.health} vies sur 3`}>{[0,1,2].map(i=><img key={i} className={`${styles.face} ${i>=p.health?styles.empty:''}`} src={p.active&&p.active!=='aurel'?`/mariomortille/party/${p.active}-life.png`:'/mariomortille/hud/aurelien-life.png'} alt=""/>)}</span></div>
   <div className={styles.cell}><span className={styles.label}><Text text={p.prologue?'PROLOGUE':'MONDE'}/></span><span className={styles.value}><Text text={p.prologue?'DEPART':`1-${p.level+1}`}/>{p.checkpoint&&<span className={styles.flag} role="img" aria-label="Checkpoint activé"/>}</span></div>
   <div className={styles.cell}><span className={styles.label}><Text text="SCORE"/></span><Text text={String(p.score).padStart(6,'0')}/></div>
   <div className={styles.cell}><span className={styles.label}><Text text="TEMPS"/></span><Text text={time}/></div>
   <div className={styles.cell}><span className={styles.label}><Text text="OBJET"/></span><span className={styles.value}>{p.power!=='none'&&<img className={styles.item} src={`/mariomortille/items/pickup-${p.power}.png`} alt=""/>}<Text text={powerNames[p.power]}/></span></div>
   {(p.secretTotal>0||p.bossHealth>=0)&&<div className={styles.cell}><span className={styles.label}><Text text={p.bossHealth>=0?(p.bossName??'RAPHAEL'):'SECRETS'}/></span><Text text={p.bossHealth>=0?`${Math.max(0,p.bossHealth)} PV`:`${p.secrets}/${p.secretTotal}`}/></div>}
  </div>
  <div className={styles.context}>
   {(p.partySize??1)>1&&<span className={styles.dash}><Text text="TAB : CHANGER DE PERSO"/></span>}
   {p.hint&&<aside className={styles.hint} aria-live="polite"><Text text={instructions!}/></aside>}
   {p.showDash&&<span className={styles.dash}><Text text={p.dashCooldown?`C : DASH ${Math.ceil(p.dashCooldown/6)/10} S`:'C : DASH PRET'}/></span>}
   {p.unranked&&<button className={styles.notice} onClick={p.onDetails}><Text text="NON CLASSEE - DETAILS"/></button>}
  </div>
 </div>;
}
