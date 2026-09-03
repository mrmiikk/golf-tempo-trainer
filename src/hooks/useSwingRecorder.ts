import { useCallback, useEffect, useRef, useState } from "react";
import type {
  RecordedSwingSession,
  RecordedSwingTempo,
  RecordingMode,
  RecordingStage,
  SessionDisplay,
  SwingCount,
  SwingMarkerSet,
  TimeBetweenSwingsSeconds,
} from "../types";
import { useSwingTrainer } from "./useSwingTrainer";
import {
  computeSessionDisplay,
  computeSessionMarkers,
  computeSessionRecordingDurationSeconds,
  SESSION_INITIAL_DELAY_SECONDS,
} from "../lib/recordingMarkers";
import { pickSupportedMimeType, isRecordingSupported } from "../lib/videoRecording";

const SINGLE_MODE_COUNTDOWN_SECONDS = 3;

type Args = {
  stream: MediaStream | null;
  tempo: RecordedSwingTempo;
  mode: RecordingMode;
  preparationDelay: number; // single mode: pre-recording countdown target, then this many seconds of lead-in
  swingCount: SwingCount; // session mode
  restBetweenSwings: TimeBetweenSwingsSeconds; // session mode; also used as the engine's rest in single mode so a
  // hypothetical "next swing" the engine schedules within its look-ahead window can never audibly fire before stop().
};

