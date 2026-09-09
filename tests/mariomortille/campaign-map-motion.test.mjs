import assert from 'node:assert/strict';
import { campaignNodes, campaignPaths, createCampaignWalker, advanceCampaignWalker, campaignMaxNode, campaignNeighbor } from '../../app/mariomortille/campaign-map-motion.ts';
assert.equal(campaignMaxNode(false, 4), 0);
assert.equal(campaignMaxNode(true, 0), 1);
assert.equal(campaignMaxNode(true, 4), 5);
for (let a = 0; a < 6; a++) for (let b = 0; b < 6; b++) {
 const w = createCampaignWalker(); advanceCampaignWalker(w, a, 5, .05, true);
 for (let i = 0; i < 2000; i++) advanceCampaignWalker(w, b, 5, 1 / 60);
 assert.equal(w.node, b); assert.equal(w.moving, false);
 assert.deepEqual([w.x, w.y], campaignNodes[b]);
}
const locked = createCampaignWalker();
for (let i = 0; i < 400; i++) advanceCampaignWalker(locked, 5, 0, 1 / 60);
assert.equal(locked.node, 0);
const w = createCampaignWalker();
for (let i = 0; i < 30; i++) advanceCampaignWalker(w, 2, 5, 1 / 60);
const before = [w.x, w.y]; advanceCampaignWalker(w, 0, 5, 1 / 60);
assert.ok(Math.hypot(w.x - before[0], w.y - before[1]) < 1, 'retarget never teleports');
assert.equal(campaignNeighbor(0, 0, -1), 1);
assert.equal(campaignNeighbor(2, 0, 1), 3);
for (let i = 0; i < 5; i++) {
 assert.deepEqual(campaignPaths[i][0], campaignNodes[i]);
 assert.deepEqual(campaignPaths[i].at(-1), campaignNodes[i + 1]);
}
console.log('Campaign map:36 authored routes, prologue lock, continuous retargeting and spatial keyboard navigation pass.');

// Returning from a stage places the walker on that stage, not back at the prologue.
for (let node = 0; node < campaignNodes.length; node++) {
 const walker = createCampaignWalker(node);
 assert.equal(walker.node,node);
 assert.deepEqual([walker.x,walker.y],campaignNodes[node]);
 advanceCampaignWalker(walker,node,5,.05);
 assert.equal(walker.moving,false);
 assert.equal(walker.distance,0);
}
assert.equal(createCampaignWalker(NaN).node,0);
assert.equal(createCampaignWalker(-1).node,0);
assert.equal(createCampaignWalker(99).node,5);
