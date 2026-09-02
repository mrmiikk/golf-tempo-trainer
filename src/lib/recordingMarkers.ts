import type { VideoTempoMarkers } from "../types";

// Recorded video t=0 is the moment MediaRecorder.start() is called, which
// happens before the preparation delay elapses so there is visible setup
// footage. Follow-through is NOT part of the measured tempo -- it only
// extends how long recording continues after IMPACT.
export const FOLLOW_THROUGH_SECONDS = 1.75; // within the 1.5-2.0s suggested range

// ONE shared tempo model: these are the exact same backswingDuration /
// downswingDuration values passed into useSwingTrainer / TempoAudioEngine,
// so the markers are derived from the same source the audio scheduler
// uses -- not a separate, unrelated timer.
export function computeVideoMarkers(
  preparationDelay: number,
  backswingDuration: number,
  downswingDuration: number,
): VideoTempoMarkers {
  const start = preparationDelay;
  const top = start + backswingDuration;
  const impact = top + downswingDuration;
  return { start, top, impact };
}

export function computeRecordingDurationSeconds(
  preparationDelay: number,
  backswingDuration: number,
  downswingDuration: number,
): number {
  return preparationDelay + backswingDuration + downswingDuration + FOLLOW_THROUGH_SECONDS;
}
