// MediaRecorder codec support varies a lot by browser (iOS Safari only
// speaks MP4/H.264, Chrome/Android only speaks WebM), so the actual mime
// type used must be feature-detected rather than assumed.
const CANDIDATE_MIME_TYPES = [
  "video/mp4;codecs=avc1",
  "video/mp4",
  "video/webm;codecs=vp9",
  "video/webm;codecs=vp8",
  "video/webm",
];

export function pickSupportedMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined" || typeof MediaRecorder.isTypeSupported !== "function") {
    return undefined;
  }
  return CANDIDATE_MIME_TYPES.find((type) => {
    try {
      return MediaRecorder.isTypeSupported(type);
    } catch {
      return false;
    }
  });
}

export function isRecordingSupported(): boolean {
  return typeof MediaRecorder !== "undefined";
}

// Chrome (and some other browsers) can hand back a WebM blob whose
// video.duration reads Infinity until the file has been played/seeked
// through once. Seeking near the end forces it to index the file and
// report a real duration; seeking back to 0 leaves playback ready to go.
// No-op (resolves immediately) on a video that already reports correctly.
export function resolveVideoDuration(video: HTMLVideoElement): Promise<number> {
  return new Promise((resolve) => {
    if (Number.isFinite(video.duration) && video.duration > 0) {
      resolve(video.duration);
      return;
    }
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      video.removeEventListener("timeupdate", onTimeUpdate);
      const duration = Number.isFinite(video.duration) ? video.duration : 0;
      video.currentTime = 0;
      resolve(duration);
    };
    const onTimeUpdate = () => finish();
    video.addEventListener("timeupdate", onTimeUpdate);
    video.currentTime = Number.MAX_SAFE_INTEGER;
    window.setTimeout(finish, 1500);
  });
}

// Calling play() while a seek is still in flight can stall a recorded
// Blob's decoder (playback silently never advances). Resolves immediately
// if no seek is pending, otherwise waits for the "seeked" event (with a
// safety timeout so a browser that never fires it can't hang playback).
export function waitForSeek(video: HTMLVideoElement): Promise<void> {
  if (!video.seeking) return Promise.resolve();
  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      video.removeEventListener("seeked", onSeeked);
      resolve();
    };
    const onSeeked = () => finish();
    video.addEventListener("seeked", onSeeked);
    window.setTimeout(finish, 500);
  });
}
