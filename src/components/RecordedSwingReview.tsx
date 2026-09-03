import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  PlaybackSpeed,
  RecordedSwingSession,
  RecordingStage,
  SwingPhase,
  SwingRating,
  VideoTempoMarkers,
} from "../types";
import { resolveVideoDuration, waitForSeek } from "../lib/videoRecording";
import { detectFrameSeconds, FALLBACK_FRAME_SECONDS } from "../lib/frameTiming";
import { scheduleReviewClicks } from "../lib/reviewClickPlayback";
import { MarkerButtons } from "./MarkerButtons";
import { TempoMarkerTimeline } from "./TempoMarkerTimeline";
import { FrameControls } from "./FrameControls";
import { PlaybackSpeedControl } from "./PlaybackSpeedControl";

const PLAY_SWING_LEAD_IN = 0.75;
const PLAY_SWING_TRAIL = 1.0;

type Props = {
  session: RecordedSwingSession;
  stage: RecordingStage; // only "processing" or "review" while this is mounted
  onProcessed: (duration: number) => void;
  onRetake: () => void;
  onRecordAnother: () => void;
};

function fileExtension(mimeType: string): string {
  return mimeType.includes("mp4") ? "mp4" : "webm";
}

const ZERO_ADJUSTMENTS: Record<SwingPhase, number> = { start: 0, top: 0, impact: 0 };

