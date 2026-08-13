import type { SwingPhase } from "../types";

// Classic look-ahead scheduler: audio timing is driven entirely by
// AudioContext.currentTime, never by chained setTimeout calls, so the
// rhythm doesn't drift across many repeated swings. setTimeout is only
// used to fire the (non-critical) visual indicator flashes.
const LOOKAHEAD_MS = 25;
const SCHEDULE_AHEAD_SEC = 0.15;

export class TempoAudioEngine {
  private ctx: AudioContext | null = null;
  private schedulerId: number | null = null;
  private nextSwingTime = 0;
  private visualTimeouts: number[] = [];
  private backswingDuration: number;
  private downswingDuration: number;
  private restSeconds: number;
  private onPhase: (phase: SwingPhase) => void;

  constructor(
    backswingDuration: number,
    downswingDuration: number,
    restSeconds: number,
    onPhase: (phase: SwingPhase) => void,
  ) {
    this.backswingDuration = backswingDuration;
    this.downswingDuration = downswingDuration;
    this.restSeconds = restSeconds;
    this.onPhase = onPhase;
  }

  update(backswingDuration: number, downswingDuration: number, restSeconds: number) {
    this.backswingDuration = backswingDuration;
    this.downswingDuration = downswingDuration;
    this.restSeconds = restSeconds;
  }

  async start() {
    const ctx = this.getContext();
    if (ctx.state === "suspended") {
      await ctx.resume();
    }
    this.nextSwingTime = ctx.currentTime + 0.1;
    this.tick();
    this.schedulerId = window.setInterval(() => this.tick(), LOOKAHEAD_MS);
  }

  stop() {
    if (this.schedulerId !== null) {
      window.clearInterval(this.schedulerId);
      this.schedulerId = null;
    }
    this.visualTimeouts.forEach((id) => window.clearTimeout(id));
    this.visualTimeouts = [];
  }

  private getContext(): AudioContext {
    if (!this.ctx) {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioContextClass();
    }
    return this.ctx;
  }

  private tick() {
    const ctx = this.getContext();
    while (this.nextSwingTime < ctx.currentTime + SCHEDULE_AHEAD_SEC) {
      this.scheduleSwing(this.nextSwingTime);
      const swingDuration = this.backswingDuration + this.downswingDuration;
      this.nextSwingTime += swingDuration + this.restSeconds;
    }
  }

  private scheduleSwing(startTime: number) {
    const topTime = startTime + this.backswingDuration;
    const impactTime = topTime + this.downswingDuration;

    this.scheduleClick(startTime, 700, 0.4);
    this.scheduleClick(topTime, 900, 0.4);
    this.scheduleClick(impactTime, 1200, 0.7);

    this.scheduleVisual(startTime, "start");
    this.scheduleVisual(topTime, "top");
    this.scheduleVisual(impactTime, "impact");
  }

  private scheduleClick(time: number, frequency: number, peakGain: number) {
    const ctx = this.getContext();
    const duration = 0.045;
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

  private scheduleVisual(time: number, phase: SwingPhase) {
    const ctx = this.getContext();
    const delayMs = Math.max(0, (time - ctx.currentTime) * 1000);
    const id = window.setTimeout(() => this.onPhase(phase), delayMs);
    this.visualTimeouts.push(id);
  }
}