export function useSwingRecorder({ stream, tempo, mode, preparationDelay, swingCount, restBetweenSwings }: Args) {
  // A dedicated TempoAudioEngine instance for recording -- same engine
  // class/hook as everywhere else, just its own instance so its rest
  // interval (needed for session mode's repeat-with-gaps) never fights
  // with Practice mode's independently configured rest.
  const {
    activePhase,
    start: startAudio,
    stop: stopAudio,
  } = useSwingTrainer(tempo.backswingFrames, tempo.downswingFrames, restBetweenSwings);

  const [stage, setStage] = useState<RecordingStage>("idle");
  const [countdown, setCountdown] = useState<number | null>(null);
  const [sessionDisplay, setSessionDisplay] = useState<SessionDisplay | null>(null);
  const [recordedSession, setRecordedSession] = useState<RecordedSwingSession | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [recordingStartedAt, setRecordingStartedAt] = useState<number | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const autoStopTimeoutRef = useRef<number | null>(null);
  const countdownIntervalRef = useRef<number | null>(null);
  const videoUrlRef = useRef<string | null>(null);
  const swingsRef = useRef<SwingMarkerSet[]>([]);

  const clearTimers = useCallback(() => {
    if (autoStopTimeoutRef.current !== null) {
      window.clearTimeout(autoStopTimeoutRef.current);
      autoStopTimeoutRef.current = null;
    }
    if (countdownIntervalRef.current !== null) {
      window.clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (autoStopTimeoutRef.current !== null) {
      window.clearTimeout(autoStopTimeoutRef.current);
      autoStopTimeoutRef.current = null;
    }
    stopAudio();
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
  }, [stopAudio]);

  const beginRecording = useCallback(() => {
    if (!stream) return;
    if (!isRecordingSupported()) {
      setStage("error");
      setErrorMessage("This browser does not support recording video.");
      return;
    }

    const mimeType = pickSupportedMimeType();
    chunksRef.current = [];

    let recorder: MediaRecorder;
    try {
      recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
    } catch {
      setStage("error");
      setErrorMessage("Could not start recording on this device.");
      return;
    }

    mediaRecorderRef.current = recorder;

    const isSession = mode === "session";
    const initialDelay = isSession ? SESSION_INITIAL_DELAY_SECONDS : preparationDelay;
    const effectiveSwingCount = isSession ? swingCount : 1;
    const swings = computeSessionMarkers(
      initialDelay,
      effectiveSwingCount,
      tempo.backswingDuration,
      tempo.downswingDuration,
      restBetweenSwings,
    );
    swingsRef.current = swings;

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };
    recorder.onerror = () => {
      setStage("error");
      setErrorMessage("Recording failed unexpectedly.");
    };
    recorder.onstop = () => {
      const finalMimeType = recorder.mimeType || mimeType || "video/webm";
      const blob = new Blob(chunksRef.current, { type: finalMimeType });
      const videoUrl = URL.createObjectURL(blob);
      videoUrlRef.current = videoUrl;
      setRecordedSession({
        id: `swing-${Date.now()}`,
        createdAt: Date.now(),
        videoUrl,
        mimeType: finalMimeType,
        duration: 0,
        tempo,
        swingCount: swings.length,
        restBetweenSwings: isSession ? restBetweenSwings : 0,
        swings,
      });
      setStage("processing");
      setRecordingStartedAt(null);
      setSessionDisplay(null);
    };

    // Recorded video t=0 is anchored here. startAudio() is called
    // immediately after so both clocks begin together; any residual gap is
    // MediaRecorder's own encoder-startup latency, not a second timer.
    recorder.start();
    setRecordingStartedAt(performance.now());
    void startAudio(initialDelay);
    setStage("recording");

    const durationSeconds = computeSessionRecordingDurationSeconds(
      initialDelay,
      effectiveSwingCount,
      tempo.backswingDuration,
      tempo.downswingDuration,
      restBetweenSwings,
    );
    autoStopTimeoutRef.current = window.setTimeout(() => {
      autoStopTimeoutRef.current = null;
      stopRecording();
    }, durationSeconds * 1000);
  }, [stream, mode, preparationDelay, swingCount, restBetweenSwings, tempo, startAudio, stopRecording]);

  const recordSwing = useCallback(() => {
    if (!stream || stage === "countdown" || stage === "recording") return;
    setErrorMessage(null);

    if (mode === "session") {
      // The 5-4-3-2-1 + GET READY lead-in happens WITHIN the recording
      // itself (per spec), not as a separate pre-recording countdown.
      beginRecording();
      return;
    }

    // Single mode: unchanged pre-recording 3-2-1 countdown, then record.
    setStage("countdown");
    const countdownStart = performance.now();
    let lastShown = SINGLE_MODE_COUNTDOWN_SECONDS + 1;
    setCountdown(SINGLE_MODE_COUNTDOWN_SECONDS);
    countdownIntervalRef.current = window.setInterval(() => {
      const elapsed = (performance.now() - countdownStart) / 1000;
      const remaining = Math.max(0, SINGLE_MODE_COUNTDOWN_SECONDS - Math.floor(elapsed));
      if (remaining === lastShown) return;
      lastShown = remaining;
      if (remaining > 0) {
        setCountdown(remaining);
      } else {
        if (countdownIntervalRef.current !== null) {
          window.clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
        }
        setCountdown(null);
        beginRecording();
      }
    }, 100);
  }, [stream, stage, mode, beginRecording]);

  const cancelCountdown = useCallback(() => {
    clearTimers();
    setCountdown(null);
    setStage("idle");
  }, [clearTimers]);

  // Live "SWING n/m" / "NEXT SWING IN x" overlay for session recording.
  // Polls frequently and fully recomputes from elapsed time each tick.
  useEffect(() => {
    if (stage !== "recording" || mode !== "session" || recordingStartedAt === null) {
      setSessionDisplay(null);
      return;
    }
    const swingDuration = tempo.backswingDuration + tempo.downswingDuration;
    const update = () => {
      const elapsed = (performance.now() - recordingStartedAt) / 1000;
      setSessionDisplay(computeSessionDisplay(elapsed, swingsRef.current, swingDuration));
    };
    update();
    const id = window.setInterval(update, 150);
    return () => window.clearInterval(id);
  }, [stage, mode, recordingStartedAt, tempo.backswingDuration, tempo.downswingDuration]);

  const finalizeReview = useCallback((duration: number) => {
    setRecordedSession((prev) => (prev ? { ...prev, duration } : prev));
    setStage("review");
  }, []);

  const retake = useCallback(() => {
    clearTimers();
    if (videoUrlRef.current) {
      URL.revokeObjectURL(videoUrlRef.current);
      videoUrlRef.current = null;
    }
    setRecordedSession(null);
    setErrorMessage(null);
    setStage("idle");
  }, [clearTimers]);

  useEffect(
    () => () => {
      clearTimers();
      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        recorder.stop();
      }
      if (videoUrlRef.current) {
        URL.revokeObjectURL(videoUrlRef.current);
        videoUrlRef.current = null;
      }
    },
    [clearTimers],
  );

  return {
    stage,
    countdown,
    sessionDisplay,
    activePhase,
    recordedSession,
    errorMessage,
    recordSwing,
    stopRecording,
    cancelCountdown,
    finalizeReview,
    retake,
  };
}
