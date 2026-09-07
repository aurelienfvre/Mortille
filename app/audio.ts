import {CASE_OPEN,CASE_UNCLIP,CASE_TRAVEL_CLOSED,CASE_RETURN} from './case-motion';
// Recorded CC0 foley is synchronized to the Blender mechanical timeline.
// The screen dive uses an authored stereo suction layer built from CC0 foley.
export class ArcadeAudio {
  context: AudioContext | null = null;
  nodes: AudioScheduledSourceNode[] = [];
  private encoded = new Map<string, ArrayBuffer>();
  private buffers = new Map<string, AudioBuffer>();
  private generation = 0;
  private musicSource: AudioBufferSourceNode | null = null;
  private musicGain: GainNode | null = null;
  private musicEnabled = false;
  private fired = new Set<number>();
  private loading: Promise<void>;
  constructor() {
    this.loading = Promise.all(
      ['button', 'latch', 'motor', 'crt-on', 'crt-off', 'slide', 'confirm', 'suction', 'release', 'case-open', 'case-hinge', 'disc-clip', 'case-close', 'lobby-music'].map(
        async (name) => {
          try {
            const response = await fetch('/audio/' + (name==='lobby-music'?'lobby-bachata-v3':name) + '.wav');
            if (response.ok)
              this.encoded.set(name, await response.arrayBuffer());
          } catch {}
        },
      ),
    ).then(() => {});
  }
  private decoding: Promise<void> | null = null;
  private prepare() {
    const c = this.ctx();
    return (
      this.decoding ??
      (this.decoding = this.loading.then(async () => {
        await Promise.all(
          [...this.encoded].map(async ([name, data]) => {
            try {
              this.buffers.set(name, await c.decodeAudioData(data.slice(0)));
            } catch {}
          }),
        );
        if(process.env.NODE_ENV==='development')document.documentElement.dataset.audioBuffers=String(this.buffers.size);
      }))
    );
  }
  music(enabled: boolean) {
    this.musicEnabled=enabled;
    if(!enabled){if(this.context&&this.musicGain)this.musicGain.gain.setTargetAtTime(0,this.context.currentTime,.35);return;}
    const c=this.ctx();
    void this.prepare().then(()=>{
      if(!this.musicEnabled||c.state==='closed')return;
      if(!this.musicSource){
        const buffer=this.buffers.get('lobby-music');if(!buffer)return;
        const source=c.createBufferSource(),gain=c.createGain();
        source.buffer=buffer;source.loop=true;gain.gain.value=0;
        source.connect(gain).connect(c.destination);source.start();
        this.musicSource=source;this.musicGain=gain;
      }
      this.musicGain!.gain.setTargetAtTime(.25,c.currentTime,.65);
    });
  }
  sample(name: string, volume = 0.65, rate = 1, duration?: number) {
    const buffer = this.buffers.get(name),
      generation = this.generation;
    if (!buffer) {
      void this.prepare().then(() => {
        if (generation === this.generation && this.buffers.has(name))
          this.sample(name, volume, rate, duration);
      });
      return;
    }
    const c = this.ctx(),
      source = c.createBufferSource(),
      gain = c.createGain();
    source.buffer = buffer;
    source.playbackRate.value = rate;
    gain.gain.value = volume;
    source.connect(gain).connect(c.destination);
    source.start();
    if (process.env.NODE_ENV === 'development') {
      const trace = JSON.parse(document.documentElement.dataset.audioTrace || '[]');
      trace.push({ name, time: c.currentTime, state: c.state });
      document.documentElement.dataset.audioTrace = JSON.stringify(trace.slice(-20));
    }
    if (duration) {
      gain.gain.setValueAtTime(
        volume,
        c.currentTime + Math.max(0, duration - 0.05),
      );
      gain.gain.linearRampToValueAtTime(0, c.currentTime + duration);
      source.stop(c.currentTime + duration);
    }
    this.nodes.push(source);
    source.onended = () => {
      source.disconnect();
      gain.disconnect();
      this.nodes = this.nodes.filter((n) => n !== source);
    };
  }
  storageSwitch(){
    this.select();
    // Dry paper rustle and soft closure, timed to the four articulated flaps.
    for(const at of [.18,1.55,2.95,4.55]){this.noise(at,.28,1500,450,.11);this.noise(at+.08,.20,600,250,.055);this.tone(95,at+.22,.12,'sine',48,.065);}
    this.noise(.6,.6,360,900,.025);this.noise(2.95,.65,450,1300,.025);
  }
  switchConsole(from:string,to:string){
    this.select();
    if(from!==to&&!(['nes','n64'].includes(from)&&['nes','n64'].includes(to)))this.sample('motor',.22,.72,2.8);
  }
  tick(time: number, reverse = false, muted = false, consoleId = 'nes') {
    const disc=['gamecube','ps2','ps3','xbox','xbox360'].includes(consoleId);
    const tray=['ps2','xbox'].includes(consoleId);
    const slot=['ps3','xbox360'].includes(consoleId);
    const modern=['ps3','xbox360'].includes(consoleId);
    const handheld=consoleId==='gameboy',top=consoleId==='gamecube';
    const cues: Array<[number, () => void]> = reverse
      ? [
          [0, () => {
            if (process.env.NODE_ENV === 'development')
              document.documentElement.dataset.releaseCue = String(time);
          }],
          [1.6, () => this.sample(modern||handheld?'button':'crt-off', 0.6)],
          [2.75, () => this.sample('slide', 0.7)],
          [3.3, () => this.sample('motor', 0.5, 0.87, 1.1)],
          [CASE_RETURN.appear,()=>{if(disc)this.sample('case-open',.3,1.02);}],
          [CASE_RETURN.hingeOpen,()=>{if(disc)this.sample('case-hinge',.19,1);}],
          [CASE_RETURN.clip,()=>{if(disc)this.sample('disc-clip',.46,1);}],
          [CASE_RETURN.hingeClose,()=>{if(disc)this.sample('case-hinge',.17,.9);}],
          [CASE_RETURN.closed,()=>{if(disc)this.sample('case-close',.42,1);}],
          [5.05, () => {if(!disc)this.sample('button', 0.4);}],
        ]
      : [
          [CASE_OPEN, () => {if(disc)this.sample('case-open',.4,1);}],
          [.2, () => {if(disc)this.sample('case-hinge',.2,1);}],
          [CASE_UNCLIP, () => {if(disc)this.sample('disc-clip',.3,1.12);}],
          [1.5,()=>{if(disc)this.sample('case-hinge',.14,1.08);}],
          [CASE_TRAVEL_CLOSED,()=>{if(disc)this.sample('case-close',.25,1.07);}],
          [0.45, () => this.sample('motor', 0.65, 0.9, 1.0)],
          [1.4, () => this.sample(tray?'motor':'slide', 0.45, tray?1.3:0.8, tray?.7:undefined)],
          [2.65, () => this.sample('latch', disc?0.16:0.28, disc?1.45:1.12)],
          [3.4, () => this.sample(tray||slot?'motor':'slide', 0.3, disc?1.2:0.8, disc?.76:undefined)],
          [top?3.53:3.44,()=>{if(disc){this.sample('motor',.14,1.65,.9);this.tone(130,0,.9,'sine',640,.035);this.noise(0,.85,230,1200,.022);}}],
          [top?4.38:disc?4.12:3.53, () => this.sample('latch', disc?0.32:0.95, disc?1.3:0.92)],
          [top?4.4:disc?4.18:3.78, () => this.sample('button', 0.55, 0.9)],
          [top?4.52:disc?4.32:3.95, () => this.sample('motor', 0.48, 0.85, top?.71:disc?.84:1.2)],
          [5.25, () => {if(modern||handheld){this.tone(handheld?660:440,0,.13,'sine',handheld?880:660,.08);this.tone(handheld?990:880,.13,.21,'sine',handheld?1320:880,.05);}else this.sample('crt-on', 0.68);}],
          [5.85, () => this.sample('confirm', 0.35)],
          [
            5.95,
            () => {
              this.sample('suction', 0.9);
              if (process.env.NODE_ENV === 'development')
                document.documentElement.dataset.suctionCue = String(time);
            },
          ],
        ];
    cues.forEach(([at, play], i) => {
      if (time >= at && !this.fired.has(i)) {
        this.fired.add(i);
        if (!muted && time - at < 0.2) play();
      }
    });
  }
  private ctx() {
    const ctx = this.context ?? (this.context = new AudioContext());
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  }
  tone(
    freq: number,
    at = 0,
    duration = 0.12,
    type: OscillatorType = 'triangle',
    end = freq * 0.6,
    volume = 0.04,
  ) {
    const c = this.ctx(),
      o = c.createOscillator(),
      g = c.createGain(),
      t = c.currentTime + at;
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, end), t + duration);
    g.gain.setValueAtTime(0.001, t);
    g.gain.linearRampToValueAtTime(volume, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.001, t + duration);
    o.connect(g).connect(c.destination);
    o.start(t);
    o.stop(t + duration + 0.02);
    this.nodes.push(o);
    o.onended = () => {
      o.disconnect();
      g.disconnect();
      this.nodes = this.nodes.filter((n) => n !== o);
    };
  }
  noise(
    at: number,
    duration: number,
    freq: number,
    end: number,
    volume = 0.07,
  ) {
    const c = this.ctx(),
      buffer = c.createBuffer(
        1,
        Math.ceil(c.sampleRate * duration),
        c.sampleRate,
      ),
      data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const source = c.createBufferSource(),
      filter = c.createBiquadFilter(),
      gain = c.createGain(),
      t = c.currentTime + at;
    source.buffer = buffer;
    filter.type = 'bandpass';
    filter.Q.value = 1;
    filter.frequency.setValueAtTime(freq, t);
    filter.frequency.exponentialRampToValueAtTime(end, t + duration);
    gain.gain.setValueAtTime(0.001, t);
    gain.gain.exponentialRampToValueAtTime(volume, t + duration * 0.25);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    source.connect(filter).connect(gain).connect(c.destination);
    source.start(t);
    source.stop(t + duration);
    this.nodes.push(source);
    source.onended = () => {
      source.disconnect();
      filter.disconnect();
      gain.disconnect();
      this.nodes = this.nodes.filter((n) => n !== source);
    };
  }
  select() {
    this.sample('button', 0.45, 1.06);
  }
  launch() {
    this.stop();
    void this.prepare();
    this.sample('button', 0.5);
  }
  eject() {
    this.stop();
    void this.prepare();
    // Start from the user action: mounting the 3D room must never skip the exit cue.
    this.sample('release', 0.95);
    this.tone(160, 0, 1.4, 'sine', 42, 0.035);
  }
  stop() {
    this.generation++;
    this.fired.clear();
    for (const n of this.nodes) {
      try {
        n.stop();
      } catch {}
    }
    this.nodes = [];
  }
  close() {
    this.musicEnabled=false;
    this.musicSource?.stop();this.musicSource?.disconnect();this.musicGain?.disconnect();
    this.musicSource=null;this.musicGain=null;
    this.stop();
    void this.context?.close();
    this.context = null;
  }
}
