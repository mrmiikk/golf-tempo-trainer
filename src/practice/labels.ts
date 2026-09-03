import type {
  ClubCategory,
  FullSwingClubCategory,
  ShortGameSwingLength,
  ShortGameTechnique,
  TrainingModeKind,
  WedgeSwingLength,
} from "./types";

export const TRAINING_MODE_LABELS: Record<TrainingModeKind, string> = {
  "full-swing": "Full Swing",
  "distance-wedge": "Distance Wedge",
  "short-game": "Short Game",
};

export const FULL_SWING_CLUB_LABELS: Record<FullSwingClubCategory, string> = {
  driver: "Driver",
  wood: "Wood",
  hybrid: "Hybrid",
  iron: "Iron",
  "full-wedge": "Full Wedge",
};

export const WEDGE_SWING_LENGTH_LABELS: Record<WedgeSwingLength, string> = {
  half: "Half",
  "three-quarter": "3/4",
  full: "Full",
};

export const SHORT_GAME_TECHNIQUE_LABELS: Record<ShortGameTechnique, string> = {
  chip: "Chip",
  pitch: "Pitch",
  "bump-and-run": "Bump & Run",
  lob: "Lob",
  bunker: "Bunker",
  putt: "Putt",
};

export const SHORT_GAME_SWING_LENGTH_LABELS: Record<ShortGameSwingLength, string> = {
  knee: "Knee",
  hip: "Hip",
  waist: "Waist",
  chest: "Chest",
  shoulder: "Shoulder",
};

export const CLUB_CATEGORY_LABELS: Record<ClubCategory, string> = {
  driver: "Driver",
  wood: "Wood",
  hybrid: "Hybrid",
  iron: "Iron",
  wedge: "Wedge",
  putter: "Putter",
};

export function formatDistance(value: number | null, unit: "m" | "yd", digits = 1): string {
  if (value === null) return "—";
  return `${value.toFixed(digits)} ${unit}`;
}

export function formatPercent(value: number | null): string {
  if (value === null) return "—";
  return `${Math.round(value * 100)}%`;
}
