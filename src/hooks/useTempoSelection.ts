import { useCallback, useState } from "react";
import type { CustomFrames, TempoPreset } from "../types";
import { DEFAULT_PRESET, TEMPO_PRESETS } from "../data/presets";

// The single source of truth for "which tempo is selected" -- shared by
// the Practice flow, and Tempo Finder's "Train with X" so there is one
// tempo selection, not a duplicate per screen. Persisted so the Practice
// setup can default to "the user's most recently selected tempo" (and
// rest-between-swings) rather than always resetting to 24/8.
const PRESET_NAME_KEY = "golf-tempo-selected-preset-v1";
const IS_CUSTOM_KEY = "golf-tempo-selected-is-custom-v1";
const CUSTOM_BACKSWING_KEY = "golf-tempo-selected-custom-backswing-v1";
const CUSTOM_DOWNSWING_KEY = "golf-tempo-selected-custom-downswing-v1";
const REST_SECONDS_KEY = "golf-tempo-selected-rest-seconds-v1";

function persist(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage unavailable or full; the preference simply won't persist.
  }
}

function loadPreset(): TempoPreset {
  try {
    const name = localStorage.getItem(PRESET_NAME_KEY);
    const found = name ? TEMPO_PRESETS.find((p) => p.name === name) : undefined;
    return found ?? DEFAULT_PRESET;
  } catch {
    return DEFAULT_PRESET;
  }
}

function loadBoolean(key: string, fallback: boolean): boolean {
  try {
    const stored = localStorage.getItem(key);
    return stored === null ? fallback : stored === "true";
  } catch {
    return fallback;
  }
}

function loadNumber(key: string, fallback: number): number {
  try {
    const stored = localStorage.getItem(key);
    if (stored === null) return fallback;
    const parsed = Number(stored);
    return Number.isFinite(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

export function useTempoSelection() {
  const [preset, setPresetState] = useState<TempoPreset>(loadPreset);
  const [isCustom, setIsCustomState] = useState(() => loadBoolean(IS_CUSTOM_KEY, false));
  const [customFrames, setCustomFrames] = useState<CustomFrames>(() => ({
    backswingFrames: loadNumber(CUSTOM_BACKSWING_KEY, 24),
    downswingFrames: loadNumber(CUSTOM_DOWNSWING_KEY, 8),
  }));
  const [restSeconds, setRestSecondsState] = useState(() => loadNumber(REST_SECONDS_KEY, 2));

  const selectPreset = useCallback((next: TempoPreset) => {
    setPresetState(next);
    setIsCustomState(false);
    persist(PRESET_NAME_KEY, next.name);
    persist(IS_CUSTOM_KEY, "false");
  }, []);

  const selectCustom = useCallback(() => {
    setIsCustomState(true);
    persist(IS_CUSTOM_KEY, "true");
  }, []);

  const updateCustomFrames = useCallback((backswingFrames: number, downswingFrames: number) => {
    setCustomFrames({ backswingFrames, downswingFrames });
    persist(CUSTOM_BACKSWING_KEY, String(backswingFrames));
    persist(CUSTOM_DOWNSWING_KEY, String(downswingFrames));
  }, []);

  const setRestSeconds = useCallback((value: number) => {
    setRestSecondsState(value);
    persist(REST_SECONDS_KEY, String(value));
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
