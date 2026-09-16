import type { SwingPhase } from "../types";
import { schedulePhaseClickAt } from "./clickSound";

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

  // initialDelaySeconds lets a caller (e.g. Camera Practice's start countdown)
  // push the first swing further out while still unlocking/resuming the
  // AudioContext synchronously within the user's START gesture, as required
  // by mobile autoplay policies. Default matches the trainer's original timing.
  //
  // Never fails silently: browsers (Safari especially) can refuse to create
  // or resume an AudioContext -- e.g. Safari has historically capped how
  // many concurrent AudioContext instances a page may hold, and a leaked
  // one from a previous session hitting that cap would otherwise just make
  // Start do nothing with no explanation. Every failure path here throws a
  // specific, user-facing message instead.
  async start(initialDelaySeconds = 0.1) {
    let ctx: AudioContext;
    try {
      ctx = this.getContext();
    } catch {
      throw new Error("Could not start audio. Try reloading the page.");
    }

    if (ctx.state === "suspended") {
      try {
        await ctx.resume();
      } catch {
        throw new Error("Audio could not be unlocked. Try tapping Start again.");
      }
    }

    if (ctx.state !== "running") {
      throw new Error("Audio is blocked by the browser. Check this site's sound/autoplay permission and try again.");
    }

    this.nextSwingTime = ctx.currentTime + initialDelaySeconds;
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

  // Actually releases the AudioContext -- stop() alone leaves it open.
  // Call this when the engine itself is being discarded (component
  // unmount), not on an ordinary user Stop press within the same session:
  // a fresh TempoAudioEngine is created per mount, so never closing the
  // previous one leaked an AudioContext on every practice session. Safari
  // in particular has a hard limit on how many can exist at once.
  close() {
    this.stop();
    if (this.ctx && this.ctx.state !== "closed") {
      this.ctx.close().catch(() => {});
    }
    this.ctx = null;
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
    const ctx = this.getContext();

    schedulePhaseClickAt(ctx, startTime, "start");
    schedulePhaseClickAt(ctx, topTime, "top");
    schedulePhaseClickAt(ctx, impactTime, "impact");

    this.scheduleVisual(startTime, "start");
    this.scheduleVisual(topTime, "top");
    this.scheduleVisual(impactTime, "impact");
  }

  private scheduleVisual(time: number, phase: SwingPhase) {
    const ctx = this.getContext();
    const delayMs = Math.max(0, (time - ctx.currentTime) * 1000);
    const id = window.setTimeout(() => this.onPhase(phase), delayMs);
    this.visualTimeouts.push(id);
  }
}
