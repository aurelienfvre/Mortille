import type { BossKind } from './boss';
export type MusicTheme = 'exploration' | BossKind;
export type MusicTone = {frequency:number;end?:number;duration:number;delay?:number;volume?:number;wave?:OscillatorType};
type Score = {bpm:number;division:number;group:number;melody:readonly number[];bass:readonly number[];wave:OscillatorType;lead:number};
/** Original motifs: nautical minor jig, stalking syncopation, heavy demon march, final ostinato. */
export const musicScores:Record<MusicTheme,Score>={
 exploration:{bpm:124,division:2,group:4,melody:[72,0,76,79,76,74,72,0,69,72,76,0,74,72,69,0,65,69,72,76,74,72,69,0,67,71,74,79,77,74,71,0],bass:[48,45,41,43],wave:'square',lead:.045},
 pirate:{bpm:112,division:3,group:6,melody:[62,65,69,74,69,65,62,0,60,62,65,69,58,62,65,70,65,62,57,61,64,69,64,61],bass:[38,38,34,33],wave:'square',lead:.052},
 lola:{bpm:138,division:2,group:4,melody:[75,0,78,0,82,81,78,0,75,0,74,75,0,78,0,81,73,0,76,0,80,79,76,0,71,0,74,77,0,74,71,0],bass:[39,39,37,35],wave:'triangle',lead:.1},
 mango:{bpm:104,division:2,group:4,melody:[50,0,50,51,0,57,53,0,50,0,48,0,46,0,45,0,50,0,57,0,56,53,51,0,46,0,45,0,44,45,0,0],bass:[26,26,22,21],wave:'sawtooth',lead:.045},
 raphael:{bpm:152,division:2,group:4,melody:[64,67,71,64,70,67,64,0,62,65,69,62,68,65,62,0,60,64,67,60,66,64,60,0,59,63,66,71,70,66,63,59],bass:[28,26,24,23],wave:'square',lead:.048},
};
const hz=(midi:number)=>440*2**((midi-69)/12);
export function musicStep(theme:MusicTheme,step:number):{seconds:number;tones:MusicTone[]}{
 const score=musicScores[theme],seconds=60/score.bpm/score.division,i=step%score.melody.length,tones:MusicTone[]=[];
 if(score.melody[i])tones.push({frequency:hz(score.melody[i]),duration:seconds*(theme==='mango'?.85:.66),wave:score.wave,volume:score.lead});
 const segment=score.melody.length/score.bass.length;
 if(i%2===0||theme==='pirate'&&i%3===0)tones.push({frequency:hz(score.bass[Math.floor(i/segment)]),duration:seconds*1.45,wave:'triangle',volume:theme==='mango'?.2:.16});
 if(i%score.group===0)tones.push({frequency:theme==='mango'?80:110,end:32,duration:.12,volume:.18});
 if(i%score.group===Math.floor(score.group/2))tones.push({frequency:theme==='lola'?2400:1600,end:500,duration:.035,wave:'square',volume:.022});
 if(theme==='raphael'&&i%8===6)tones.push({frequency:hz(score.bass[Math.floor(i/segment)]+7),duration:seconds*.8,wave:'sawtooth',volume:.025});
 return {seconds,tones};
}
export function encounterMusic(boss:{kind:BossKind;activated?:boolean;phase:string}|null|undefined):MusicTheme{
 return boss?.activated&&boss.phase!=='defeated'?boss.kind:'exploration';
}
