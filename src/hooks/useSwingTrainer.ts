import { useCallback, useEffect, useRef, useState } from "react";
import { TempoAudioEngine } from "../audio/audioEngine";
import type { SwingPhase } from "../types";
import { FPS } from "../data/presets";

export function useSwingTrainer(backswingFrames: number, downswingFrames: number, restSeconds: number) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [activePhase, setActivePhase] = useState<SwingPhase | null>(null);
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

  const start = useCallback(
    async (initialDelaySeconds?: number) => {
      if (!engineRef.current) {
        // Only reached before any engine exists yet, so these must be the
        // current values -- a stale closure here would silently start the
        // very first swing on whatever tempo was selected at mount time.
        engineRef.current = new TempoAudioEngine(backswingDuration, downswingDuration, restSeconds, handlePhase);
      }
      await engineRef.current.start(initialDelaySeconds);
      setIsPlaying(true);
    },
    [handlePhase, backswingDuration, downswingDuration, restSeconds],
  );

  const stop = useCallback(() => {
    engineRef.current?.stop();
    setIsPlaying(false);
    setActivePhase(null);
  }, []);

  useEffect(() => () => engineRef.current?.stop(), []);

  return { isPlaying, activePhase, start, stop, backswingDuration, downswingDuration };
}
