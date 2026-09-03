import type { TrainingModeKind } from "./types";

// Full Swing keeps the app's existing default (24/8 = 3:1, DEFAULT_PRESET)
// untouched. Short Game gets a slower 2:1 starting point (16/8 frames) as
// a suggestion only -- the user can still pick any preset or edit Custom
// freely afterward.
export const SHORT_GAME_DEFAULT_CUSTOM = { backswingFrames: 16, downswingFrames: 8 };

export function shouldUseShortGameDefaultTempo(mode: TrainingModeKind): boolean {
  return mode === "short-game";
}
