// Procedural Web Audio API sound synthesizer for KodiBot
// Zero external sound asset dependency - instant, reliable, zero latency!

class SoundSystem {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private ambientGain: GainNode | null = null;

  constructor() {
    // Check localStorage for muted state
    try {
      const saved = localStorage.getItem('kodibot_muted');
      if (saved !== null) {
        this.isMuted = saved === 'true';
      }
    } catch {
      this.isMuted = false;
    }
  }

  private initCtx() {
    try {
      if (!this.ctx) {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
    } catch {
      this.ctx = null;
    }
  }

  private withCtx(fn: (ctx: AudioContext) => void) {
    if (this.isMuted) return;
    if (this.ctx && this.ctx.state === 'running') {
      fn(this.ctx);
      return;
    }
    setTimeout(() => {
      if (this.isMuted) return;
      this.initCtx();
      if (this.ctx) {
        fn(this.ctx);
      }
    }, 0);
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    try {
      localStorage.setItem('kodibot_muted', String(this.isMuted));
    } catch {}

    if (this.isMuted && this.ambientGain) {
      this.ambientGain.gain.setValueAtTime(0, this.ctx?.currentTime || 0);
    }
    return this.isMuted;
  }

  public playClick() {
    this.withCtx((ctx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const now = ctx.currentTime;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(400, now + 0.04);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.05);
    });
  }

  public playStep() {
    this.withCtx((ctx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const now = ctx.currentTime;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(280, now);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.08);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.09);
    });
  }

  public playTurn() {
    this.withCtx((ctx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const now = ctx.currentTime;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(350, now);
      osc.frequency.exponentialRampToValueAtTime(520, now + 0.09);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.1);
    });
  }

  public playThink() {
    this.withCtx((ctx) => {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(640, now);
      osc.frequency.setValueAtTime(880, now + 0.035);

      gain.gain.setValueAtTime(0.055, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.085);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.09);
    });
  }

  public playJump() {
    this.withCtx((ctx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const now = ctx.currentTime;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(260, now);
      osc.frequency.exponentialRampToValueAtTime(640, now + 0.15);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.16);
    });
  }

  public playCollect() {
    this.withCtx((ctx) => {
      // Arpeggio C5 - E5 - G5 - C6
      const notes = [523.25, 659.25, 783.99, 1046.5];
      const now = ctx.currentTime;

      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const startTime = now + idx * 0.06;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.2, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.22);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.23);
      });
    });
  }

  public playSwitch() {
    this.withCtx((ctx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const now = ctx.currentTime;

      osc.type = 'square';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.setValueAtTime(480, now + 0.08);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.22);
    });
  }

  public playBump() {
    this.withCtx((ctx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const now = ctx.currentTime;

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(70, now + 0.12);

      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.13);
    });
  }

  public playVictory() {
    this.withCtx((ctx) => {
      const melody = [
        { f: 523.25, d: 0.12 }, // C5
        { f: 523.25, d: 0.12 }, // C5
        { f: 523.25, d: 0.12 }, // C5
        { f: 659.25, d: 0.35 }, // E5
        { f: 587.33, d: 0.18 }, // D5
        { f: 659.25, d: 0.18 }, // E5
        { f: 783.99, d: 0.6 },  // G5
      ];

      let t = ctx.currentTime;
      melody.forEach((note) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(note.f, t);

        gain.gain.setValueAtTime(0.22, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + note.d);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(t);
        osc.stop(t + note.d);

        t += note.d + 0.03;
      });
    });
  }

  // Crisp uplifting fanfare when Kodi finishes the arena (leads smoothly into star chimes)
  public playLevelClear() {
    this.withCtx((ctx) => {
      const notes = [
        { f: 523.25, t: 0, d: 0.14, v: 0.18 },    // C5
        { f: 659.25, t: 0.09, d: 0.14, v: 0.18 }, // E5
        { f: 783.99, t: 0.18, d: 0.16, v: 0.2 },  // G5
        { f: 1046.5, t: 0.27, d: 0.38, v: 0.22 }, // C6
      ];
      const now = ctx.currentTime;

      notes.forEach((n) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const start = now + n.t;

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(n.f, start);

        gain.gain.setValueAtTime(n.v, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + n.d);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(start);
        osc.stop(start + n.d + 0.02);
      });
    });
  }

  // Satisfying ascending chime for each star revealed 1 -> 2 -> 3
  public playStarEarned(starIndex: 1 | 2 | 3) {
    this.withCtx((ctx) => {
      const now = ctx.currentTime;
      const baseFreqs: Record<1 | 2 | 3, [number, number]> = {
        1: [659.25, 987.77],  // E5 + B5
        2: [783.99, 1174.66], // G5 + D6
        3: [1046.5, 1567.98], // C6 + G6
      };
      const [mainFreq, overtoneFreq] = baseFreqs[starIndex];

      // Main bell tone
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(mainFreq, now);
      osc1.frequency.exponentialRampToValueAtTime(mainFreq * 1.015, now + 0.08);
      gain1.gain.setValueAtTime(0.24, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + (starIndex === 3 ? 0.45 : 0.32));
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.48);

      // Harmonic sparkle overtone
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(overtoneFreq, now + 0.035);
      gain2.gain.setValueAtTime(0.13, now + 0.035);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + (starIndex === 3 ? 0.5 : 0.34));
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.035);
      osc2.stop(now + 0.52);
    });
  }

  // Warm celebratory chord shimmer when achieving all 3 stars
  public playAllStarsComplete() {
    this.withCtx((ctx) => {
      const now = ctx.currentTime;
      const chord = [1046.5, 1318.51, 1567.98, 2093.0]; // C6, E6, G6, C7
      chord.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const start = now + idx * 0.045;
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.11, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.55);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.58);
      });
    });
  }

  public playError() {
    this.withCtx((ctx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const now = ctx.currentTime;

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(190, now);
      osc.frequency.setValueAtTime(140, now + 0.1);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.26);
    });
  }
}

export const sounds = new SoundSystem();
