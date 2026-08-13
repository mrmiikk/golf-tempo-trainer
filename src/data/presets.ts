import type { TempoPreset } from "../types";

export const FPS = 30;

export const TEMPO_PRESETS: TempoPreset[] = [
  { name: "18/6", backswingFrames: 18, downswingFrames: 6, category: "fast" },
  { name: "21/7", backswingFrames: 21, downswingFrames: 7, category: "fast" },
  { name: "24/8", backswingFrames: 24, downswingFrames: 8, category: "standard" },
  { name: "27/9", backswingFrames: 27, downswingFrames: 9, category: "smooth" },
  { name: "30/10", backswingFrames: 30, downswingFrames: 10, category: "smooth" },
];

export const DEFAULT_PRESET = TEMPO_PRESETS[2];
