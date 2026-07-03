/**
 * Robust Dual-Engine Audio Player for Tic-Tac-Toe.
 * Combines Web Audio API with procedural HTML5 WAV data URL synthesis
 * to guarantee audible sound effects even inside restricted browser iframes.
 */

export type SoundType = 'markX' | 'markO' | 'toggle' | 'toAI' | 'to2p' | 'restart' | 'win' | 'draw' | 'unmute';

class SoundEngine {
  private ctx: AudioContext | null = null;
  private audioCache: Partial<Record<SoundType, HTMLAudioElement>> = {};
  private isUnlocked: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      // Pre-synthesize HTML5 audio fallbacks
      setTimeout(() => this.initWavCache(), 50);

      // Global unlock listener for browser autoplay policies
      const unlock = () => {
        const ctx = this.getContext();
        if (ctx && ctx.state === 'suspended') {
          ctx.resume().catch(() => {});
        }
        this.isUnlocked = true;
      };
      window.addEventListener('click', unlock, { passive: true });
      window.addEventListener('keydown', unlock, { passive: true });
      window.addEventListener('touchstart', unlock, { passive: true });
    }
  }

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  /**
   * Synthesizes 16-bit PCM mono WAV blobs for HTML5 Audio playback fallback.
   */
  private initWavCache() {
    try {
      const sampleRate = 22050;
      const generateWav = (generator: (t: number, i: number) => number, durationSec: number): HTMLAudioElement => {
        const numSamples = Math.floor(sampleRate * durationSec);
        const buffer = new ArrayBuffer(44 + numSamples * 2);
        const view = new DataView(buffer);

        const writeString = (offset: number, str: string) => {
          for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
        };

        writeString(0, 'RIFF');
        view.setUint32(4, 36 + numSamples * 2, true);
        writeString(8, 'WAVE');
        writeString(12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        view.setUint16(22, 1, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * 2, true);
        view.setUint16(32, 2, true);
        view.setUint16(34, 16, true);
        writeString(36, 'data');
        view.setUint32(40, numSamples * 2, true);

        let offset = 44;
        for (let i = 0; i < numSamples; i++) {
          const t = i / sampleRate;
          let sample = generator(t, i);
          sample = Math.max(-1, Math.min(1, sample));
          view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
          offset += 2;
        }

        const blob = new Blob([buffer], { type: 'audio/wav' });
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.preload = 'auto';
        return audio;
      };

      // markX: Calm, warm marimba / wooden tap tone (C5 note ~523Hz)
      this.audioCache.markX = generateWav((t) => {
        const env = Math.max(0, 1 - t / 0.16);
        const freq = 523.25; // C5
        // Pure warm triangle/sine blend
        return Math.sin(2 * Math.PI * freq * t) * Math.pow(env, 1.8) * 0.55;
      }, 0.18);

      // markO: Gentle crystal waterdrop / bell tone (E5 note ~659Hz)
      this.audioCache.markO = generateWav((t) => {
        const env = Math.max(0, 1 - t / 0.22);
        const freq = 659.25; // E5
        return Math.sin(2 * Math.PI * freq * t) * Math.pow(env, 1.5) * 0.5;
      }, 0.24);

      // unmute / toggle: Soft relaxing drop blip (G5 note ~784Hz)
      this.audioCache.unmute = generateWav((t) => {
        const env = Math.max(0, 1 - t / 0.12);
        const freq = 783.99; // G5
        return Math.sin(2 * Math.PI * freq * t) * Math.pow(env, 2) * 0.45;
      }, 0.14);
      this.audioCache.toggle = this.audioCache.unmute;

      // win: Calming harmonious arpeggio chime (C5 - E5 - G5 - C6)
      this.audioCache.win = generateWav((t) => {
        const freqs = [523.25, 659.25, 783.99, 1046.50];
        const noteIdx = Math.min(3, Math.floor(t / 0.12));
        const noteT = t % 0.12;
        const env = Math.max(0, 1 - noteT / 0.12);
        return Math.sin(2 * Math.PI * freqs[noteIdx] * t) * Math.pow(env, 1.4) * 0.5;
      }, 0.50);

      // draw: Soft relaxing resolving chord
      this.audioCache.draw = generateWav((t) => {
        const env = Math.max(0, 1 - t / 0.35);
        const freq = 440; // A4
        return Math.sin(2 * Math.PI * freq * t) * Math.pow(env, 1.5) * 0.4;
      }, 0.38);

      // restart: Gentle ascending harp chime
      this.audioCache.restart = generateWav((t) => {
        const freqs = [392, 523.25, 659.25];
        const noteIdx = Math.min(2, Math.floor(t / 0.08));
        const noteT = t % 0.08;
        const env = Math.max(0, 1 - noteT / 0.08);
        return Math.sin(2 * Math.PI * freqs[noteIdx] * t) * Math.pow(env, 1.3) * 0.45;
      }, 0.26);
    } catch {
      // Ignore generation error
    }
  }

  public play(type: SoundType, isMuted: boolean) {
    if (isMuted) return;

    // 1. Play HTML5 Audio fallback (works even when Web Audio is restricted)
    const cachedAudio = this.audioCache[type];
    if (cachedAudio) {
      try {
        cachedAudio.currentTime = 0;
        cachedAudio.play().catch(() => {});
      } catch {
        // Ignore play error
      }
    }

    // 2. Play Web Audio API synthesis for extra crispness & layered richness
    const ctx = this.getContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const t = ctx.currentTime;

    try {
      switch (type) {
        case 'markX': {
          // Warm marimba tap (C5 ~523Hz triangle wave with soft exponential decay)
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(523.25, t);
          osc.frequency.exponentialRampToValueAtTime(493.88, t + 0.16);
          gain.gain.setValueAtTime(0.35, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(t);
          osc.stop(t + 0.17);
          break;
        }

        case 'markO': {
          // Soft crystal waterdrop / bell chime (E5 ~659Hz sine wave)
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(659.25, t);
          gain.gain.setValueAtTime(0.3, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(t);
          osc.stop(t + 0.23);
          break;
        }

        case 'unmute':
        case 'toggle': {
          // Gentle soft drop note (G5 ~784Hz)
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(783.99, t);
          gain.gain.setValueAtTime(0.25, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(t);
          osc.stop(t + 0.13);
          break;
        }

        case 'toAI': {
          // Calming two-note interval C5 -> E5
          [523.25, 659.25].forEach((freq, i) => {
            const delay = i * 0.08;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, t + delay);
            gain.gain.setValueAtTime(0.2, t + delay);
            gain.gain.exponentialRampToValueAtTime(0.001, t + delay + 0.14);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(t + delay);
            osc.stop(t + delay + 0.15);
          });
          break;
        }

        case 'to2p': {
          // Calming two-note interval C5 -> G5
          [523.25, 783.99].forEach((freq, idx) => {
            const delay = idx * 0.08;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, t + delay);
            gain.gain.setValueAtTime(0.2, t + delay);
            gain.gain.exponentialRampToValueAtTime(0.001, t + delay + 0.18);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(t + delay);
            osc.stop(t + delay + 0.19);
          });
          break;
        }

        case 'restart': {
          // Gentle harp glissando G4 -> C5 -> E5
          [392, 523.25, 659.25].forEach((freq, idx) => {
            const delay = idx * 0.07;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, t + delay);
            gain.gain.setValueAtTime(0.2, t + delay);
            gain.gain.exponentialRampToValueAtTime(0.001, t + delay + 0.18);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(t + delay);
            osc.stop(t + delay + 0.19);
          });
          break;
        }

        case 'win': {
          // Harmonious celebratory arpeggio (C5 - E5 - G5 - C6)
          [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
            const s = t + idx * 0.1;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, s);
            gain.gain.setValueAtTime(0, s);
            gain.gain.linearRampToValueAtTime(0.25, s + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, s + 0.42);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(s);
            osc.stop(s + 0.43);
          });
          break;
        }

        case 'draw': {
          // Soft resolving chime
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(440, t);
          gain.gain.setValueAtTime(0.22, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(t);
          osc.stop(t + 0.36);
          break;
        }
      }
    } catch {
      // Ignore web audio errors
    }
  }
}

export const soundEngine = new SoundEngine();
