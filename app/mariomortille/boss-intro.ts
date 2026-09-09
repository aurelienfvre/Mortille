/** Presentation-only controller: never touches simulation, replay inputs or clocks. */
export type IntroBossKind='raphael'|'mango'|'pirate'|'lola';
export type BossIntroPhase='waiting'|'arrival'|'boss'|'player'|'combat'|'done';
export type BossIntro={phase:BossIntroPhase;age:number;kind:IntroBossKind};
export const createBossIntro=():BossIntro=>({phase:'waiting',age:0,kind:'raphael'});
export function shouldStartBossIntro(intro:BossIntro,boss:{kind:IntroBossKind;phase:string;x?:number;initialX?:number;arenaLeft?:number}|null,playerX:number,width:number){
 if(intro.phase!=='waiting'||!boss||boss.phase==='defeated')return false;
 const entrance=(boss.initialX??boss.x??Math.max(0,width-1024)+720)-400;
 return playerX>=entrance;
}
export function startBossIntro(intro:BossIntro,kind:IntroBossKind){if(intro.phase==='waiting'){intro.phase='arrival';intro.age=0;intro.kind=kind;}}
export function advanceBossIntro(intro:BossIntro,delta:number,confirm:boolean){
 if(intro.phase==='waiting'||intro.phase==='done')return;
 intro.age+=Math.max(0,Math.min(Number.isFinite(delta)?delta:0,100));
 if(intro.phase==='arrival'){
  if(intro.age>=900){intro.phase='boss';intro.age=0;}
  return; // An arrival key never skips the first speech.
 }
 const hold=intro.phase==='combat'?350:180;
 if((confirm||intro.phase==='combat')&&intro.age>=hold){intro.phase=intro.phase==='boss'?'player':intro.phase==='player'?'combat':'done';intro.age=0;}
}
export function bossArrivalOffset(intro:BossIntro){
 if(intro.phase!=='arrival')return 0;
 const t=Math.min(1,intro.age/900);return Math.round(260*(1-t)*(1-t));
}
export const bossIntroLines:Record<IntroBossKind,{name:string;threat:string[];reply:string[]}>= {
 pirate:{name:'PIRATE',threat:['PAS UN PAS DE PLUS !','CE PASSAGE EST A MOI.'],reply:['ALORS IL VA FALLOIR','ME LAISSER PASSER !']},
 lola:{name:'LOLA',threat:['TU VEUX JOUER ?','ESSAIE DONC DE ME SUIVRE !'],reply:['JE NE SUIS PAS VENU JOUER.','OU EST STEVE ?']},
 mango:{name:'MANGO',threat:['TU AS VAINCU MES GARDIENS.','STEVE NE PARTIRA PAS !'],reply:['ECARTE-TOI, MANGO.','JE VAIS RETROUVER STEVE !']},
 raphael:{name:'RAPHAEL',threat:['MANGO T ATTEND LA-HAUT.','MAIS TU NE PASSERAS PAS !'],reply:['C EST TERMINE, RAPH.','RENDS-NOUS STEVE !']},
};
