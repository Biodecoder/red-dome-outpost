// ============================================================================
// RED DOME OUTPOST — Zero-Dependency WebAudio Procedural Synthesizer
// ============================================================================

export class SoundEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  _ensureContext() {
    if (this.muted) return null;
    if (!this.ctx && typeof window !== "undefined") {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  playTone(freq = 440, duration = 0.14, type = "sine", gainVal = 0.08, delay = 0) {
    const ctx = this._ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(gainVal, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  playSelect() {
    this.playTone(520, 0.07, "triangle", 0.06, 0);
    this.playTone(680, 0.06, "sine", 0.05, 0.03);
  }

  playBuild() {
    this.playTone(440, 0.12, "triangle", 0.08, 0);
    this.playTone(554.37, 0.14, "triangle", 0.08, 0.06);
    this.playTone(659.25, 0.18, "sine", 0.09, 0.12);
  }

  playUpgrade() {
    this.playTone(523.25, 0.12, "triangle", 0.08, 0);
    this.playTone(659.25, 0.14, "triangle", 0.09, 0.06);
    this.playTone(783.99, 0.16, "triangle", 0.09, 0.12);
    this.playTone(1046.5, 0.24, "sine", 0.1, 0.18);
  }

  playRepair() {
    this.playTone(380, 0.09, "sawtooth", 0.04, 0);
    this.playTone(590, 0.14, "sine", 0.07, 0.06);
  }

  playSell() {
    this.playTone(620, 0.09, "triangle", 0.07, 0);
    this.playTone(460, 0.14, "triangle", 0.07, 0.06);
  }

  playRocketLand() {
    const ctx = this._ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(98, now);
    osc.frequency.exponentialRampToValueAtTime(48, now + 0.85);
    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.92);
  }

  playStormSiren() {
    this.playTone(320, 0.24, "sawtooth", 0.05, 0);
    this.playTone(460, 0.28, "sawtooth", 0.05, 0.22);
  }

  playRaiderAlert() {
    this.playTone(640, 0.16, "square", 0.05, 0);
    this.playTone(480, 0.16, "square", 0.05, 0.16);
    this.playTone(640, 0.2, "square", 0.05, 0.32);
  }

  playTurretLaser() {
    const ctx = this._ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(240, now + 0.11);
    gain.gain.setValueAtTime(0.04, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.13);
  }

  playExplosion() {
    this.playTone(130, 0.32, "sawtooth", 0.09, 0);
    this.playTone(85, 0.42, "triangle", 0.1, 0.05);
    this.playTone(587.33, 0.2, "sine", 0.08, 0.25);
    this.playTone(880, 0.28, "sine", 0.09, 0.35);
  }

  playVictory() {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, idx) => {
      this.playTone(n, 0.24, "triangle", 0.09, idx * 0.09);
    });
  }
}
