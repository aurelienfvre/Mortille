import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { InputEdges } from '../../app/mariomortille/input-edges.ts';
test('short taps survive until a simulation tick and are consumed only once', () => {
  const keys = new InputEdges();
  keys.press('jump'); keys.press('jump'); keys.press('power');
  assert.deepEqual(keys.consume(), {jumpPressed:true, downPressed:false, powerPressed:true});
  assert.deepEqual(keys.consume(), {jumpPressed:false, downPressed:false, powerPressed:false});
  keys.press('down'); keys.clear();
  assert.equal(keys.consume().downPressed, false);
});
