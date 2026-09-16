import { useCallback, useEffect, useRef, useState } from "react";
import type {
  PracticeMode,
  RecordedSwingSession,
  RecordedSwingTempo,
  RecordingStage,
  SessionDisplay,
  StartDelaySeconds,
  SwingCount,
  SwingMarkerSet,
} from "../types";
import { useSwingTrainer } from "./useSwingTrainer";
import {
  computeSessionDisplay,
  computeSessionMarkers,
  computeSessionRecordingDurationSeconds,
  SESSION_INITIAL_DELAY_SECONDS,
} from "../lib/recordingMarkers";
import { pickSupportedMimeType, isRecordingSupported } from "../lib/videoRecording";
import { runDelayCountdown } from "../lib/startDelayCountdown";

type Args = {
  stream: MediaStream | null;
  tempo: RecordedSwingTempo;
  mode: PracticeMode; // "single": one recorded swing. "repeat": recorded session of up to `swingCount` swings.
  startDelaySeconds: StartDelaySeconds; // single mode's lead-in before the swing -- same shared setting Listen & Practice uses
  restSeconds: number; // repeat mode's gap between swings -- same shared "Rest between swings" setting
  swingCount: SwingCount; // repeat mode's cap (a recording can't run forever)
};

export function useSwingRecorder({ stream, tempo, mode, startDelaySeconds, restSeconds, swingCount }: Args) {
  // A dedicated TempoAudioEngine instance for recording -- same engine
  // class/hook as everywhere else, just its own instance so its rest
  // interval (needed for repeat mode's repeat-with-gaps) never fights
  // with Listen & Practice's independently running instance.
  const {
    activePhase,
    start: startAudio,
    stop: stopAudio,
  } = useSwingTrainer(tempo.backswingFrames, tempo.downswingFrames, restSeconds);

  const [stage, setStage] = useState<RecordingStage>("idle");
  const [countdown, setCountdown] = useState<number | null>(null);
  const [sessionDisplay, setSessionDisplay] = useState<SessionDisplay | null>(null);
  const [recordedSession, setRecordedSession] = useState<RecordedSwingSession | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [recordingStartedAt, setRecordingStartedAt] = useState<number | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const autoStopTimeoutRef = useRef<number | null>(null);
  const cancelCountdownRef = useRef<(() => void) | null>(null);
  const videoUrlRef = useRef<string | null>(null);
  const swingsRef = useRef<SwingMarkerSet[]>([]);

  const clearTimers = useCallback(() => {
    if (autoStopTimeoutRef.current !== null) {
      window.clearTimeout(autoStopTimeoutRef.current);
      autoStopTimeoutRef.current = null;
    }
    if (cancelCountdownRef.current !== null) {
      cancelCountdownRef.current();
      cancelCountdownRef.current = null;
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

  const beginRecording = useCallback(
    (initialDelay: number, effectiveSwingCount: number, isRepeat: boolean) => {
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

      const swings = computeSessionMarkers(
        initialDelay,
        effectiveSwingCount,
        tempo.backswingDuration,
        tempo.downswingDuration,
        restSeconds,
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
          restBetweenSwings: isRepeat ? restSeconds : 0,
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
        restSeconds,
      );
      autoStopTimeoutRef.current = window.setTimeout(() => {
        autoStopTimeoutRef.current = null;
        stopRecording();
      }, durationSeconds * 1000);
    },
    [stream, tempo, restSeconds, startAudio, stopRecording],
  );

  const recordSwing = useCallback(() => {
    if (!stream || stage === "recording") return;
    setErrorMessage(null);
    clearTimers();

    if (mode === "repeat") {
      // The 5-4-3-2-1 + GET READY lead-in happens WITHIN the recording
      // itself (per spec), not as a separate pre-recording countdown.
      beginRecording(SESSION_INITIAL_DELAY_SECONDS, swingCount, true);
      return;
    }

    // Single mode: the real delay is scheduled precisely via
    // beginRecording's startAudio(initialDelay) call, exactly like Listen &
    // Practice's own start delay. The countdown shown here is a purely
    // cosmetic parallel readout of that same window, using the same shared
    // "Start delay" setting -- not a second, different delay.
    beginRecording(startDelaySeconds, 1, false);
    if (startDelaySeconds > 0) {
      setCountdown(startDelaySeconds);
      cancelCountdownRef.current = runDelayCountdown(startDelaySeconds, setCountdown);
    }
  }, [stream, stage, mode, startDelaySeconds, swingCount, beginRecording, clearTimers]);

  // Live "SWING n/m" / "NEXT SWING IN x" overlay for repeat-mode recording.
  // Polls frequently and fully recomputes from elapsed time each tick.
  useEffect(() => {
    if (stage !== "recording" || mode !== "repeat" || recordingStartedAt === null) {
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
    setCountdown(null);
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
    finalizeReview,
    retake,
  };
}
