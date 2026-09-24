/**
 * Fully synthesized audio: WebAudio sound effects and a small procedural
 * chiptune sequencer. No audio files are shipped.
 */

type Sfx =
  | 'click'
  | 'draw'
  | 'play'
  | 'hit'
  | 'heavy'
  | 'block'
  | 'heal'
  | 'buff'
  | 'debuff'
  | 'death'
  | 'coin'
  | 'move'
  | 'error'
  | 'win'
  | 'lose'
  | 'boom'
  | 'fire'
  | 'ice'
  | 'zap'
  | 'arrow'
  | 'magic'
  | 'turn'
  | 'chest'
  | 'miss'
  | 'summon'
  | 'relic';

class AudioEngine {
  ctx: AudioContext | null = null;
  master!: GainNode;
  sfxGain!: GainNode;
  musicGain!: GainNode;
  noise!: AudioBuffer;
  sfxVol = 0.8;
  musicVol = 0.5;
  private track: string | null = null;
  private timer: number | undefined;
  private step = 0;
  private nextTime = 0;

  unlock(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    try {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.9;
      this.master.connect(this.ctx.destination);
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = this.sfxVol;
      this.sfxGain.connect(this.master);
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = this.musicVol * 0.35;
      this.musicGain.connect(this.master);
      const len = this.ctx.sampleRate;
      this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      if (this.track) this.startSequencer();
    } catch {
      this.ctx = null;
    }
  }

  setVolumes(sfx: number, music: number): void {
    this.sfxVol = sfx;
    this.musicVol = music;
    if (!this.ctx) return;
    this.sfxGain.gain.value = sfx;
    this.musicGain.gain.value = music * 0.35;
  }

  private tone(type: OscillatorType, f0: number, f1: number, dur: number, vol = 0.3, delay = 0): void {
    const c = this.ctx!;
    const t = c.currentTime + delay;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(this.sfxGain);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  private burst(dur: number, freq: number, vol = 0.3, delay = 0, type: BiquadFilterType = 'lowpass'): void {
    const c = this.ctx!;
    const t = c.currentTime + delay;
    const src = c.createBufferSource();
    src.buffer = this.noise;
    const f = c.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f).connect(g).connect(this.sfxGain);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.02);
  }

  sfx(name: Sfx): void {
    if (!this.ctx || this.sfxVol <= 0) return;
    switch (name) {
      case 'click':
        this.tone('square', 880, 660, 0.05, 0.12);
        break;
      case 'draw':
        this.burst(0.06, 4000, 0.08, 0, 'highpass');
        break;
      case 'play':
        this.burst(0.08, 2500, 0.12, 0, 'bandpass');
        this.tone('triangle', 400, 700, 0.08, 0.1);
        break;
      case 'hit':
        this.burst(0.12, 1800, 0.35);
        this.tone('square', 220, 90, 0.1, 0.18);
        break;
      case 'heavy':
        this.burst(0.25, 900, 0.5);
        this.tone('sawtooth', 140, 40, 0.25, 0.3);
        break;
      case 'block':
        this.tone('square', 600, 500, 0.06, 0.15);
        this.tone('square', 900, 800, 0.08, 0.1, 0.03);
        break;
      case 'heal':
        [523, 659, 784].forEach((f, i) => this.tone('triangle', f, f, 0.18, 0.15, i * 0.06));
        break;
      case 'buff':
        this.tone('triangle', 300, 900, 0.2, 0.16);
        break;
      case 'debuff':
        this.tone('sawtooth', 500, 150, 0.25, 0.12);
        break;
      case 'death':
        this.tone('square', 400, 50, 0.4, 0.2);
        this.burst(0.3, 600, 0.25, 0.05);
        break;
      case 'coin':
        this.tone('square', 988, 988, 0.06, 0.12);
        this.tone('square', 1319, 1319, 0.15, 0.12, 0.06);
        break;
      case 'move':
        this.burst(0.05, 700, 0.1);
        break;
      case 'error':
        this.tone('square', 180, 150, 0.15, 0.15);
        break;
      case 'win':
        [523, 659, 784, 1047].forEach((f, i) => this.tone('square', f, f, 0.2, 0.12, i * 0.1));
        break;
      case 'lose':
        [392, 330, 262, 196].forEach((f, i) => this.tone('triangle', f, f * 0.98, 0.35, 0.18, i * 0.2));
        break;
      case 'boom':
        this.burst(0.5, 500, 0.6);
        this.tone('sawtooth', 100, 30, 0.45, 0.35);
        break;
      case 'fire':
        this.burst(0.35, 1400, 0.3, 0, 'bandpass');
        break;
      case 'ice':
        this.tone('sine', 1800, 2400, 0.15, 0.12);
        this.burst(0.2, 6000, 0.1, 0.03, 'highpass');
        break;
      case 'zap':
        for (let i = 0; i < 4; i++) this.tone('sawtooth', 1200 - i * 150, 300, 0.05, 0.12, i * 0.03);
        break;
      case 'arrow':
        this.burst(0.1, 3000, 0.15, 0, 'bandpass');
        this.tone('sine', 1200, 600, 0.1, 0.06);
        break;
      case 'magic':
        this.tone('sine', 600, 1400, 0.22, 0.14);
        this.tone('sine', 900, 1800, 0.22, 0.08, 0.05);
        break;
      case 'turn':
        this.tone('triangle', 440, 440, 0.08, 0.12);
        this.tone('triangle', 660, 660, 0.12, 0.12, 0.08);
        break;
      case 'chest':
        [392, 523, 659, 784, 1047].forEach((f, i) => this.tone('square', f, f, 0.12, 0.1, i * 0.07));
        break;
      case 'miss':
        this.burst(0.15, 5000, 0.08, 0, 'highpass');
        break;
      case 'summon':
        this.tone('sawtooth', 120, 400, 0.3, 0.14);
        this.burst(0.25, 900, 0.12, 0.05);
        break;
      case 'relic':
        this.tone('square', 1047, 1568, 0.12, 0.08);
        break;
    }
  }

  /* ---------------------------------------------------------- music */

  playMusic(track: 'menu' | 'map' | 'battle' | 'boss' | null): void {
    if (this.track === track) return;
    this.track = track;
    this.step = 0;
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
    if (track && this.ctx) this.startSequencer();
  }

  private startSequencer(): void {
    if (!this.ctx) return;
    if (this.timer) clearInterval(this.timer);
    this.nextTime = this.ctx.currentTime + 0.05;
    this.timer = window.setInterval(() => this.schedule(), 50);
  }

  private note(freq: number, t: number, dur: number, type: OscillatorType, vol: number): void {
    const c = this.ctx!;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.musicGain);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  private hat(t: number, vol: number): void {
    const c = this.ctx!;
    const src = c.createBufferSource();
    src.buffer = this.noise;
    const f = c.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = 7000;
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
    src.connect(f).connect(g).connect(this.musicGain);
    src.start(t, Math.random());
    src.stop(t + 0.05);
  }

  private schedule(): void {
    if (!this.ctx || !this.track) return;
    const song = SONGS[this.track];
    const stepDur = 60 / song.bpm / 4;
    while (this.nextTime < this.ctx.currentTime + 0.2) {
      const s = this.step;
      const bar = Math.floor(s / 16) % song.chords.length;
      const beat = s % 16;
      const root = song.chords[bar];
      const t = this.nextTime;
      if (beat % 4 === 0) this.note(midi(root - 24), t, stepDur * 3.5, 'triangle', 0.5);
      if (song.arp) {
        const arp = [0, song.minor ? 3 : 4, 7, 12];
        const n = arp[beat % 4];
        if (beat % 2 === 0 || this.track === 'battle' || this.track === 'boss') this.note(midi(root + n), t, stepDur * 0.9, 'square', 0.1);
      }
      const mel = song.melody[(s % song.melody.length)];
      if (mel !== null && mel !== undefined) this.note(midi(root + 12 + mel), t, stepDur * 1.8, 'square', 0.12);
      if (song.drums && beat % 2 === 0) this.hat(t, beat % 4 === 0 ? 0.12 : 0.06);
      this.nextTime += stepDur;
      this.step++;
    }
  }
}

