import { TEMPO_PRESETS, FPS } from "../data/presets";
import type { TempoPreset } from "../types";

export type FinderMeasurement = {
  backswingSeconds: number;
  downswingSeconds: number;
};

export function toFrames(seconds: number): number {
  return seconds * FPS;
}

export function ratioOf(backswingSeconds: number, downswingSeconds: number): number {
  return downswingSeconds > 0 ? backswingSeconds / downswingSeconds : 0;
}

export function nearestPreset(backswingSeconds: number, downswingSeconds: number): TempoPreset {
  const totalSeconds = backswingSeconds + downswingSeconds;
  let closest = TEMPO_PRESETS[0];
  let smallestDiff = Infinity;
  for (const preset of TEMPO_PRESETS) {
    const presetTotal = (preset.backswingFrames + preset.downswingFrames) / FPS;
    const diff = Math.abs(presetTotal - totalSeconds);
    if (diff < smallestDiff) {
      smallestDiff = diff;
      closest = preset;
    }
  }
  return closest;
}

export function averageMeasurements(measurements: FinderMeasurement[]): FinderMeasurement {
  const count = measurements.length;
  const backswingSeconds = measurements.reduce((sum, m) => sum + m.backswingSeconds, 0) / count;
  const downswingSeconds = measurements.reduce((sum, m) => sum + m.downswingSeconds, 0) / count;
  return { backswingSeconds, downswingSeconds };
}
