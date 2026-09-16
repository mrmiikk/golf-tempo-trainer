import { useCallback, useRef, useState } from "react";
import type { PracticeMode, StartDelaySeconds } from "../types";
import { useSwingTrainer } from "./useSwingTrainer";
import { runDelayCountdown } from "../lib/startDelayCountdown";

// Wraps useSwingTrainer with the shared "Practice settings" behavior
// (Single/Repeat + Start delay) that used to live only inside
// CameraPractice.handleStart. Listen & Practice now uses this directly;
// Record & Review gets the equivalent behavior inside useSwingRecorder
// (recording has its own start/stop lifecycle, so it doesn't share this
// hook, but both use the same runDelayCountdown underneath).
export function usePracticeRun(
  backswingFrames: number,
  downswingFrames: number,
  restSeconds: number,
  practiceMode: PracticeMode,
  startDelaySeconds: StartDelaySeconds,
) {
  const trainer = useSwingTrainer(backswingFrames, downswingFrames, restSeconds);
  const [countdown, setCountdown] = useState<number | null>(null);
  const cancelCountdownRef = useRef<(() => void) | null>(null);
  const singleShotTimeoutRef = useRef<number | null>(null);

  const clearTimers = useCallback(() => {
    if (cancelCountdownRef.current !== null) {
      cancelCountdownRef.current();
      cancelCountdownRef.current = null;
    }
    if (singleShotTimeoutRef.current !== null) {
      window.clearTimeout(singleShotTimeoutRef.current);
      singleShotTimeoutRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    clearTimers();
    setCountdown(null);
    trainer.stop();
  }, [clearTimers, trainer]);

  const start = useCallback(async () => {
    const delay = startDelaySeconds;
    // Unlock/resume the AudioContext synchronously within this gesture, but
    // schedule the first swing `delay` seconds out -- the countdown below
    // is a purely visual readout of that same delay, not a second clock.
    const started = await trainer.start(delay > 0 ? delay : undefined);
    // Audio failed to start (see TempoAudioEngine.start) -- trainer.error
    // is already set for the UI to show; don't schedule a countdown or an
    // auto-stop timer for a swing that was never actually going to play.
    if (!started) return;

    if (delay > 0) {
      setCountdown(delay);
      cancelCountdownRef.current = runDelayCountdown(delay, setCountdown);
    }

    if (practiceMode === "single") {
      const totalMs = delay * 1000 + (trainer.backswingDuration + trainer.downswingDuration) * 1000 + 300;
      singleShotTimeoutRef.current = window.setTimeout(() => {
        singleShotTimeoutRef.current = null;
        stop();
      }, totalMs);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trainer.start, startDelaySeconds, practiceMode, trainer.backswingDuration, trainer.downswingDuration, stop]);

  return { ...trainer, countdown, start, stop };
}
