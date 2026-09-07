import { createEngine, W, H, type Engine } from './engine';
import type { GameId } from './catalog';
import { createMenuPreview } from './mariomortille/menu-preview';

export function createGamePreview(id: GameId): Engine & { dispose?: () => void } {
  if (id !== 'mario') return createEngine(id);
  const menu = createMenuPreview(W, H);
  return {
    ...menu,
    snapshot: () => ({ score: 0, health: 3, objective: 'MARIOMORTILLE', result: null }),
  };
}
