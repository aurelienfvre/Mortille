import test from 'node:test';
import assert from 'node:assert/strict';
import { victoryFrame, victoryDuration } from '../../app/mariomortille/victory-animation.ts';
import { checkpointFrame, effectFrame } from '../../app/mariomortille/item-art.ts';
test('victory keeps the jump visible 420ms and holds the final pose',()=>{
 assert.equal(victoryFrame(980),6);assert.equal(victoryFrame(1399),6);
 assert.equal(victoryFrame(1400),7);assert.equal(victoryFrame(1560),8);
 assert.equal(victoryFrame(victoryDuration+100),8);assert.equal(victoryDuration,2260);
});
test('checkpoint keeps waving using only green frames after activation',()=>{
 assert.equal(checkpointFrame(true,100,100),'flag-activate-01');
 assert.equal(checkpointFrame(true,142,100),'flag-activate-08');
 assert.equal(checkpointFrame(true,1000,100),'flag-activate-07');
 assert.equal(checkpointFrame(true,148,100),'flag-activate-01');
 assert.equal(effectFrame('transformation',32),null);
 assert.equal(effectFrame('dash-trail',32),null);
});
