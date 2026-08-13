export type TempoCategory = "fast" | "standard" | "smooth";

export type TempoPreset = {
  name: string;
  backswingFrames: number;
  downswingFrames: number;
  category: TempoCategory;
};

export type SwingPhase = "start" | "top" | "impact";
