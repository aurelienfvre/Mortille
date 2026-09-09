import {musicStep,type MusicTheme} from './music';
import type { Event } from './simulation';

export type AudioCue = Event | 'step-left' | 'step-right' | 'transfer-start' | 'transfer-glide' | 'transfer-arrive';
type Tone = { frequency: number; end?: number; duration: number; delay?: number; volume?: number; wave?: OscillatorType };
const notes = (values: number[], duration = .09): Tone[] => values.map((frequency, i) => ({ frequency, duration, delay: i * duration, volume: .12 }));
export const cues: Record<AudioCue, Tone[]> = {
  'bear-transform':[{frequency:90,end:180,duration:.28,wave:'sawtooth',volume:.08},{frequency:65,end:100,duration:.35,wave:'triangle',volume:.16}],
  'bear-revert':[{frequency:440,end:140,duration:.24,wave:'triangle',volume:.1}],
  'bear-claw':[{frequency:820,end:90,duration:.12,wave:'sawtooth',volume:.09},{frequency:110,end:45,duration:.14,wave:'triangle',volume:.12}],
  'palm-wave':[{frequency:150,end:1000,duration:.09,wave:'triangle',volume:.1},{frequency:900,end:110,duration:.3,delay:.05,wave:'sawtooth',volume:.06}],
  'dash-charge-low': [{frequency:110,end:220,duration:.24,wave:'triangle',volume:.10}],
  'dash-charge-mid': [{frequency:220,end:440,duration:.26,wave:'triangle',volume:.12},{frequency:330,end:660,duration:.25,wave:'sine',volume:.04}],
  'dash-charge-high': [{frequency:440,end:880,duration:.33,wave:'triangle',volume:.14},{frequency:660,end:1320,duration:.3,wave:'sine',volume:.05}],
  'dash-charge-full': [{frequency:880,end:1046,duration:.17,wave:'triangle',volume:.09},{frequency:1320,end:1568,duration:.16,wave:'sine',volume:.035}],
  'dash-release': [{frequency:1200,end:70,duration:.22,wave:'sawtooth',volume:.075},{frequency:150,end:40,duration:.3,wave:'triangle',volume:.17}],
  'dash-impact': [{frequency:220,end:32,duration:.24,wave:'triangle',volume:.23},{frequency:900,end:100,duration:.085,wave:'square',volume:.08}],
  'trio-pickup': notes([659,880,1318],.1),
  'trio-charge': [{frequency:130,end:880,duration:1,wave:'triangle',volume:.14},{frequency:196,end:1320,duration:.9,delay:.1,wave:'sine',volume:.08}],
  'trio-fire': [{frequency:880,end:100,duration:.65,wave:'sawtooth',volume:.06},{frequency:65,end:30,duration:.6,wave:'triangle',volume:.22}],
  'transfer-start': [{frequency:330,end:1100,duration:.2,wave:'sine',volume:.1}],
  'transfer-glide': [{frequency:780,end:1050,duration:.14,wave:'triangle',volume:.045}],
  'transfer-arrive': [{frequency:1046.5,duration:.12,wave:'sine',volume:.1},{frequency:1568,duration:.2,delay:.055,wave:'triangle',volume:.07}],
  'step-left': [{ frequency: 112, end: 58, duration: .035, volume: .045 }],
  'step-right': [{ frequency: 126, end: 65, duration: .035, volume: .04 }],
  jump: [{ frequency: 220, end: 720, duration: .14, wave: 'square', volume: .065 }],
  land: [{ frequency: 110, end: 48, duration: .07, volume: .15 }],
  pound: [{ frequency: 160, end: 34, duration: .24, volume: .24 }],
  break: [{ frequency: 350, end: 65, duration: .14, wave: 'sawtooth', volume: .055 }],
  coin: notes([1046.5, 1568], .055),
  equip: notes([392, 523.25, 659.25, 1046.5]),
  checkpoint: notes([523.25, 659.25, 783.99, 1046.5], .12),
  hurt: [
    { frequency: 620, end: 180, duration: .075, wave: 'square', volume: .13 },
    { frequency: 210, end: 55, duration: .18, delay: .065, wave: 'square', volume: .1 },
    { frequency: 90, end: 35, duration: .1, wave: 'triangle', volume: .18 },
  ],
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
  private theme:MusicTheme='exploration';
  private track?:GainNode;
  private retiredBuses=new Map<GainNode,ReturnType<typeof setTimeout>>();

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
      this.track=this.context.createGain();this.track.connect(this.music);
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
  setPlaying(active: boolean) {
    if (active && !this.active && this.context) this.nextBeat = this.context.currentTime + .025;
    this.active = active; this.applyMix();
  }
  setTheme(theme:MusicTheme) {
    if(this.theme===theme||this.disposed)return;
    this.theme=theme;this.step=0;
    if(!this.context)return;
    const now=this.context.currentTime,old=this.track!;
    old.gain.cancelScheduledValues(now);old.gain.setValueAtTime(old.gain.value,now);old.gain.linearRampToValueAtTime(0,now+.2);
    const cleanup=setTimeout(()=>{old.disconnect();this.retiredBuses.delete(old);},300);this.retiredBuses.set(old,cleanup);
    this.track=this.context.createGain();this.track.gain.setValueAtTime(0,now);this.track.gain.linearRampToValueAtTime(1,now+.22);this.track.connect(this.music!);
    this.nextBeat=now+.025;
  }
  play(event: AudioCue) {
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
    while(this.nextBeat<ctx.currentTime+.12){
      const phrase=musicStep(this.theme,this.step);
      for(const tone of phrase.tones)this.tone(tone,this.nextBeat,this.track!);
      this.step++;this.nextBeat+=phrase.seconds;
    }
  }

  dispose() {
    this.disposed = true;
    clearInterval(this.timer);
    for (const voice of this.voices) { try { voice.stop(); } catch { /* Already ended. */ } }
    this.voices.clear();
    for(const [bus,timer] of this.retiredBuses){clearTimeout(timer);bus.disconnect();}this.retiredBuses.clear();
    void this.context?.close();
  }
}