export function RecordedSwingReview({ session, stage, onProcessed, onRetake, onRecordAnother }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const playBoundRef = useRef<number | null>(null);

  const [selectedSwingIndex, setSelectedSwingIndex] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<PlaybackSpeed>(0.5);
  const [frameSeconds, setFrameSeconds] = useState(FALLBACK_FRAME_SECONDS);
  const [activeMarker, setActiveMarker] = useState<SwingPhase | null>(null);
  const [adjustmentsBySwing, setAdjustmentsBySwing] = useState<Record<number, Record<SwingPhase, number>>>({});
  const [ratingsBySwing, setRatingsBySwing] = useState<Record<number, Partial<Record<SwingPhase, SwingRating>>>>({});
  const [reviewedSwings, setReviewedSwings] = useState<Set<number>>(new Set());
  const [playWithClicks, setPlayWithClicks] = useState(false);

  const selectedSwing = session.swings[selectedSwingIndex];
  const swingAdjustments = adjustmentsBySwing[selectedSwing.swingNumber] ?? ZERO_ADJUSTMENTS;
  const swingRatings = ratingsBySwing[selectedSwing.swingNumber] ?? {};

  const effectiveMarkers: VideoTempoMarkers = useMemo(
    () => ({
      start: selectedSwing.start + swingAdjustments.start / 1000,
      top: selectedSwing.top + swingAdjustments.top / 1000,
      impact: selectedSwing.impact + swingAdjustments.impact / 1000,
    }),
    [selectedSwing, swingAdjustments],
  );

  const markReviewed = useCallback((swingNumber: number) => {
    setReviewedSwings((prev) => {
      if (prev.has(swingNumber)) return prev;
      const next = new Set(prev);
      next.add(swingNumber);
      return next;
    });
  }, []);

  // Runs once per recording: fixes Chrome's "duration: Infinity" WebM quirk
  // and best-effort detects the real per-frame duration for frame stepping.
  // Both steps are timeout-guarded so a browser-specific edge case can never
  // leave the user stuck on "Processing..." forever -- it just falls back
  // to the safe default and moves on.
  //
  // This is a plain cancelable effect with NO "already ran" ref guard on
  // purpose: React 18 StrictMode intentionally double-invokes effects in
  // development (mount -> cleanup -> mount) specifically to verify this
  // exact pattern is safe to re-run.
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
    const onTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      if (playBoundRef.current !== null && video.currentTime >= playBoundRef.current) {
        playBoundRef.current = null;
        video.pause();
      }
    };
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

  // Selecting a different swing jumps the video to just before its START so
  // the golfer can immediately see that attempt without hunting the timeline.
  useEffect(() => {
    if (stage !== "review") return;
    const video = videoRef.current;
    if (!video) return;
    playBoundRef.current = null;
    video.pause();
    const target = Math.max(0, selectedSwing.start - PLAY_SWING_LEAD_IN);
    video.currentTime = target;
    setCurrentTime(target);
    setActiveMarker(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSwingIndex, stage]);

  const seekTo = useCallback(
    (time: number) => {
      const video = videoRef.current;
      if (!video) return;
      const max = session.duration > 0 ? session.duration : video.duration || time;
      playBoundRef.current = null;
      video.pause();
      video.currentTime = Math.min(Math.max(0, time), Number.isFinite(max) ? max : time);
      setCurrentTime(video.currentTime);
    },
    [session.duration],
  );

  const jumpToMarker = useCallback(
    (marker: SwingPhase) => {
      setActiveMarker(marker);
      markReviewed(selectedSwing.swingNumber);
      seekTo(effectiveMarkers[marker]);
    },
    [seekTo, effectiveMarkers, markReviewed, selectedSwing.swingNumber],
  );

  const maybeScheduleClicks = useCallback(
    (video: HTMLVideoElement) => {
      if (!playWithClicks) return;
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
    },
    [playWithClicks, effectiveMarkers],
  );

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      // A recorded Blob's decoder can stall if play() is called while a
      // seek is still settling (e.g. right after a marker jump or a
      // scrub); waiting for `seeked` first makes playback reliable.
      void waitForSeek(video).then(() => {
        maybeScheduleClicks(video);
        video.play().catch(() => {});
      });
    } else {
      video.pause();
    }
  }, [maybeScheduleClicks]);

  const playSelectedSwing = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const from = Math.max(0, effectiveMarkers.start - PLAY_SWING_LEAD_IN);
    const to = effectiveMarkers.impact + PLAY_SWING_TRAIL;
    markReviewed(selectedSwing.swingNumber);
    video.pause();
    video.currentTime = from;
    setCurrentTime(from);
    void waitForSeek(video).then(() => {
      playBoundRef.current = to;
      maybeScheduleClicks(video);
      video.play().catch(() => {});
    });
  }, [effectiveMarkers, maybeScheduleClicks, markReviewed, selectedSwing.swingNumber]);

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

  const adjustMarker = useCallback(
    (marker: SwingPhase, deltaMs: number) => {
      const swingNumber = selectedSwing.swingNumber;
      setAdjustmentsBySwing((prev) => {
        const current = prev[swingNumber] ?? ZERO_ADJUSTMENTS;
        return { ...prev, [swingNumber]: { ...current, [marker]: current[marker] + deltaMs } };
      });
    },
    [selectedSwing.swingNumber],
  );

  const rateMarker = useCallback(
    (marker: SwingPhase, rating: SwingRating) => {
      const swingNumber = selectedSwing.swingNumber;
      setRatingsBySwing((prev) => ({ ...prev, [swingNumber]: { ...(prev[swingNumber] ?? {}), [marker]: rating } }));
    },
    [selectedSwing.swingNumber],
  );

  const goToSwing = useCallback(
    (index: number) => setSelectedSwingIndex(Math.min(Math.max(0, index), session.swings.length - 1)),
    [session.swings.length],
  );

  const isMultiSwing = session.swingCount > 1;

  return (
    <div className="swing-review">
      <p className="eyebrow">Swing Review</p>
      <div className="camera-tempo-readout">
        <span className="camera-tempo-name">Target: {session.tempo.name}</span>
        <span className="camera-tempo-ratio">{session.tempo.ratio.toFixed(2)} : 1</span>
      </div>

      {isMultiSwing && (
        <div className="swing-selector">
          <button
            type="button"
            onClick={() => goToSwing(selectedSwingIndex - 1)}
            disabled={selectedSwingIndex === 0}
            aria-label="Previous swing"
          >
            ‹
          </button>
          <span className="swing-selector-label">
            SWING {selectedSwing.swingNumber} / {session.swingCount}
          </span>
          <button
            type="button"
            onClick={() => goToSwing(selectedSwingIndex + 1)}
            disabled={selectedSwingIndex === session.swings.length - 1}
            aria-label="Next swing"
          >
            ›
          </button>
        </div>
      )}

      <div className="review-video-stage">
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video ref={videoRef} className="review-video" src={session.videoUrl} playsInline muted />
        {stage === "processing" && <div className="review-processing-overlay">Processing…</div>}
      </div>

      <MarkerButtons activeMarker={activeMarker} onJump={jumpToMarker} ratings={swingRatings} onRate={rateMarker} />

      <button type="button" className="play-swing-button" onClick={playSelectedSwing}>
        Play Swing
      </button>

      <TempoMarkerTimeline
        duration={session.duration}
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
              {swingAdjustments[activeMarker] > 0 ? "+" : ""}
              {swingAdjustments[activeMarker]}ms
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
          Play with tempo: {playWithClicks ? "On" : "Off"}
        </button>
        <a
          className="camera-control-chip"
          href={session.videoUrl}
          download={`swing-session-${session.tempo.name.replace("/", "-")}.${fileExtension(session.mimeType)}`}
        >
          Save Video
        </a>
      </div>

      {isMultiSwing && (
        <div className="session-summary">
          {session.swings.map((swing, index) => (
            <button
              key={swing.swingNumber}
              type="button"
              className={`session-summary-chip${index === selectedSwingIndex ? " is-selected" : ""}${
                reviewedSwings.has(swing.swingNumber) ? " is-reviewed" : ""
              }`}
              onClick={() => goToSwing(index)}
            >
              <span className="session-summary-number">Swing {swing.swingNumber}</span>
              <span className="session-summary-status">
                {reviewedSwings.has(swing.swingNumber) ? "Reviewed" : "Not reviewed"}
              </span>
            </button>
          ))}
        </div>
      )}

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
