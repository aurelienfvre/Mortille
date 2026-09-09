import type { Event, Player } from './simulation';
export type PixelParticle = { x:number; y:number; vx:number; vy:number; gravity:number; life:number; total:number; size:number; color:number };
/** Generic bursts are retired. Reviewed dust is rendered from its PNG sequence in the scene. */
export function stepFeedback(particles: PixelParticle[], _events: Event[], _player: Player, _ticks: number) {
  particles.length = 0;
}
