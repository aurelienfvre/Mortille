export const prologueScenes = [
 {end:3000,speaker:'JUJU',text:'Steve ! Viens, on part avec Aurélien et Ben.'},
 {end:6500,speaker:'MANGO',text:'Raph ! Attrape-moi ce chien ! Il sera mon garde du trône.'},
 {end:10000,speaker:'AURELIEN',text:'Hé ! Lâchez Steve !'},
 {end:14000,speaker:'BEN',text:'Ils prennent le chemin du vieux quartier !'},
 {end:22400,speaker:'AURELIEN',text:'Je les rattrape. Steve, tiens bon !'},
] as const;
export const sceneStart=(scene:number)=>scene===0?0:prologueScenes[scene-1].end;
/** Hold the last pose before the next beat until the player confirms. */
export function tickPrologue(elapsed:number,scene:number,delta:number){
 return Math.min(prologueScenes[scene].end-1, Math.max(sceneStart(scene),elapsed)+Math.max(0,Math.min(64,delta)));
}
export function visibleDialogue(elapsed:number,scene:number,revealed=false){
 const text=prologueScenes[scene].text;
 return revealed?text.length:Math.min(text.length,Math.floor(Math.max(0,elapsed-sceneStart(scene))/28));
}

/** Revealing text early must not skip the accompanying character action. */
export function prologueActionFinished(elapsed:number,scene:number) {
 return elapsed >= prologueScenes[scene].end - 1;
}

export function prologueDialogueReady(elapsed:number,scene:number,reduced=false) {
 return reduced || elapsed >= (scene===0 ? 2400 : scene===1 ? 5100 : sceneStart(scene));
}
