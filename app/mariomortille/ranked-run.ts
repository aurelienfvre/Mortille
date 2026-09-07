import type { Controls } from './simulation';
import { encodeControls, MAX_REPLAY_TICKS } from './replay-codec';
export async function arcadeRequest<T>(path: string, data?: unknown, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`/api/arcade/${path}`, { method: data ? 'POST' : 'GET', credentials: 'same-origin', cache: 'no-store', signal: signal ?? AbortSignal.timeout(12000),
    ...(data ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) } : {}) });
  let value: unknown;
  try { value = await response.json(); } catch { throw new Error('Le classement est temporairement indisponible.'); }
  if (!response.ok) throw new Error(value && typeof value === 'object' && 'error' in value && typeof value.error === 'string' ? value.error : 'Le classement est temporairement indisponible.');
  return value as T;
}
export type SavedRun = { score: number; ticks: number; secrets: number };
export class RankedRun {
  private inputs: number[] = [];
  private sealed = false;
  private overflow = false;
  private pending?: Promise<SavedRun>;
  readonly id: string;
  constructor(id: string) { this.id = id; }
  record(input: Controls) {
    if (this.sealed || this.overflow) return;
    if (this.inputs.length >= MAX_REPLAY_TICKS) { this.overflow = true; this.inputs = []; return; }
    this.inputs.push(encodeControls(input));
  }
  finish(): Promise<SavedRun> {
    this.sealed = true;
    if (this.overflow) return Promise.reject(new Error('Partie de plus de 10 minutes : progression conservée, classement non envoyé.'));
    if (!this.pending) {
      let bytes = ''; for (const input of this.inputs) bytes += String.fromCharCode(input);
      this.pending = arcadeRequest<SavedRun>('runs', { action: 'finish', runId: this.id, inputs: btoa(bytes) }).catch(error => { this.pending = undefined; throw error; });
    }
    return this.pending;
  }
}
