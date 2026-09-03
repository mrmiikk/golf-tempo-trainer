import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  ActiveSwingMarker,
  PlaybackSpeed,
  RecordedSwingSession,
  RecordingStage,
  SwingMarkerSet,
  SwingPhase,
  SwingRating,
} from "../types";
import { resolveVideoDuration, waitForSeek } from "../lib/videoRecording";
import { detectFrameSeconds, FALLBACK_FRAME_SECONDS } from "../lib/frameTiming";
import { scheduleReviewClicks } from "../lib/reviewClickPlayback";
import { MarkerButtons } from "./MarkerButtons";
import { TempoMarkerTimeline } from "./TempoMarkerTimeline";
import { FrameControls } from "./FrameControls";
import { PlaybackSpeedControl } from "./PlaybackSpeedControl";

const SWING_NAV_LEAD_IN = 0.5;
const PLAYBACK_HIGHLIGHT_WINDOW = 0.12; // seconds either side of a marker to treat as "passing through" it

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

// Which swing's window [start, impact] the playhead is currently in or
// nearest to -- used only for the informational "SWING n/total" readout
// and for Previous/Next Swing navigation, never as a selection mode.
function nearestSwingIndex(time: number, swings: SwingMarkerSet[]): number {
  let best = 0;
  let bestDistance = Infinity;
  swings.forEach((swing, index) => {
    const distance = time < swing.start ? swing.start - time : time > swing.impact ? time - swing.impact : 0;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = index;
    }
  });
  return best;
}

// The START/TOP/IMPACT buttons jump to whichever swing's marker of that
// phase is closest to the current playhead -- not always swing 1's.
function nearestMarkerOfPhase(time: number, swings: SwingMarkerSet[], phase: SwingPhase): ActiveSwingMarker & { time: number } {
  let best = { swingNumber: swings[0].swingNumber, phase, time: swings[0][phase] };
  let bestDistance = Infinity;
  for (const swing of swings) {
    const distance = Math.abs(swing[phase] - time);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = { swingNumber: swing.swingNumber, phase, time: swing[phase] };
    }
  }
  return best;
}

