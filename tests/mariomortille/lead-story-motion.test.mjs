import test from 'node:test';
import assert from 'node:assert/strict';
import { leadStoryMotion } from '../../app/mariomortille/lead-story-motion.ts';

test('Aurel and Raph never translate while both sampled poses are idle',()=>{
 for(const id of ['aurelien','raphael']){
  let previous=leadStoryMotion(id,0);const frames=new Set();
  for(let t=10;t<=18000;t+=10){
   const current=leadStoryMotion(id,t);
   if(Math.abs(current.x-previous.x)>0.00001)assert.ok(['run','walk'].includes(current.action)||['run','walk'].includes(previous.action),`${id} slides at ${t}`);
   if(current.action==='run')frames.add(current.frame);
   previous=current;
  }
  assert.equal(frames.size,8);
  assert.equal(leadStoryMotion(id,12000).action,'idle');
  assert.equal(leadStoryMotion(id,18000).action,'idle');
 }
});
test('Aurel starts his chase on frame one and reduced motion keeps discrete poses',()=>{
 assert.equal(leadStoryMotion('aurelien',14401).frame,1);
 assert.equal(leadStoryMotion('aurelien',14400).x,36);
 assert.equal(leadStoryMotion('aurelien',17500).x,115);
 for(const id of ['aurelien','raphael'])for(const t of [0,3500,5000,8000,16000])assert.equal(leadStoryMotion(id,t,true).action,'idle');
 assert.equal(leadStoryMotion('raphael',4000).facing,-1);
 assert.equal(leadStoryMotion('raphael',8000).facing,1);
});

test('Raph takes a full 3.3 seconds to approach; pickup and escape times remain unchanged',()=>{
 assert.equal(leadStoryMotion('raphael',5400).action,'walk');
 assert.equal(leadStoryMotion('raphael',6300).action,'idle');
 assert.equal(leadStoryMotion('raphael',8000).action,'run');
});
