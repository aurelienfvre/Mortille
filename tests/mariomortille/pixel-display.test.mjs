import test from 'node:test';import assert from 'node:assert/strict';
import {pixelDisplay} from '../../app/mariomortille/pixel-display.ts';
test('game uses the largest possible 16:9 area instead of shrinking to integer zoom',()=>{
 const v=pixelDisplay(721,773,2);assert.equal(v.width,721);assert.equal(v.left,0);assert.ok(Math.abs(v.height-405.5625)<.0001);
});
test('display fills one viewport dimension without stretching or clipping',()=>{
 for(const [w,h,d] of [[1920,1080,1],[1440,900,2],[390,844,3],[844,390,3],[1914,1280,2]]){
  const v=pixelDisplay(w,h,d);assert.ok(v.width<=w+.001&&v.height<=h+.001);assert.ok(Math.abs(v.width-w)<.001||Math.abs(v.height-h)<.001);assert.equal(v.width/v.height,16/9);
 }
});