function midi(n: number): number {
  return 440 * Math.pow(2, (n - 69) / 12);
}

interface Song {
  bpm: number;
  chords: number[];
  melody: (number | null)[];
  minor: boolean;
  arp: boolean;
  drums: boolean;
}

// Original compositions: simple minor-key progressions and motifs.
const _ = null;
const SONGS: Record<string, Song> = {
  menu: {
    bpm: 84,
    minor: true,
    arp: true,
    drums: false,
    chords: [57, 53, 55, 52],
    melody: [0, _, _, _, 3, _, 7, _, 5, _, _, _, 3, _, 2, _, 0, _, _, _, _, _, _, _, 7, _, 5, _, 3, _, 2, _],
  },
  map: {
    bpm: 96,
    minor: true,
    arp: true,
    drums: false,
    chords: [50, 53, 48, 55],
    melody: [7, _, 5, _, 3, _, 5, _, 7, _, _, _, 10, _, 7, _, 5, _, 3, _, 2, _, 3, _, 0, _, _, _, _, _, _, _],
  },
  battle: {
    bpm: 132,
    minor: true,
    arp: true,
    drums: true,
    chords: [57, 57, 53, 55],
    melody: [0, _, 0, 3, _, 5, _, 3, 7, _, 5, _, 3, _, 2, _, 0, _, 0, 3, _, 5, _, 7, 10, _, 8, _, 7, _, 5, _],
  },
  boss: {
    bpm: 144,
    minor: true,
    arp: true,
    drums: true,
    chords: [52, 53, 52, 50],
    melody: [0, 1, _, 0, _, 7, _, 6, 7, _, _, 3, _, 1, 0, _, 12, _, 10, _, 8, _, 7, _, 6, _, 7, _, 1, _, 0, _],
  },
};

export const audio = new AudioEngine();
export type { Sfx };
