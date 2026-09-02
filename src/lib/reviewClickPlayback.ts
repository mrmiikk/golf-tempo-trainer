import { schedulePhaseClickAt } from "../audio/clickSound";
import type { SwingPhase, VideoTempoMarkers } from "../types";

// One-shot replay of the three tempo clicks synced to a <video> element's
// own clock, for Swing Review's optional "play with tempo clicks". This is
// deliberately a separate, simple scheduler from TempoAudioEngine (which is
// built around indefinitely repeating swings) but reuses the same click
// sound generator so there is exactly one place that defines the sound.
export function scheduleReviewClicks(ctx: AudioContext, video: HTMLVideoElement, markers: VideoTempoMarkers) {
  const now = ctx.currentTime;
  const videoNow = video.currentTime;
  const rate = video.playbackRate || 1;
  const entries: Array<[SwingPhase, number]> = [
    ["start", markers.start],
    ["top", markers.top],
    ["impact", markers.impact],
  ];
  for (const [phase, offset] of entries) {
    if (offset >= videoNow) {
      const delaySeconds = (offset - videoNow) / rate;
      schedulePhaseClickAt(ctx, now + delaySeconds, phase);
    }
  }
}
