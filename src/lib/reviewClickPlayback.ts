import { schedulePhaseClickAt } from "../audio/clickSound";
import type { SwingMarkerSet, SwingPhase } from "../types";

// One-shot replay of every swing's tempo clicks synced to a <video>
// element's own clock, for Swing Review's "Play with tempo". This is
// deliberately a separate, simple scheduler from TempoAudioEngine (which is
// built around indefinitely repeating swings) but reuses the same click
// sound generator so there is exactly one place that defines the sound.
// Schedules every marker at or after the video's current position across
// ALL swings in the session, not just one.
export function scheduleReviewClicks(ctx: AudioContext, video: HTMLVideoElement, swings: SwingMarkerSet[]) {
  const now = ctx.currentTime;
  const videoNow = video.currentTime;
  const rate = video.playbackRate || 1;

  for (const swing of swings) {
    const entries: Array<[SwingPhase, number]> = [
      ["start", swing.start],
      ["top", swing.top],
      ["impact", swing.impact],
    ];
    for (const [phase, offset] of entries) {
      if (offset >= videoNow) {
        const delaySeconds = (offset - videoNow) / rate;
        schedulePhaseClickAt(ctx, now + delaySeconds, phase);
      }
    }
  }
}
