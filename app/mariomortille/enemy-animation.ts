import type { Enemy } from './simulation';
import { enemyKind, ENEMY_DEATH_TICKS } from './enemy-behavior';
/** Sprite selection follows simulation time, so pause also freezes deaths/warnings. */
export function enemyVisual(enemy: Enemy) {
 const kind = enemyKind(enemy);
 const deathTicks = enemy.deathTicks ?? 0;
 const clip = enemy.defeated ? 'die' : enemy.phase === 'warning' || enemy.phase === 'charge' || enemy.phase === 'jump' ? 'attack' : 'walk';
 const frame = enemy.defeated
  ? Math.min(6, 1 + Math.floor((ENEMY_DEATH_TICKS - deathTicks) / 6))
  : clip === 'attack' ? (enemy.phase === 'warning' ? 1 : 2)
  : enemy.moving ? 1 + Math.floor((enemy.distance ?? 0) / 4) % 4 : 1;
 return { visible: !enemy.defeated || deathTicks > 0, kind, clip, frame, key: `enemy-${kind}-${clip}-${frame}`, x: Math.round(enemy.x + 10), y: Math.round(enemy.y + 20), flipX: enemy.direction < 0 };
}
