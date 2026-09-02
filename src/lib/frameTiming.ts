// Practical fallback when the real per-frame duration can't be measured:
// modern phone video is very often 60fps, and 1/60s is a reasonable manual
// step even when the source is actually 30fps (it just steps in half-frames).
export const FALLBACK_FRAME_SECONDS = 1 / 60;

type FrameMetadata = { mediaTime: number };
type VideoWithFrameCallback = HTMLVideoElement & {
  requestVideoFrameCallback?: (cb: (now: number, metadata: FrameMetadata) => void) => number;
};

// Best-effort detection of the recorded video's actual frame duration via
// requestVideoFrameCallback (supported in Chrome/Edge and Safari 15.4+).
// Plays the video briefly, samples the gaps between delivered frame
// timestamps, and takes the median. Falls back to FALLBACK_FRAME_SECONDS
// when the API is unavailable or the samples are inconclusive -- exact
// source fps cannot always be obtained from the browser.
export function detectFrameSeconds(video: VideoWithFrameCallback): Promise<number> {
  return new Promise((resolve) => {
    if (typeof video.requestVideoFrameCallback !== "function") {
      resolve(FALLBACK_FRAME_SECONDS);
      return;
    }

    const samples: number[] = [];
    let settled = false;
    const finish = (value: number) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    const onFrame = (_now: number, metadata: FrameMetadata) => {
      if (settled) return;
      samples.push(metadata.mediaTime);
      if (samples.length >= 8) {
        const deltas = samples
          .slice(1)
          .map((t, i) => t - samples[i])
          .filter((d) => d > 0.002 && d < 0.1);
        if (deltas.length >= 3) {
          const sorted = [...deltas].sort((a, b) => a - b);
          finish(sorted[Math.floor(sorted.length / 2)]);
          return;
        }
        finish(FALLBACK_FRAME_SECONDS);
        return;
      }
      video.requestVideoFrameCallback?.(onFrame);
    };

    video.requestVideoFrameCallback(onFrame);
    video.play().catch(() => finish(FALLBACK_FRAME_SECONDS));
    window.setTimeout(() => finish(FALLBACK_FRAME_SECONDS), 1200);
  });
}
