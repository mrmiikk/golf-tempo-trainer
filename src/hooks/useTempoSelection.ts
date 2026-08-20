import { useCallback, useState } from "react";
import type { CustomFrames, TempoPreset } from "../types";
import { DEFAULT_PRESET } from "../data/presets";

// The single source of truth for "which tempo is selected" -- shared by
// Tempo Trainer, Camera Practice, and Tempo Finder's "Train with X" so
// there is one tempo selection, not a duplicate per screen.
export function useTempoSelection() {
  const [preset, setPreset] = useState<TempoPreset>(DEFAULT_PRESET);
  const [isCustom, setIsCustom] = useState(false);
  const [customFrames, setCustomFrames] = useState<CustomFrames>({ backswingFrames: 24, downswingFrames: 8 });
  const [restSeconds, setRestSeconds] = useState(2);

  const selectPreset = useCallback((next: TempoPreset) => {
    setPreset(next);
    setIsCustom(false);
  }, []);

  const selectCustom = useCallback(() => {
    setIsCustom(true);
  }, []);

  const updateCustomFrames = useCallback((backswingFrames: number, downswingFrames: number) => {
    setCustomFrames({ backswingFrames, downswingFrames });
  }, []);

  const activeFrames = isCustom ? customFrames : preset;
  const ratio = activeFrames.downswingFrames > 0 ? activeFrames.backswingFrames / activeFrames.downswingFrames : 0;

  return {
    preset,
    isCustom,
    customFrames,
    restSeconds,
    activeFrames,
    ratio,
    selectPreset,
    selectCustom,
    updateCustomFrames,
    setRestSeconds,
  };
}

export type TempoSelection = ReturnType<typeof useTempoSelection>;
