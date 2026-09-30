import { Injectable } from '@angular/core';

/** C6, E6, G6: a rising major arpeggio, like a tap on fine glassware. */
const JOIN_NOTES_HZ = [1046.5, 1318.51, 1567.98];
const NOTE_GAP_S = 0.075;
const RING_S = 1.3;
const VOLUME = 0.16;

/**
 * Small UI sounds, synthesised with the Web Audio API (no audio files).
 * Call from a user gesture (tap, swipe release) so browsers allow playback.
 */
@Injectable({ providedIn: 'root' })
export class SoundService {
  private context?: AudioContext;

  /** A soft, bright chime for joining a gathering. */
  playJoin(): void {
    const ctx = this.audio();
    if (!ctx) return;
    const start = ctx.currentTime + 0.01;

    const master = ctx.createGain();
    master.gain.value = VOLUME;
    const tone = ctx.createBiquadFilter(); // takes the edge off the top end
    tone.type = 'lowpass';
    tone.frequency.value = 7000;
    master.connect(tone).connect(ctx.destination);

    JOIN_NOTES_HZ.forEach((freq, i) => {
      const at = start + i * NOTE_GAP_S;
      // A bell: the fundamental plus a quieter, faster-fading inharmonic partial.
      this.partial(ctx, master, freq, at, RING_S, 1);
      this.partial(ctx, master, freq * 2.76, at, RING_S * 0.45, 0.18);
    });
  }

  private partial(ctx: AudioContext, out: AudioNode, freq: number, at: number, ring: number, level: number): void {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, at);
    env.gain.exponentialRampToValueAtTime(level, at + 0.008); // quick, soft strike
    env.gain.exponentialRampToValueAtTime(0.0001, at + ring); // natural ring-out
    osc.connect(env).connect(out);
    osc.start(at);
    osc.stop(at + ring + 0.05);
  }

  private audio(): AudioContext | null {
    try {
      const Ctor =
        globalThis.AudioContext ??
        (globalThis as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      this.context ??= new Ctor();
      if (this.context.state === 'suspended') void this.context.resume();
      return this.context;
    } catch {
      return null; // audio unavailable; stay silent
    }
  }
}
