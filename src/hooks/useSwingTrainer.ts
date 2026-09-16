import { useCallback, useEffect, useRef, useState } from "react";
import { TempoAudioEngine } from "../audio/audioEngine";
import type { SwingPhase } from "../types";
import { FPS } from "../data/presets";

export function useSwingTrainer(backswingFrames: number, downswingFrames: number, restSeconds: number) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [activePhase, setActivePhase] = useState<SwingPhase | null>(null);
  const [error, setError] = useState<string | null>(null);
  const engineRef = useRef<TempoAudioEngine | null>(null);
  const flashTimeoutRef = useRef<number | null>(null);

  const backswingDuration = backswingFrames / FPS;
  const downswingDuration = downswingFrames / FPS;

  const handlePhase = useCallback((phase: SwingPhase) => {
    setActivePhase(phase);
    if (flashTimeoutRef.current !== null) {
      window.clearTimeout(flashTimeoutRef.current);
    }
    flashTimeoutRef.current = window.setTimeout(() => setActivePhase(null), 180);
  }, []);

  useEffect(() => {
    engineRef.current?.update(backswingDuration, downswingDuration, restSeconds);
  }, [backswingDuration, downswingDuration, restSeconds]);

  // Returns whether audio actually started -- callers that schedule
  // further work (a countdown, an auto-stop timer) off of "start" should
  // check this rather than assuming success, since audio can fail to start
  // (see TempoAudioEngine.start). Previously this was never checked: a
  // failure just left the UI showing "Start Tempo" with no explanation,
  // indistinguishable from the click not having registered at all.
  const start = useCallback(
    async (initialDelaySeconds?: number): Promise<boolean> => {
      setError(null);
      if (!engineRef.current) {
        // Only reached before any engine exists yet, so these must be the
        // current values -- a stale closure here would silently start the
        // very first swing on whatever tempo was selected at mount time.
        engineRef.current = new TempoAudioEngine(backswingDuration, downswingDuration, restSeconds, handlePhase);
      }
      try {
        await engineRef.current.start(initialDelaySeconds);
        setIsPlaying(true);
        return true;
      } catch (err) {
        setIsPlaying(false);
        setError(err instanceof Error ? err.message : "Could not start audio.");
        return false;
      }
    },
    [handlePhase, backswingDuration, downswingDuration, restSeconds],
  );

  const stop = useCallback(() => {
    engineRef.current?.stop();
    setIsPlaying(false);
    setActivePhase(null);
  }, []);

  // Closes the AudioContext, not just stops scheduling -- see
  // TempoAudioEngine.close(). A fresh engine (and AudioContext) is created
  // per mount, so this is what actually prevents leaking one every time a
  // practice session ends.
  useEffect(() => () => engineRef.current?.close(), []);

  return { isPlaying, activePhase, error, start, stop, backswingDuration, downswingDuration };
}
