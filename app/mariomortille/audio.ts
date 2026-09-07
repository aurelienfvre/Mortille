import type { Event } from './simulation';

type Tone = { frequency: number; end?: number; duration: number; delay?: number; volume?: number; wave?: OscillatorType };
const notes = (values: number[], duration = .09): Tone[] => values.map((frequency, i) => ({ frequency, duration, delay: i * duration, volume: .12 }));
export const cues: Record<Event, Tone[]> = {
  jump: [{ frequency: 220, end: 720, duration: .14, wave: 'square', volume: .065 }],
  land: [{ frequency: 110, end: 48, duration: .07, volume: .15 }],
  pound: [{ frequency: 160, end: 34, duration: .24, volume: .24 }],
  break: [{ frequency: 350, end: 65, duration: .14, wave: 'sawtooth', volume: .055 }],
  coin: notes([1046.5, 1568], .055),
  equip: notes([392, 523.25, 659.25, 1046.5]),
  checkpoint: notes([523.25, 659.25, 783.99, 1046.5], .12),
  hurt: [{ frequency: 300, end: 60, duration: .26, wave: 'sawtooth', volume: .07 }],
  finish: notes([523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5], .14),
  boost: [{ frequency: 100, end: 900, duration: .23, wave: 'sawtooth', volume: .045 }],
  stomp: [{ frequency: 280, end: 90, duration: .1, volume: .17 }],
  fire: [{ frequency: 760, end: 120, duration: .17, wave: 'square', volume: .055 }],
  secret: notes([783.99, 987.77, 1174.66, 1567.98], .13),
};

/** Original short chiptune arrangement, scheduled against the audio clock. */
export class AdventureAudio {
  private context?: AudioContext;
  private master?: GainNode;
  private music?: GainNode;
  private effects?: GainNode;
  private timer?: ReturnType<typeof setInterval>;
  private voices = new Set<AudioScheduledSourceNode>();
  private nextBeat = 0;
  private step = 0;
  private active = false;
  private disposed = false;
  private muted = false;
  private musicVolume = .25;
  private effectsVolume = .8;
  private boss = false;

  async unlock() {
    if (this.disposed) return;
    if (!this.context) {
      this.context = new AudioContext();
      this.master = this.context.createGain();
      this.music = this.context.createGain();
      this.effects = this.context.createGain();
      const limiter = this.context.createDynamicsCompressor();
      limiter.threshold.value = -12; limiter.ratio.value = 8;
      this.music.connect(this.master); this.effects.connect(this.master);
      this.master.connect(limiter); limiter.connect(this.context.destination);
      this.applyMix();
    }
    await this.context.resume();
    if (this.disposed) return;
    this.nextBeat = this.context.currentTime + .025;
    if (!this.timer) this.timer = setInterval(() => this.schedule(), 25);
  }
  mix(muted: boolean, music: number, effects: number) {
    this.muted = muted; this.musicVolume = music; this.effectsVolume = effects; this.applyMix();
  }
  private applyMix() {
    if (!this.context) return;
    const now = this.context.currentTime;
    this.master!.gain.setTargetAtTime(this.muted ? 0 : .65, now, .015);
    this.music!.gain.setTargetAtTime(this.active ? this.musicVolume : 0, now, .03);
    this.effects!.gain.setTargetAtTime(this.effectsVolume, now, .015);
  }
  setPlaying(active: boolean, boss = false) {
    if (active && !this.active && this.context) this.nextBeat = this.context.currentTime + .025;
    this.active = active; this.boss = boss; this.applyMix();
  }
  play(event: Event) {
    if (!this.context || this.context.state !== 'running' || this.muted) return;
    for (const tone of cues[event]) this.tone(tone, this.context.currentTime, this.effects!);
  }
  menu(event: 'move' | 'confirm' | 'back') {
    if (!this.context || this.context.state !== 'running' || this.muted) return;
    const sounds: Tone[] = event === 'move'
      ? [{ frequency: 660, end: 880, duration: .045, volume: .055, wave: 'square' }]
      : event === 'confirm'
        ? notes([659.25, 987.77], .055)
        : [{ frequency: 440, end: 220, duration: .08, volume: .075 }];
    for (const tone of sounds) this.tone(tone, this.context.currentTime, this.effects!);
  }
  private tone(tone: Tone, when: number, bus: GainNode) {
    const ctx = this.context!;
    if (this.voices.size >= 48) return;
    const osc = ctx.createOscillator(), envelope = ctx.createGain();
    const at = when + (tone.delay ?? 0), end = at + tone.duration;
    osc.type = tone.wave ?? 'triangle';
    osc.frequency.setValueAtTime(tone.frequency, at);
    if (tone.end) osc.frequency.exponentialRampToValueAtTime(tone.end, end);
    envelope.gain.setValueAtTime(0, at);
    envelope.gain.linearRampToValueAtTime(tone.volume ?? .1, at + .005);
    envelope.gain.exponentialRampToValueAtTime(.0001, end);
    osc.connect(envelope); envelope.connect(bus);
    this.voices.add(osc);
    osc.onended = () => { osc.disconnect(); envelope.disconnect(); this.voices.delete(osc); };
    osc.start(at); osc.stop(end + .01);
  }
  private schedule() {
    const ctx = this.context;
    if (!ctx || ctx.state !== 'running' || !this.active || this.disposed) return;
    if (this.nextBeat < ctx.currentTime) this.nextBeat = ctx.currentTime + .02;
    const eighth = 60 / (this.boss ? 150 : 124) / 2;
    const melody = [72, 0, 76, 79, 76, 74, 72, 0, 69, 72, 76, 0, 74, 72, 69, 0,
      65, 69, 72, 76, 74, 72, 69, 0, 67, 71, 74, 79, 77, 74, 71, 0];
    const bass = [48, 45, 41, 43];
    const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);
    while (this.nextBeat < ctx.currentTime + .12) {
      const i = this.step % 32;
      if (melody[i]) this.tone({ frequency: hz(melody[i] + (this.boss ? -12 : 0)), duration: eighth * .7, wave: 'square', volume: .045 }, this.nextBeat, this.music!);
      if (i % 2 === 0) this.tone({ frequency: hz(bass[Math.floor(i / 8)]), duration: eighth * 1.45, volume: .18 }, this.nextBeat, this.music!);
      if (i % 4 === 0) this.tone({ frequency: 110, end: 38, duration: .095, volume: .18 }, this.nextBeat, this.music!);
      if (i % 4 === 2) this.tone({ frequency: 1800, end: 600, duration: .035, wave: 'square', volume: .025 }, this.nextBeat, this.music!);
      this.step++; this.nextBeat += eighth;
    }
  }
  dispose() {
    this.disposed = true;
    clearInterval(this.timer);
    for (const voice of this.voices) { try { voice.stop(); } catch { /* Already ended. */ } }
    this.voices.clear();
    void this.context?.close();
  }
}
