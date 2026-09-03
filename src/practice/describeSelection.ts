import type { TrainingSelection } from "./types";
import {
  FULL_SWING_CLUB_LABELS,
  SHORT_GAME_SWING_LENGTH_LABELS,
  SHORT_GAME_TECHNIQUE_LABELS,
  TRAINING_MODE_LABELS,
  WEDGE_SWING_LENGTH_LABELS,
} from "./labels";

// One human-readable line describing a training selection, used anywhere
// a session needs a compact summary (history list, active-session banner).
export function describeSelection(selection: TrainingSelection): string {
  switch (selection.mode) {
    case "full-swing":
      return `${TRAINING_MODE_LABELS["full-swing"]} · ${FULL_SWING_CLUB_LABELS[selection.clubCategory]}`;
    case "distance-wedge":
      return `${TRAINING_MODE_LABELS["distance-wedge"]} · ${selection.clubName} · ${WEDGE_SWING_LENGTH_LABELS[selection.swingLength]}`;
    case "short-game":
      return `${TRAINING_MODE_LABELS["short-game"]} · ${selection.clubName} · ${SHORT_GAME_TECHNIQUE_LABELS[selection.technique]} · ${SHORT_GAME_SWING_LENGTH_LABELS[selection.swingLength]}`;
  }
}
