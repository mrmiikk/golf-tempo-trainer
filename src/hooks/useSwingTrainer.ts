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

  const start = useCallback(async () => {
    if (!engineRef.current) {
      engineRef.current = new TempoAudioEngine(backswingDuration, downswingDuration, restSeconds, handlePhase);
    }
    await engineRef.current.start();
    setIsPlaying(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handlePhase]);

  const stop = useCallback(() => {
    engineRef.current?.stop();
    setIsPlaying(false);
    setActivePhase(null);
  }, []);

  useEffect(() => () => engineRef.current?.stop(), []);

  return { isPlaying, activePhase, start, stop, backswingDuration, downswingDuration };
}
