// Practice-tracking domain: clubs, sessions, shots, tempo measurements and
// video recordings. Deliberately separate from ../types.ts (the existing
// tempo-engine/camera types), which stays untouched.

export type DistanceUnit = "m" | "yd";

export const DEFAULT_DISTANCE_UNIT: DistanceUnit = "m";

// No login exists yet. This is a placeholder single local user so the
// schema is ready for real accounts (and a server-backed repository)
// without a UI or data migration later.
export type User = {
  id: string;
  createdAt: number;
};

export type ClubCategory = "driver" | "wood" | "hybrid" | "iron" | "wedge" | "putter";

export type Club = {
  id: string;
  name: string; // e.g. "PW", "52°", "56°", "7 Iron"
  category: ClubCategory;
  order: number;
};

export type TrainingModeKind = "full-swing" | "distance-wedge" | "short-game";

export type FullSwingClubCategory = "driver" | "wood" | "hybrid" | "iron" | "full-wedge";

export type WedgeSwingLength = "half" | "three-quarter" | "full";

export type ShortGameTechnique = "chip" | "pitch" | "bump-and-run" | "lob" | "bunker" | "putt";

export type ShortGameSwingLength = "knee" | "hip" | "waist" | "chest" | "shoulder";

// What the user picked for one practice session, one shape per mode. This
// is what a Wedge/Short Game Matrix groups shots by, and what a Camera
// Practice recording started from a session inherits automatically.
export type TrainingSelection =
  | { mode: "full-swing"; clubCategory: FullSwingClubCategory }
  | { mode: "distance-wedge"; clubId: string; clubName: string; swingLength: WedgeSwingLength }
  | {
      mode: "short-game";
      clubId: string;
      clubName: string;
      technique: ShortGameTechnique;
      swingLength: ShortGameSwingLength;
    };

export type PracticeSession = {
  id: string;
  userId: string;
  createdAt: number;
  endedAt: number | null;
  selection: TrainingSelection;
  targetTempoName: string; // e.g. "24/8" or "Custom"
  targetBackswingFrames: number;
  targetDownswingFrames: number;
  targetRatio: number;
  targetCarry: number | null;
  unit: DistanceUnit;
};

export type Shot = {
  id: string;
  sessionId: string;
  createdAt: number;
  carry: number | null;
  total: number | null;
  roll: number | null; // total - carry, never negative; null if either input is missing
  unit: DistanceUnit;
  success: boolean;
  note: string;
};

// Actual (measured) tempo for one shot, kept separate from the session's
// TARGET tempo. No real pose/swing-phase detection exists yet, so every
// field here is null and analysisStatus stays "unavailable" until a real
// analyzer is built -- never fabricated.
export type TempoAnalysisStatus = "unavailable" | "pending" | "complete";

export type TempoMeasurement = {
  id: string;
  shotId: string;
  analysisStatus: TempoAnalysisStatus;
  backswingDurationMs: number | null;
  downswingDurationMs: number | null;
  actualRatio: number | null;
  deviationFromTargetRatio: number | null; // actualRatio - targetRatio
};

export type VideoRecording = {
  id: string;
  sessionId: string;
  shotId: string | null;
  createdAt: number;
  swingCount: number;
  mimeType: string;
  // Recorded video blobs are not persisted to localStorage (far too large,
  // and Blob URLs don't survive a reload) -- only this metadata is kept.
  // `videoUrl` is populated only for the lifetime of the current page load.
  videoUrl: string | null;
};

export type PracticeData = {
  user: User;
  clubs: Club[];
  sessions: PracticeSession[];
  shots: Shot[];
  tempoMeasurements: TempoMeasurement[];
  videoRecordings: VideoRecording[];
};
