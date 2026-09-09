import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {raphStoryAssets,raphStoryFrame,raphPickupContact} from '../../app/mariomortille/raph-story-art.ts';
import {leadStoryMotion} from '../../app/mariomortille/lead-story-motion.ts';
test('Raph reviewed assets exist and all phases avoid white legacy costume',()=>{
 for(const file of raphStoryAssets)assert.ok(existsSync(new URL('../../public'+file.split('?')[0],import.meta.url)),file);
 for(const t of [0,3500,6500,6860,7100,7600,8200])assert.match(raphStoryFrame('run',1,t,t),/story\/raph-current\//);
});
test('Raph reaches the stationary dog before hands contact; remains grounded through pickup',()=>{
 const stride=9, target=48+stride*2*12/96;
 for(const t of [6300,6500,6860,7599]){assert.equal(leadStoryMotion('raphael',t,false,stride).x,target);assert.equal(leadStoryMotion('raphael',t).facing,-1);}
 assert.equal(raphPickupContact(6859).active,false);assert.equal(raphPickupContact(6860).active,true);
 assert.equal(raphPickupContact(6500).frame,1);assert.equal(raphPickupContact(7599).frame,8);
});

test('escape keeps Steve attached to the matching carrying hands in all eight poses',async()=>{
 const {steveCapturePlacement}=await import('../../app/mariomortille/current-steve-story-art.ts');
 for(let frame=1;frame<=8;frame++){
  const contact=raphPickupContact(8200,frame),dog=steveCapturePlacement(contact.frame,contact);
  assert.equal(contact.frame,8+frame);assert.equal(dog.x+48,contact.x);assert.equal(dog.y+60,contact.y);
  assert.match(contact.arms,new RegExp(`carry-arms-0${frame}`));
  assert.match(raphStoryFrame('run',frame,8200,8200),new RegExp(`carry-run-0${frame}`));
 }
 assert.ok(leadStoryMotion('raphael',8000).x<100,'still visible at the start of escape');
 assert.ok(leadStoryMotion('raphael',9900).x>100,'walks beyond the edge, not hidden early');
});
