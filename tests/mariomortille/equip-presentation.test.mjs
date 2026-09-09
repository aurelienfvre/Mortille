import {heroAtlasHas} from './hero-atlas-helpers.mjs';
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { existsSync } from 'node:fs';
import { equipFrame, equipDuration, equipDurationFor } from '../../app/mariomortille/equip-presentation.ts';
test('each equipment gesture uses eight real runtime PNGs and settles on the last pose', () => {
 assert.equal(equipDuration,790);
 for (const power of ['turbo','ember','cloud','cobalt']) {
  const seen=new Set();
  for(let ms=0;ms<=equipDurationFor(power);ms++) {
   const frame=equipFrame(power,ms);seen.add(frame);
   assert.ok(heroAtlasHas(frame));
  }
  assert.equal(seen.size,8);assert.ok(equipFrame(power,9000).endsWith('08'));
 }
});
