import { createLevelParty, levelCompanions, stepPartyControls } from './party';
import { createState, tick, type Level } from './simulation';
import { decodeControls, decodeReplay } from './replay-codec';
// Version 13 includes ordinary block breaking and full-charge reinforced blocks.
export const REPLAY_VERSION = 13;
/** Replay the real physics. Client scores, pickup IDs and victory claims are ignored. */
export function calculateResult(level: Level, report: Record<string, unknown>, elapsedMs: number) {
  const inputs = decodeReplay(report.inputs);
  if (!Number.isFinite(elapsedMs) || elapsedMs < 0 || inputs.length / 60 * 1000 > elapsedMs * 1.1 + 3000) throw new Error('Durée de partie incohérente.');
  const state = createState(level);
  const party=createLevelParty(state,level,levelCompanions(level));
  for (let i = 0; i < inputs.length; i++) {
    stepPartyControls(party,state,level,decodeControls(inputs[i]));
    if (state.won && i !== inputs.length - 1) throw new Error('Commandes présentes après la fin de la partie.');
  }
  if (!state.won) throw new Error('Cette partie ne termine pas le niveau.');
  return { ticks: state.ticks, score: state.score, secrets: state.pickups.filter(p => p.kind === 'secret' && p.collected).length };
}
