import type { SwingPhase } from "../types";

// Shared by TempoAudioEngine (the repeating practice scheduler) and the
// Swing Review "play with tempo clicks" one-shot replay, so the actual
// click sound is defined in exactly one place.
export const CLICK_FREQUENCIES: Record<SwingPhase, number> = {
  start: 700,
  top: 900,
  impact: 1200,
};

export const CLICK_PEAK_GAINS: Record<SwingPhase, number> = {
  start: 0.4,
  top: 0.4,
  impact: 0.7,
};

export const CLICK_DURATION_SECONDS = 0.045;

export function scheduleClickAt(ctx: AudioContext, time: number, frequency: number, peakGain: number) {
  const duration = CLICK_DURATION_SECONDS;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "sine";
  osc.frequency.value = frequency;

  gain.gain.setValueAtTime(0, time);
  gain.gain.linearRampToValueAtTime(peakGain, time + 0.004);
  gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(time);
  osc.stop(time + duration + 0.01);
}

export function schedulePhaseClickAt(ctx: AudioContext, time: number, phase: SwingPhase) {
  scheduleClickAt(ctx, time, CLICK_FREQUENCIES[phase], CLICK_PEAK_GAINS[phase]);
}
