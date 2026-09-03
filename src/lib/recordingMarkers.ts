import type { SessionDisplay, SwingMarkerSet } from "../types";

// Recorded video t=0 is the moment MediaRecorder.start() is called, which
// happens before the first swing's tempo begins so there is visible setup
// footage. Follow-through is NOT part of the measured tempo -- it only
// extends how long recording continues after the LAST swing's IMPACT.
export const FOLLOW_THROUGH_SECONDS = 1.75; // within the 1.5-2.0s suggested range

// Session-mode initial lead-in: recording starts immediately, then a visible
// 5-4-3-2-1 count down, then a short "GET READY" pause before Swing 1 START.
// Neither is part of the measured tempo.
export const SESSION_COUNTDOWN_SECONDS = 5;
export const SESSION_GET_READY_SECONDS = 2;
export const SESSION_INITIAL_DELAY_SECONDS = SESSION_COUNTDOWN_SECONDS + SESSION_GET_READY_SECONDS;

// ONE shared tempo model, the master session timeline: every swing's
// markers are plain arithmetic derived from the exact same
// backswingDuration/downswingDuration passed into useSwingTrainer /
// TempoAudioEngine, plus the same restBetweenSwings the audio engine's
// own repeat scheduling uses. Nothing here is measured from a separate
// timer -- the audio engine is given the identical initialDelay and
// restSeconds, so what it actually plays lines up with what this computes.
export function computeSessionMarkers(
  initialDelay: number,
  swingCount: number,
  backswingDuration: number,
  downswingDuration: number,
  restBetweenSwings: number,
): SwingMarkerSet[] {
  const swingDuration = backswingDuration + downswingDuration;
  const swings: SwingMarkerSet[] = [];
  for (let i = 0; i < swingCount; i++) {
    const start = initialDelay + i * (swingDuration + restBetweenSwings);
    const top = start + backswingDuration;
    const impact = top + downswingDuration;
    swings.push({ swingNumber: i + 1, start, top, impact });
  }
  return swings;
}

export function computeSessionRecordingDurationSeconds(
  initialDelay: number,
  swingCount: number,
  backswingDuration: number,
  downswingDuration: number,
  restBetweenSwings: number,
): number {
  const swings = computeSessionMarkers(initialDelay, swingCount, backswingDuration, downswingDuration, restBetweenSwings);
  const last = swings[swings.length - 1];
  return last.impact + FOLLOW_THROUGH_SECONDS;
}

// Derives what the live "SWING n/m" / "NEXT SWING IN x" overlay should show
// purely from elapsed wall-clock time and the precomputed swings array --
// self-correcting every poll, so a late tick can't accumulate drift.
export function computeSessionDisplay(
  elapsedSeconds: number,
  swings: SwingMarkerSet[],
  swingDuration: number,
): SessionDisplay {
  if (elapsedSeconds < SESSION_COUNTDOWN_SECONDS) {
    return { phase: "countdown", value: Math.max(1, SESSION_COUNTDOWN_SECONDS - Math.floor(elapsedSeconds)) };
  }
  if (swings.length === 0 || elapsedSeconds < swings[0].start) {
    return { phase: "get-ready" };
  }
  for (let i = 0; i < swings.length; i++) {
    const swing = swings[i];
    const swingEnd = swing.start + swingDuration;
    if (elapsedSeconds < swingEnd) {
      return { phase: "swing", swingIndex: i };
    }
    const next = swings[i + 1];
    if (next && elapsedSeconds < next.start) {
      return { phase: "between", swingIndex: i, nextIn: Math.max(1, Math.ceil(next.start - elapsedSeconds)) };
    }
  }
  return { phase: "done" };
}