export function RecordedSwingReview({ session, stage, onProcessed, onRetake, onRecordAnother }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const playBoundRef = useRef<number | null>(null);

  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<PlaybackSpeed>(0.5);
  const [frameSeconds, setFrameSeconds] = useState(FALLBACK_FRAME_SECONDS);
  const [activeMarker, setActiveMarker] = useState<ActiveSwingMarker | null>(null);
  const [adjustmentsBySwing, setAdjustmentsBySwing] = useState<Record<number, Record<SwingPhase, number>>>({});
  const [ratingsBySwing, setRatingsBySwing] = useState<Record<number, Partial<Record<SwingPhase, SwingRating>>>>({});
  const [playWithClicks, setPlayWithClicks] = useState(false);

  const adjustedSwings: SwingMarkerSet[] = useMemo(
    () =>
      session.swings.map((swing) => {
        const adjustments = adjustmentsBySwing[swing.swingNumber] ?? ZERO_ADJUSTMENTS;
        return {
          swingNumber: swing.swingNumber,
          start: swing.start + adjustments.start / 1000,
          top: swing.top + adjustments.top / 1000,
          impact: swing.impact + adjustments.impact / 1000,
        };
      }),
    [session.swings, adjustmentsBySwing],
  );

  const isMultiSwing = session.swingCount > 1;
  const currentSwingIndex = nearestSwingIndex(currentTime, adjustedSwings);
  const currentSwing = adjustedSwings[currentSwingIndex];
  const activeMarkerRatings = activeMarker ? (ratingsBySwing[activeMarker.swingNumber] ?? {}) : {};

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

  // As playback passes through a marker, briefly surface it as the active
  // marker (same detail panel a manual jump/tap shows) -- purely
  // informational, never a "selection".
  useEffect(() => {
    if (!isPlaying) return;
    for (const swing of adjustedSwings) {
      for (const phase of ["start", "top", "impact"] as SwingPhase[]) {
        if (Math.abs(swing[phase] - currentTime) <= PLAYBACK_HIGHLIGHT_WINDOW) {
          setActiveMarker({ swingNumber: swing.swingNumber, phase });
          return;
        }
      }
    }
  }, [currentTime, isPlaying, adjustedSwings]);

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
      const max = session.duration > 0 ? session.duration : video.duration || time;
      playBoundRef.current = null;
      video.pause();
      video.currentTime = Math.min(Math.max(0, time), Number.isFinite(max) ? max : time);
      setCurrentTime(video.currentTime);
    },
    [session.duration],
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
        scheduleReviewClicks(ctx, video, adjustedSwings);
      } catch {
        // Web Audio unavailable; video still plays, just without recreated clicks.
      }
    },
    [playWithClicks, adjustedSwings],
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

  const playSession = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    playBoundRef.current = null;
    video.pause();
    // Starting again once the session has already played through restarts
    // from the top; otherwise resume from wherever the playhead is.
    const restart = session.duration > 0 && video.currentTime >= session.duration - 0.05;
    if (restart) {
      video.currentTime = 0;
      setCurrentTime(0);
    }
    void waitForSeek(video).then(() => {
      maybeScheduleClicks(video);
      video.play().catch(() => {});
    });
  }, [maybeScheduleClicks, session.duration]);

  const jumpToPhase = useCallback(
    (phase: SwingPhase) => {
      const target = nearestMarkerOfPhase(currentTime, adjustedSwings, phase);
      setActiveMarker({ swingNumber: target.swingNumber, phase: target.phase });
      seekTo(target.time);
    },
    [currentTime, adjustedSwings, seekTo],
  );

  const handleMarkerTap = useCallback(
    (swingNumber: number, phase: SwingPhase, time: number) => {
      setActiveMarker({ swingNumber, phase });
      seekTo(time);
    },
    [seekTo],
  );

  const goToSwing = useCallback(
    (index: number) => {
      const clamped = Math.min(Math.max(0, index), adjustedSwings.length - 1);
      const swing = adjustedSwings[clamped];
      seekTo(Math.max(0, swing.start - SWING_NAV_LEAD_IN));
    },
    [adjustedSwings, seekTo],
  );

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

  const adjustMarker = useCallback((marker: ActiveSwingMarker, deltaMs: number) => {
    setAdjustmentsBySwing((prev) => {
      const current = prev[marker.swingNumber] ?? ZERO_ADJUSTMENTS;
      return { ...prev, [marker.swingNumber]: { ...current, [marker.phase]: current[marker.phase] + deltaMs } };
    });
  }, []);

  const rateMarker = useCallback((marker: ActiveSwingMarker, rating: SwingRating) => {
    setRatingsBySwing((prev) => ({
      ...prev,
      [marker.swingNumber]: { ...(prev[marker.swingNumber] ?? {}), [marker.phase]: rating },
    }));
  }, []);

  const activeMarkerAdjustment = activeMarker
    ? (adjustmentsBySwing[activeMarker.swingNumber]?.[activeMarker.phase] ?? 0)
    : 0;

  return (
    <div className="swing-review">
      <p className="eyebrow">Swing Session Review</p>
      <div className="camera-tempo-readout">
        <span className="camera-tempo-name">Target: {session.tempo.name}</span>
        <span className="camera-tempo-ratio">{session.tempo.ratio.toFixed(2)} : 1</span>
      </div>

      <div className="review-video-stage">
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video ref={videoRef} className="review-video" src={session.videoUrl} playsInline muted />
        {stage === "processing" && <div className="review-processing-overlay">Processing…</div>}
      </div>

      <MarkerButtons activeMarker={activeMarker} onJumpToPhase={jumpToPhase} ratings={activeMarkerRatings} onRate={rateMarker} />

      <button type="button" className="play-swing-button" onClick={playSession}>
        {isPlaying ? "Playing Session…" : "Play Session"}
      </button>

      <TempoMarkerTimeline
        duration={session.duration}
        currentTime={currentTime}
        swings={adjustedSwings}
        onSeek={seekTo}
        onMarkerTap={handleMarkerTap}
      />

      {isMultiSwing && (
        <>
          <p className="current-swing-indicator">
            SWING {currentSwing.swingNumber} / {session.swingCount}
          </p>
          <div className="swing-selector">
            <button type="button" onClick={() => goToSwing(currentSwingIndex - 1)} disabled={currentSwingIndex === 0}>
              ‹ Previous Swing
            </button>
            <button
              type="button"
              onClick={() => goToSwing(currentSwingIndex + 1)}
              disabled={currentSwingIndex === adjustedSwings.length - 1}
            >
              Next Swing ›
            </button>
          </div>
        </>
      )}

      <FrameControls isPlaying={isPlaying} onTogglePlay={togglePlay} onStepFrame={stepFrame} onNudge={nudge} />

      <PlaybackSpeedControl value={playbackSpeed} onChange={setPlaybackSpeed} />

      {activeMarker && (
        <div className="marker-fine-tune">
          <p className="start-delay-label">
            SWING {activeMarker.swingNumber} {activeMarker.phase.toUpperCase()} fine-tune
          </p>
          <div className="marker-fine-tune-controls">
            <button type="button" onClick={() => adjustMarker(activeMarker, -10)}>
              -10ms
            </button>
            <span className="marker-fine-tune-value">
              {activeMarkerAdjustment > 0 ? "+" : ""}
              {activeMarkerAdjustment}ms
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
