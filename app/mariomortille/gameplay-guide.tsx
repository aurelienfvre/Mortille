'use client';
/* oxlint-disable next/no-img-element -- Reuse game PNGs at an integer scale. */
import {useState} from 'react';
import styles from './gameplay-guide.module.css';
const controls=[['← → / Q D','Se déplacer'],['↑ / ESPACE','Sauter. Maintiens la touche pour sauter plus haut.'],['MAJ','Courir'],['C','Dash, même sans équipement. Attends sa recharge avant de recommencer.'],['X','Utiliser le gant Braise ou le boost Turbo.'],['↓ en l’air','Écraser les blocs fragiles.'],['E','Entrer dans une maison ou en sortir, près de la porte.'],['ÉCHAP','Mettre en pause']];
const equipment=[
 {id:'turbo',name:'Baskets Turbo',text:'C ou X : dash renforcé. Traverse les blocs fragiles et renverse les ennemis pendant le boost.'},
 {id:'ember',name:'Gant Braise',text:'X : lance une boule de feu qui rebondit et fait fondre les blocs de glace.'},
 {id:'cloud',name:'Veste Nuage',text:'Maintiens ↑ ou Espace pendant la descente pour planer.'},
 {id:'cobalt',name:'Carapace Cobalt',text:'↓ en l’air : écrasement capable de casser les blocs renforcés.'},
];
const enemies=[
 {id:'guard',name:'Patrouilleur',text:'Fait des allers-retours à vitesse régulière. Saute sur sa tête pour le battre.'},
 {id:'pest',name:'Petit rapide',text:'Se déplace plus vite. Anticipe ton saut pour éviter de le toucher de côté.'},
 {id:'rover',name:'Rover',text:'Devient jaune et s’arrête avant de charger. Sa direction est fixée : saute par-dessus, puis profite de sa récupération.'},
];
export default function GameplayGuide({onSound}:{onSound:()=>void}){
 const [section,setSection]=useState<'controls'|'equipment'|'enemies'>('controls');
 return <div className={styles.guide}>
  <nav aria-label="Rubriques de l’aide">{([['controls','COMMANDES'],['equipment','POUVOIRS'],['enemies','ENNEMIS']] as const).map(([id,label])=><button key={id} type="button" aria-pressed={section===id} onClick={()=>{setSection(id);onSound();}}>{label}</button>)}</nav>
  {section==='controls'?<dl>{controls.map(([key,text])=><div key={key}><dt>{key}</dt><dd>{text}</dd></div>)}</dl>:<>
   {section==='equipment'&&<p className={styles.note}>Ramasse un équipement pour le porter immédiatement. Il reste actif jusqu’au prochain dégât, sans limite de temps.</p>}
   <ul>{(section==='equipment'?equipment:enemies).map(item=><li key={item.id}><img src={section==='equipment'?`/mariomortille/items/pickup-${item.id}.png`:`/mariomortille/enemies/${item.id}-walk-01.png`} alt="" width={64} height={64}/><div><strong>{item.name}</strong><p>{item.text}</p></div></li>)}</ul>
  </>}
 </div>;
}
