import test from 'node:test';
import assert from 'node:assert/strict';
import {createBossIntro,shouldStartBossIntro,startBossIntro,advanceBossIntro,bossArrivalOffset,bossIntroLines} from '../../app/mariomortille/boss-intro.ts';
const elapse=(s,n,confirm=false)=>{for(let i=0;i<n;i++)advanceBossIntro(s,100,confirm);};
test('boss introduction triggers once before arena activation and never on defeated boss',()=>{
 const intro=createBossIntro(),boss={kind:'pirate',phase:'tell',arenaLeft:1000,x:1304};
 assert.equal(shouldStartBossIntro(intro,boss,903,3000),false);
 assert.equal(shouldStartBossIntro(intro,boss,904,3000),true);
 startBossIntro(intro,'pirate');assert.equal(shouldStartBossIntro(intro,boss,1500,3000),false);
 assert.equal(shouldStartBossIntro(createBossIntro(),{...boss,phase:'defeated'},1500,3000),false);
 const r=createBossIntro();assert.equal(shouldStartBossIntro(r,{kind:'raphael',phase:'tell'},1296,2000),true);
});
test('arrival cannot skip speech; dialogues require confirmation and combat begins after its readable beat',()=>{
 const intro=createBossIntro();startBossIntro(intro,'mango');assert.equal(bossArrivalOffset(intro),260);
 elapse(intro,8,true);assert.equal(intro.phase,'arrival');assert.ok(bossArrivalOffset(intro)>0);
 elapse(intro,1,true);assert.equal(intro.phase,'boss');assert.equal(bossArrivalOffset(intro),0);
 elapse(intro,40);assert.equal(intro.phase,'boss');advanceBossIntro(intro,0,true);assert.equal(intro.phase,'player');
 advanceBossIntro(intro,20,true);assert.equal(intro.phase,'player');elapse(intro,2);advanceBossIntro(intro,0,true);assert.equal(intro.phase,'combat');
 elapse(intro,3);assert.equal(intro.phase,'combat');advanceBossIntro(intro,50,false);assert.equal(intro.phase,'done');
 elapse(intro,10,true);assert.equal(intro.phase,'done');startBossIntro(intro,'lola');assert.equal(intro.phase,'done');
});
test('initial camera framing fits both actors inside a 640-pixel view',()=>{
 for(const x of [720,800,17674]){
  const player=x-400, camera=(player+x)/2-300;
  assert.ok(player-camera>=80);assert.ok(x+16-camera<=560);
 }
});
test('all four boss dialogues have a named two-line exchange',()=>{
 assert.deepEqual(Object.keys(bossIntroLines).sort(),['lola','mango','pirate','raphael']);
 for(const lines of Object.values(bossIntroLines)){assert.ok(lines.name);assert.equal(lines.threat.length,2);assert.equal(lines.reply.length,2);assert.ok(lines.threat.every(line=>line.length<=30));}
});
