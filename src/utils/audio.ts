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

    if (typeof window !== 'undefined') {
      const unlock = () => {
        if (!this.isMuted) {
          this.initCtx();
        }
      };
      window.addEventListener('pointerdown', unlock, { once: true, passive: true });
      window.addEventListener('keydown', unlock, { once: true, passive: true });
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

  private lastRobotVoiceAt: number = 0;

  // Synthesize expressive droid vocal syllable using carrier + FM vibrato + dual vowel formant filters
  private synthesizeRobotSyllable(
    ctx: AudioContext,
    startTime: number,
    freqStart: number,
    freqEnd: number,
    duration: number,
    f1Freq: number,
    f2Freq: number,
    volume: number = 0.14,
    waveType: OscillatorType = 'sawtooth'
  ) {
    const carrier = ctx.createOscillator();
    const fmMod = ctx.createOscillator();
    const fmGain = ctx.createGain();
    const formant1 = ctx.createBiquadFilter();
    const formant2 = ctx.createBiquadFilter();
    const masterGain = ctx.createGain();

    carrier.type = waveType;
    carrier.frequency.setValueAtTime(freqStart, startTime);
    carrier.frequency.exponentialRampToValueAtTime(Math.max(60, freqEnd), startTime + duration);

    // Subtle robotic FM chirp / warble
    fmMod.type = 'sine';
    fmMod.frequency.setValueAtTime(38, startTime);
    fmGain.gain.setValueAtTime(16, startTime);
    fmMod.connect(fmGain);
    fmGain.connect(carrier.frequency);

    // Dual vowel formant bandpass filters give unmistakable talking-robot timbre
    formant1.type = 'bandpass';
    formant1.frequency.setValueAtTime(f1Freq, startTime);
    formant1.Q.setValueAtTime(3.2, startTime);

    formant2.type = 'bandpass';
    formant2.frequency.setValueAtTime(f2Freq, startTime);
    formant2.Q.setValueAtTime(4.0, startTime);

    masterGain.gain.setValueAtTime(0.001, startTime);
    masterGain.gain.linearRampToValueAtTime(volume, startTime + Math.min(0.018, duration * 0.22));
    masterGain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    carrier.connect(formant1);
    carrier.connect(formant2);
    formant1.connect(masterGain);
    formant2.connect(masterGain);
    masterGain.connect(ctx.destination);

    carrier.start(startTime);
    fmMod.start(startTime);
    carrier.stop(startTime + duration + 0.02);
    fmMod.stop(startTime + duration + 0.02);
  }

  public playRobotGreet() {
    this.withCtx((ctx) => {
      const nowMs = performance.now();
      if (nowMs - this.lastRobotVoiceAt < 260) return;
      this.lastRobotVoiceAt = nowMs;

      const now = ctx.currentTime;
      // Cheerful 3-syllable droid greeting: "Bi-bu-bii!"
      this.synthesizeRobotSyllable(ctx, now, 340, 460, 0.075, 580, 1750, 0.16, 'sawtooth');
      this.synthesizeRobotSyllable(ctx, now + 0.085, 290, 360, 0.07, 440, 1180, 0.14, 'sawtooth');
      this.synthesizeRobotSyllable(ctx, now + 0.165, 440, 680, 0.13, 660, 2150, 0.17, 'sawtooth');
    });
  }

  public playRobotProcess(kind: 'logic' | 'var' | 'func' = 'logic') {
    this.withCtx((ctx) => {
      const nowMs = performance.now();
      if (nowMs - this.lastRobotVoiceAt < 170) return;
      this.lastRobotVoiceAt = nowMs;

      const now = ctx.currentTime;
      if (kind === 'func') {
        // Quick bright droid call: "Fii-bop!"
        this.synthesizeRobotSyllable(ctx, now, 420, 600, 0.055, 620, 1980, 0.11, 'square');
        this.synthesizeRobotSyllable(ctx, now + 0.06, 520, 680, 0.065, 720, 2200, 0.11, 'sawtooth');
      } else if (kind === 'var') {
        // Digital memory chirp: "Bip-dat!"
        this.synthesizeRobotSyllable(ctx, now, 360, 480, 0.05, 520, 1600, 0.1, 'triangle');
        this.synthesizeRobotSyllable(ctx, now + 0.055, 480, 420, 0.055, 680, 1900, 0.1, 'sawtooth');
      } else {
        // Logic scan: "Tik-bii!"
        this.synthesizeRobotSyllable(ctx, now, 380, 520, 0.05, 560, 1850, 0.1, 'sawtooth');
        this.synthesizeRobotSyllable(ctx, now + 0.055, 500, 640, 0.06, 700, 2100, 0.1, 'sawtooth');
      }
    });
  }

  public playRobotCheer() {
    this.withCtx((ctx) => {
      this.lastRobotVoiceAt = performance.now();
      const now = ctx.currentTime;
      // Joyful 4-syllable droid victory cheer: "Wi-hii-bi-bop!"
      this.synthesizeRobotSyllable(ctx, now, 380, 540, 0.07, 560, 1750, 0.16, 'sawtooth');
      this.synthesizeRobotSyllable(ctx, now + 0.08, 480, 720, 0.09, 720, 2150, 0.17, 'sawtooth');
      this.synthesizeRobotSyllable(ctx, now + 0.18, 560, 780, 0.08, 660, 2000, 0.16, 'sawtooth');
      this.synthesizeRobotSyllable(ctx, now + 0.27, 640, 920, 0.15, 780, 2350, 0.18, 'sawtooth');
    });
  }

  public playRobotOops() {
    this.withCtx((ctx) => {
      const nowMs = performance.now();
      if (nowMs - this.lastRobotVoiceAt < 220) return;
      this.lastRobotVoiceAt = nowMs;

      const now = ctx.currentTime;
      // Cute descending droid groan: "Bwooo-uh?"
      this.synthesizeRobotSyllable(ctx, now, 340, 180, 0.14, 480, 1150, 0.16, 'sawtooth');
      this.synthesizeRobotSyllable(ctx, now + 0.15, 210, 130, 0.16, 400, 920, 0.15, 'sawtooth');
    });
  }

  public playClick() {
    this.withCtx((ctx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const now = ctx.currentTime;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(820, now);
      osc.frequency.exponentialRampToValueAtTime(430, now + 0.04);

      gain.gain.setValueAtTime(0.11, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.05);
    });
  }

  public playStep() {
    this.withCtx((ctx) => {
      const now = ctx.currentTime;
      // Soft hover servo pulse + cute micro-step chirp
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(260, now);
      osc.frequency.exponentialRampToValueAtTime(145, now + 0.075);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.085);

      this.synthesizeRobotSyllable(ctx, now + 0.01, 310, 390, 0.045, 550, 1650, 0.055, 'sawtooth');
    });
  }

  public playTurn() {
    this.withCtx((ctx) => {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(340, now);
      osc.frequency.exponentialRampToValueAtTime(540, now + 0.08);

      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.085);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.09);

      this.synthesizeRobotSyllable(ctx, now + 0.01, 410, 520, 0.05, 620, 1900, 0.06, 'triangle');
    });
  }

  public playThink() {
    this.playRobotProcess('logic');
  }

  public playJump() {
    this.withCtx((ctx) => {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(260, now);
      osc.frequency.exponentialRampToValueAtTime(660, now + 0.14);

      gain.gain.setValueAtTime(0.16, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.16);

      // Cheerful droid "Wiii!" jump vocalization
      this.synthesizeRobotSyllable(ctx, now + 0.015, 360, 680, 0.11, 640, 2100, 0.11, 'sawtooth');
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

        gain.gain.setValueAtTime(0.18, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.22);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.23);
      });

      // Happy droid exclamation: "Bii-hap!"
      this.synthesizeRobotSyllable(ctx, now + 0.02, 520, 780, 0.09, 720, 2250, 0.11, 'sawtooth');
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

      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.2);

      this.synthesizeRobotSyllable(ctx, now + 0.02, 400, 560, 0.08, 600, 1850, 0.09, 'sawtooth');
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

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.13);
    });
    this.playRobotOops();
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
    this.playRobotCheer();
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

      gain.gain.setValueAtTime(0.16, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.26);
    });
    this.playRobotOops();
  }
}

export const sounds = new SoundSystem();
