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

export type RecordingMode = "single" | "session";

export type SwingCount = 3 | 5 | 10;

export type TimeBetweenSwingsSeconds = 3 | 5 | 7 | 10;

// One swing's markers within a recorded video -- same shape as
// VideoTempoMarkers plus which swing (1-indexed) this is.
export type SwingMarkerSet = VideoTempoMarkers & {
  swingNumber: number;
};

// A recording is always a session: single-swing recording is simply a
// session with swingCount 1, so there is one review UI, not two.
export type RecordedSwingSession = {
  id: string;
  createdAt: number;
  videoUrl: string;
  mimeType: string;
  duration: number;
  tempo: RecordedSwingTempo;
  swingCount: number;
  restBetweenSwings: number;
  swings: SwingMarkerSet[];
};

// Purely a function of elapsed time + the precomputed swings array, so the
// on-screen "SWING 2/5" / "NEXT SWING IN 3" readout can never drift: every
// poll recomputes fully from elapsed wall-clock time rather than
// incrementing/decrementing a counter.
export type SessionDisplay =
  | { phase: "countdown"; value: number }
  | { phase: "get-ready" }
  | { phase: "swing"; swingIndex: number }
  | { phase: "between"; swingIndex: number; nextIn: number }
  | { phase: "done" };

// Identifies one specific marker within a session (which swing, which
// phase) -- used by Swing Review's unified timeline/buttons so a marker
// can be addressed without "selecting" a swing as a separate mode.
export type ActiveSwingMarker = {
  swingNumber: number;
  phase: SwingPhase;
};
