import assert from 'node:assert/strict';
import test from 'node:test';
import { EventEmitter } from 'node:events';
import { createRequire } from 'node:module';
import { setRoomKeyboardActive } from '../../app/mariomortille/house-keyboard.ts';
import { createState } from '../../app/mariomortille/simulation.ts';
import { createLevelParty,stepPartyControls } from '../../app/mariomortille/party.ts';
import { houseLevel,canExitHouse } from '../../app/mariomortille/house-level.ts';
const require=createRequire(import.meta.url);
const KeyboardManager=require('phaser/src/input/keyboard/KeyboardManager.js');
function fixture(){
 const target=new EventTarget();
 function plugin(){
  const manager=new KeyboardManager({events:new EventEmitter(),game:{events:new EventEmitter()},config:{inputKeyboard:true,inputKeyboardEventTarget:target,inputKeyboardCapture:[37,39,69]}});
  manager.boot();let resets=0;
  return {manager,resetKeys(){resets++;},get resets(){return resets;}};
 }
 const outside=plugin(),inside=plugin();
 function key(type,code){const e=new Event(type,{cancelable:true});Object.defineProperty(e,'keyCode',{value:code});target.dispatchEvent(e);return e;}
 return {outside,inside,key};
}
test('real Phaser keyboard reproduces blocked room and transfers keydown/keyup ownership on entry and exit',()=>{
 const {outside,inside,key}=fixture();
 key('keydown',39);
 assert.equal(outside.manager.queue.length,1);
 assert.equal(inside.manager.queue.length,0,'outdoor preventDefault starves the later interior listener even with outdoor physics paused');
 setRoomKeyboardActive(outside,false);
 key('keydown',39);key('keyup',39);key('keydown',69);
 assert.equal(outside.manager.queue.length,0);
 assert.equal(inside.manager.queue.length,3,'room receives movement, release, and E exit');
 setRoomKeyboardActive(inside,false);setRoomKeyboardActive(outside,true);
 key('keydown',37);key('keyup',37);
 assert.equal(outside.manager.queue.length,2,'outdoor controls resume after leaving');
 assert.equal(inside.manager.queue.length,0);
 assert.equal(outside.resets,2,'held outdoor keys cleared both on entry and return');
});
test('room pause clears held keys once and all three character identities can traverse room and exit',()=>{
 const {inside}=fixture();setRoomKeyboardActive(inside,false);setRoomKeyboardActive(inside,false);assert.equal(inside.resets,1);
 for(const id of ['aurel','juju','ben']){
  const world=createState(houseLevel),party=createLevelParty(world,houseLevel,[]);party.active=id;party.members[0].id=id;
  const controls={direction:0,jump:false,jumpPressed:false,run:false,downPressed:false,powerPressed:false};
  for(let i=0;i<10;i++)stepPartyControls(party,world,houseLevel,controls);
  assert.ok(canExitHouse(world.player));const start=world.player.x;
  for(let i=0;i<35;i++)stepPartyControls(party,world,houseLevel,{...controls,direction:1});
  assert.ok(world.player.x>start+45,id+' can move after entering');
  for(let i=0;i<35;i++)stepPartyControls(party,world,houseLevel,{...controls,direction:-1});
  assert.ok(canExitHouse(world.player),id+' can return to exit');
 }
});
