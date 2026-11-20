class RetroAudioEngine {
  private ctx: AudioContext | null = null;
  private muted: boolean = false;
  private pelletToggle: boolean = false;

  private ensureContext(): AudioContext | null {
    if (this.muted) return null;
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  private playTone(
    freq: number,
    duration: number,
    type: OscillatorType = 'square',
    volume: number = 0.08,
    endFreq?: number,
    delay: number = 0
  ): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (endFreq !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(
        Math.max(20, endFreq),
        now + duration
      );
    }

    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + duration + 0.01);
  }

  public playPellet(): void {
    this.pelletToggle = !this.pelletToggle;
    const freq = this.pelletToggle ? 520 : 660;
    this.playTone(freq, 0.055, 'triangle', 0.06, freq * 1.15);
  }

  public playGiantPowerUp(): void {
    const notes = [261.63, 329.63, 392.0, 523.25, 659.25];
    notes.forEach((n, idx) => {
      this.playTone(n, 0.11, 'square', 0.075, n * 1.05, idx * 0.055);
    });
  }

  public playSpeedBoost(): void {
    this.playTone(440, 0.18, 'sawtooth', 0.06, 1180);
    this.playTone(660, 0.16, 'triangle', 0.06, 1520, 0.06);
  }

  public playSquashMouse(combo: number = 1): void {
    const base = 220 + Math.min(combo, 5) * 65;
    this.playTone(base * 1.4, 0.08, 'sawtooth', 0.11, 90);
    this.playTone(base, 0.14, 'square', 0.08, base * 1.8, 0.06);
  }

  public playWallCrack(): void {
    this.playTone(170, 0.07, 'sawtooth', 0.08, 95);
  }

  public playWallBreak(): void {
    this.playTone(210, 0.13, 'sawtooth', 0.11, 55);
    this.playTone(130, 0.16, 'square', 0.07, 45, 0.04);
  }

  public playCatHit(): void {
    this.playTone(360, 0.14, 'sawtooth', 0.1, 140);
    this.playTone(240, 0.22, 'sawtooth', 0.09, 75, 0.1);
  }

  public playBoop(): void {
    this.playTone(300, 0.09, 'sine', 0.1, 480);
  }

  public playRoundWin(): void {
    const fanfare = [523.25, 659.25, 783.99, 1046.5];
    fanfare.forEach((f, i) => {
      this.playTone(f, 0.16, 'square', 0.08, undefined, i * 0.1);
    });
  }

  public playGameStart(): void {
    const notes = [392.0, 493.88, 587.33, 783.99];
    notes.forEach((f, i) => {
      this.playTone(f, 0.1, 'triangle', 0.08, undefined, i * 0.07);
    });
  }

  public playGhostMode(): void {
    this.playTone(620, 0.14, 'sine', 0.07, 980);
    this.playTone(880, 0.22, 'sine', 0.06, 1320, 0.08);
  }

  public playStickyPaws(): void {
    this.playTone(280, 0.12, 'triangle', 0.09, 130);
    this.playTone(190, 0.16, 'sine', 0.08, 110, 0.06);
  }

  public playMenuClick(): void {
    this.playTone(720, 0.045, 'square', 0.05, 860);
  }
}

export const soundEngine = new RetroAudioEngine();
