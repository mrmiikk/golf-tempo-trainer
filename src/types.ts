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

export type CameraMode = "practice" | "record";

export type PreparationDelaySeconds = 1 | 1.5 | 2 | 3;

export type PlaybackSpeed = 1 | 0.5 | 0.25;

export type SwingRating = "early" | "on-time" | "late";

export type RecordingStage = "idle" | "countdown" | "recording" | "processing" | "review" | "error";

// Offsets from the start of the RECORDED VIDEO (seconds), not from the
// swing itself -- video t=0 is recordingStart, so start > 0 because
// recording begins before the preparation delay elapses.
export type VideoTempoMarkers = {
  start: number;
  top: number;
  impact: number;
};

export type RecordedSwingTempo = {
  name: string;
  backswingFrames: number;
  downswingFrames: number;
  backswingDuration: number;
  downswingDuration: number;
  ratio: number;
};

export type RecordedSwing = {
  id: string;
  createdAt: number;
  videoUrl: string;
  mimeType: string;
  duration: number;
  tempo: RecordedSwingTempo;
  markers: VideoTempoMarkers;
  preparationDelay: number;
};
