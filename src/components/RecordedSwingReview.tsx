import { useCallback, useEffect, useRef, useState } from "react";
import type { PlaybackSpeed, RecordedSwing, RecordingStage, SwingPhase, SwingRating, VideoTempoMarkers } from "../types";
import { resolveVideoDuration } from "../lib/videoRecording";
import { detectFrameSeconds, FALLBACK_FRAME_SECONDS } from "../lib/frameTiming";
import { scheduleReviewClicks } from "../lib/reviewClickPlayback";
import { MarkerButtons } from "./MarkerButtons";
import { TempoMarkerTimeline } from "./TempoMarkerTimeline";
import { FrameControls } from "./FrameControls";
import { PlaybackSpeedControl } from "./PlaybackSpeedControl";

type Props = {
  recordedSwing: RecordedSwing;
  stage: RecordingStage; // only "processing" or "review" while this is mounted
  onProcessed: (duration: number) => void;
  onRetake: () => void;
  onRecordAnother: () => void;
};

function fileExtension(mimeType: string): string {
  return mimeType.includes("mp4") ? "mp4" : "webm";
}

export function RecordedSwingReview({ recordedSwing, stage, onProcessed, onRetake, onRecordAnother }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<PlaybackSpeed>(0.5);
  const [frameSeconds, setFrameSeconds] = useState(FALLBACK_FRAME_SECONDS);
  const [activeMarker, setActiveMarker] = useState<SwingPhase | null>(null);
  const [adjustmentsMs, setAdjustmentsMs] = useState<Record<SwingPhase, number>>({ start: 0, top: 0, impact: 0 });
  const [ratings, setRatings] = useState<Partial<Record<SwingPhase, SwingRating>>>({});
  const [playWithClicks, setPlayWithClicks] = useState(false);

  const effectiveMarkers: VideoTempoMarkers = {
    start: recordedSwing.markers.start + adjustmentsMs.start / 1000,
    top: recordedSwing.markers.top + adjustmentsMs.top / 1000,
    impact: recordedSwing.markers.impact + adjustmentsMs.impact / 1000,
  };

  // Runs once per recording: fixes Chrome's "duration: Infinity" WebM quirk
  // and best-effort detects the real per-frame duration for frame stepping.
  // Both steps are timeout-guarded so a browser-specific edge case can never
  // leave the user stuck on "Processing..." forever -- it just falls back
  // to the safe default and moves on.
  //
  // This is a plain cancelable effect with NO "already ran" ref guard on
  // purpose: React 18 StrictMode intentionally double-invokes effects in
  // development (mount -> cleanup -> mount) specifically to verify this
  // exact pattern is safe to re-run. A guard that blocks the second
  // invocation while the first invocation's cleanup has already flipped
  // `cancelled` on the only real async chain leaves nothing to ever call
  // onProcessed -- which is exactly the bug that produced a stuck
  // "Processing..." screen in development.
  useEffect(() => {
    if (stage !== "processing") return;
    const video = videoRef.current;
    if (!video) return;
    let cancelled = false;

    const withTimeout = <T,>(promise: Promise<T>, ms: number, fallback: T): Promise<T> =>
      Promise.race([promise, new Promise<T>((resolve) => window.setTimeout(() => resolve(fallback), ms))]);

    (async () => {
      const duration = await withTimeout(resolveVideoDuration(video), 2000, video.duration || 0);
      if (cancelled) return;
      // Give any pending seek from the duration fix a moment to settle
      // before probing playback for frame timing.
      await new Promise((resolve) => window.setTimeout(resolve, 60));
      if (cancelled) return;
      const fps = await withTimeout(detectFrameSeconds(video), 1500, FALLBACK_FRAME_SECONDS);
      if (cancelled) return;
      video.pause();
      video.currentTime = 0;
      setFrameSeconds(fps);
      onProcessed(duration);
    })();

    return () => {
      cancelled = true;
    };
  }, [stage, onProcessed]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onTimeUpdate = () => setCurrentTime(video.currentTime);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("ended", onPause);
    return () => {
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("ended", onPause);
    };
  }, []);

  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = playbackSpeed;
  }, [playbackSpeed]);

  useEffect(
    () => () => {
      audioCtxRef.current?.close().catch(() => {});
    },
    [],
  );

  const seekTo = useCallback(
    (time: number) => {
      const video = videoRef.current;
      if (!video) return;
      const max = recordedSwing.duration > 0 ? recordedSwing.duration : video.duration || time;
      video.pause();
      video.currentTime = Math.min(Math.max(0, time), Number.isFinite(max) ? max : time);
      setCurrentTime(video.currentTime);
    },
    [recordedSwing.duration],
  );

  const jumpToMarker = useCallback(
    (marker: SwingPhase) => {
      setActiveMarker(marker);
      seekTo(effectiveMarkers[marker]);
    },
    // effectiveMarkers is a fresh object every render (cheap); intentional.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [seekTo, effectiveMarkers.start, effectiveMarkers.top, effectiveMarkers.impact],
  );

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      if (playWithClicks) {
        try {
          const AudioContextClass =
            window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
          const ctx = audioCtxRef.current ?? new AudioContextClass();
          audioCtxRef.current = ctx;
          if (ctx.state === "suspended") void ctx.resume();
          scheduleReviewClicks(ctx, video, effectiveMarkers);
        } catch {
          // Web Audio unavailable; video still plays, just without recreated clicks.
        }
      }
      video.play().catch(() => {});
    } else {
      video.pause();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playWithClicks, effectiveMarkers.start, effectiveMarkers.top, effectiveMarkers.impact]);

  const stepFrame = useCallback(
    (direction: 1 | -1) => {
      const video = videoRef.current;
      if (!video) return;
      seekTo(video.currentTime + direction * frameSeconds);
    },
    [frameSeconds, seekTo],
  );

  const nudge = useCallback(
    (ms: number) => {
      const video = videoRef.current;
      if (!video) return;
      seekTo(video.currentTime + ms / 1000);
    },
    [seekTo],
  );

  const adjustMarker = useCallback((marker: SwingPhase, deltaMs: number) => {
    setAdjustmentsMs((prev) => ({ ...prev, [marker]: prev[marker] + deltaMs }));
  }, []);

  const rateMarker = useCallback((marker: SwingPhase, rating: SwingRating) => {
    setRatings((prev) => ({ ...prev, [marker]: rating }));
  }, []);

  return (
    <div className="swing-review">
      <p className="eyebrow">Swing Review</p>
      <div className="camera-tempo-readout">
        <span className="camera-tempo-name">Target: {recordedSwing.tempo.name}</span>
        <span className="camera-tempo-ratio">{recordedSwing.tempo.ratio.toFixed(2)} : 1</span>
      </div>

      <div className="review-video-stage">
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video ref={videoRef} className="review-video" src={recordedSwing.videoUrl} playsInline muted />
        {stage === "processing" && <div className="review-processing-overlay">Processing…</div>}
      </div>

      <MarkerButtons activeMarker={activeMarker} onJump={jumpToMarker} ratings={ratings} onRate={rateMarker} />

      <TempoMarkerTimeline
        duration={recordedSwing.duration}
        currentTime={currentTime}
        markers={effectiveMarkers}
        onSeek={seekTo}
      />

      <FrameControls isPlaying={isPlaying} onTogglePlay={togglePlay} onStepFrame={stepFrame} onNudge={nudge} />

      <PlaybackSpeedControl value={playbackSpeed} onChange={setPlaybackSpeed} />

      <div className="review-marker-times">
        <div>
          <span className="label">Start</span>
          <span className="value">{effectiveMarkers.start.toFixed(3)}s</span>
        </div>
        <div>
          <span className="label">Top</span>
          <span className="value">{effectiveMarkers.top.toFixed(3)}s</span>
        </div>
        <div>
          <span className="label">Impact</span>
          <span className="value">{effectiveMarkers.impact.toFixed(3)}s</span>
        </div>
      </div>

      {activeMarker && (
        <div className="marker-fine-tune">
          <p className="start-delay-label">{activeMarker.toUpperCase()} target fine-tune</p>
          <div className="marker-fine-tune-controls">
            <button type="button" onClick={() => adjustMarker(activeMarker, -10)}>
              -10ms
            </button>
            <span className="marker-fine-tune-value">
              {adjustmentsMs[activeMarker] > 0 ? "+" : ""}
              {adjustmentsMs[activeMarker]}ms
            </span>
            <button type="button" onClick={() => adjustMarker(activeMarker, 10)}>
              +10ms
            </button>
          </div>
        </div>
      )}

      <div className="review-toggle-row">
        <button
          type="button"
          className={`camera-control-chip${playWithClicks ? " is-on" : ""}`}
          onClick={() => setPlayWithClicks((value) => !value)}
          aria-pressed={playWithClicks}
        >
          Play with tempo clicks: {playWithClicks ? "On" : "Off"}
        </button>
        <a
          className="camera-control-chip"
          href={recordedSwing.videoUrl}
          download={`swing-${recordedSwing.tempo.name.replace("/", "-")}.${fileExtension(recordedSwing.mimeType)}`}
        >
          Save Video
        </a>
      </div>

      <div className="review-actions">
        <button type="button" className="btn-outline" onClick={onRetake}>
          Retake
        </button>
        <button type="button" className="btn-primary" onClick={onRecordAnother}>
          Record Another
        </button>
      </div>
      <p className="camera-privacy-note">Your video stays on this device and is not uploaded.</p>
    </div>
  );
}
