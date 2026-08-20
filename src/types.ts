export type TempoCategory = "fast" | "standard" | "smooth";

export type TempoPreset = {
  name: string;
  backswingFrames: number;
  downswingFrames: number;
  category: TempoCategory;
};

export type SwingPhase = "start" | "top" | "impact";

export type CustomFrames = {
  backswingFrames: number;
  downswingFrames: number;
};

export type CameraFacingMode = "environment" | "user";

export type PracticeMode = "single" | "repeat";

export type StartDelaySeconds = 0 | 3 | 5 | 10;
