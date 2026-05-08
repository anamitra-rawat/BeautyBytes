export class SoundEngine {
  private ctx: AudioContext | null = null;
  private ambientOscillators: OscillatorNode[] = [];
  private ambientGains: GainNode[] = [];

  private init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playPop() {
    try {
      this.init();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      // Pitch sweeps down quickly for a "bloop/pop" sound
      osc.frequency.setValueAtTime(800, t);
      osc.frequency.exponentialRampToValueAtTime(100, t + 0.1);

      // Volume envelope
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.3, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.1);
    } catch (e) {
      console.error('Audio play failed', e);
    }
  }

  playSparkle() {
    try {
      this.init();
      if (!this.ctx) return;

      const playNote = (freq: number, delay: number, duration: number) => {
        const t = this.ctx!.currentTime + delay;
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        // Aesthetic chime: sine wave, very gentle volume
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t);

        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.05, t + 0.05); // Much quieter
        gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

        osc.connect(gain);
        gain.connect(this.ctx!.destination);

        osc.start(t);
        osc.stop(t + duration);
      };

      // Play a soft, gentle, cascading chord (makeup-esque mist/spritz feel)
      playNote(1318.51, 0, 0.5);    // E6
      playNote(1661.22, 0.08, 0.6); // G#6
      playNote(1975.53, 0.16, 0.7); // B6
      playNote(2637.02, 0.24, 0.8); // E7
    } catch (e) {
      console.error('Audio play failed', e);
    }
  }

  playType() {
    try {
      this.init();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(800, t);
      osc.frequency.exponentialRampToValueAtTime(1200, t + 0.05);

      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.02, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.05);
    } catch (e) {
      console.error('Audio play failed', e);
    }
  }

  playClick() {
    try {
      this.init();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, t);
      osc.frequency.exponentialRampToValueAtTime(100, t + 0.05);

      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.15, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.1);
    } catch (e) {
      console.error('Audio play failed', e);
    }
  }

  startAmbient() {
    try {
      this.init();
      if (!this.ctx) return;
      this.stopAmbient(); // Clear existing

      // "Springtime, happy, tranquil" chord (F# Major 9: F#3, A#3, C#4, E#4, G#4)
      // High, bright, airy. Using sine and triangle waves.
      const baseFreq = 184.99; // F#3
      const frequencies = [
        baseFreq,            // F#3
        baseFreq * 1.25,     // A#3
        baseFreq * 1.498,    // C#4
        baseFreq * 1.887,    // E#4 / F4
        baseFreq * 2.245     // G#4
      ];

      frequencies.forEach((freq, i) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        // Mix of sine and triangle for a brighter, airy "spring" feel
        osc.type = i % 2 === 0 ? 'sine' : 'triangle';

        // Add a very slow vibrato/chorus effect by detuning slightly
        const detuneAmount = (Math.random() - 0.5) * 4;
        osc.frequency.value = freq + detuneAmount;

        // Quiet, swelling volume
        gain.gain.value = 0;
        // The higher notes are quieter
        const targetVol = 0.035 - (i * 0.005);
        gain.gain.linearRampToValueAtTime(targetVol, this.ctx!.currentTime + 4);

        osc.connect(gain);
        gain.connect(this.ctx!.destination);

        osc.start();
        this.ambientOscillators.push(osc);
        this.ambientGains.push(gain);
      });
    } catch (e) {
      console.error('Ambient audio failed', e);
    }
  }

  stopAmbient() {
    try {
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      this.ambientGains.forEach(gain => {
        // Fade out over 2 seconds
        gain.gain.cancelScheduledValues(t);
        gain.gain.setValueAtTime(gain.gain.value, t);
        gain.gain.linearRampToValueAtTime(0.001, t + 1);
      });
      this.ambientOscillators.forEach(osc => {
        osc.stop(t + 1.1);
      });
      this.ambientOscillators = [];
      this.ambientGains = [];
    } catch (e) {
      console.error('Stop ambient failed', e);
    }
  }
}

export const soundEngine = new SoundEngine();
