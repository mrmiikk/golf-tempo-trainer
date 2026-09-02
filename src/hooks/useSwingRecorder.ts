import { useCallback, useEffect, useRef, useState } from "react";
import type { RecordedSwing, RecordedSwingTempo, RecordingStage } from "../types";
import { computeRecordingDurationSeconds, computeVideoMarkers } from "../lib/recordingMarkers";
import { pickSupportedMimeType, isRecordingSupported } from "../lib/videoRecording";

const COUNTDOWN_SECONDS = 3;

type Args = {
  stream: MediaStream | null;
  tempo: RecordedSwingTempo;
  preparationDelay: number;
  // From useSwingTrainer: the SAME audio engine used everywhere else, not a
  // separate implementation. startAudio(delay) unlocks/resumes the
  // AudioContext synchronously in this gesture and schedules the first
  // swing `delay` seconds out, exactly like Camera Practice's countdown.
  startAudio: (initialDelaySeconds?: number) => Promise<void>;
  stopAudio: () => void;
};

export function useSwingRecorder({ stream, tempo, preparationDelay, startAudio, stopAudio }: Args) {
  const [stage, setStage] = useState<RecordingStage>("idle");
  const [countdown, setCountdown] = useState<number | null>(null);
  const [recordedSwing, setRecordedSwing] = useState<RecordedSwing | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const autoStopTimeoutRef = useRef<number | null>(null);
  const countdownIntervalRef = useRef<number | null>(null);
  const videoUrlRef = useRef<string | null>(null);

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
      const markers = computeVideoMarkers(preparationDelay, tempo.backswingDuration, tempo.downswingDuration);
      setRecordedSwing({
        id: `swing-${Date.now()}`,
        createdAt: Date.now(),
        videoUrl,
        mimeType: finalMimeType,
        duration: 0,
        tempo,
        markers,
        preparationDelay,
      });
      // RecordedSwingReview resolves real duration/frame timing, then
      // calls finalizeReview() to flip the stage to "review".
      setStage("processing");
    };

    // Recorded video t=0 is anchored here. startAudio() is called
    // immediately after so both clocks begin together; any residual gap is
    // MediaRecorder's own encoder-startup latency, not a second timer.
    recorder.start();
    void startAudio(preparationDelay);
    setStage("recording");

    const durationMs =
      computeRecordingDurationSeconds(preparationDelay, tempo.backswingDuration, tempo.downswingDuration) * 1000;
    autoStopTimeoutRef.current = window.setTimeout(() => {
      autoStopTimeoutRef.current = null;
      stopRecording();
    }, durationMs);
  }, [stream, preparationDelay, tempo, startAudio, stopRecording]);

  const recordSwing = useCallback(() => {
    if (!stream || stage === "countdown" || stage === "recording") return;
    setErrorMessage(null);
    setStage("countdown");
    // Derive the displayed number from elapsed wall-clock time (polled
    // frequently) rather than decrementing once per 1s tick -- a single
    // delayed tick in a plain decrement loses a full second permanently,
    // while this self-corrects on the very next poll.
    const countdownStart = performance.now();
    let lastShown = COUNTDOWN_SECONDS + 1;
    setCountdown(COUNTDOWN_SECONDS);
    countdownIntervalRef.current = window.setInterval(() => {
      const elapsed = (performance.now() - countdownStart) / 1000;
      const remaining = Math.max(0, COUNTDOWN_SECONDS - Math.floor(elapsed));
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
  }, [stream, stage, beginRecording]);

  const cancelCountdown = useCallback(() => {
    clearTimers();
    setCountdown(null);
    setStage("idle");
  }, [clearTimers]);

  const finalizeReview = useCallback((duration: number) => {
    setRecordedSwing((prev) => (prev ? { ...prev, duration } : prev));
    setStage("review");
  }, []);

  const retake = useCallback(() => {
    clearTimers();
    if (videoUrlRef.current) {
      URL.revokeObjectURL(videoUrlRef.current);
      videoUrlRef.current = null;
    }
    setRecordedSwing(null);
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
    recordedSwing,
    errorMessage,
    recordSwing,
    stopRecording,
    cancelCountdown,
    finalizeReview,
    retake,
  };
}
