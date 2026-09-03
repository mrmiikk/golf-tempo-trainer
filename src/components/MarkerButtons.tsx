import type { ActiveSwingMarker, SwingPhase, SwingRating } from "../types";

const HELPER_TEXT: Record<SwingPhase, string> = {
  start: "This is the target moment the takeaway should begin.",
  top: "At this frame your swing should be at the top of the backswing. If you're already starting down, your backswing was faster than this tempo; if you haven't reached the top yet, it was slower.",
  impact: "At this frame the club should be at impact. If you've already passed impact, the swing reached impact early; if the club hasn't gotten there yet, it's late relative to this tempo.",
};

const RATING_LABELS: Record<SwingRating, string> = {
  early: "Early",
  "on-time": "On Time",
  late: "Late",
};

type Props = {
  activeMarker: ActiveSwingMarker | null;
  onJumpToPhase: (phase: SwingPhase) => void;
  ratings: Partial<Record<SwingPhase, SwingRating>>;
  onRate: (marker: ActiveSwingMarker, rating: SwingRating) => void;
};

// The three buttons jump to whichever swing's marker of that phase is
// nearest the current playhead -- there is no separate "select a swing"
// step. `activeMarker` reflects the most recently jumped-to (or tapped, or
// played-past) marker, swing number included, so the detail panel and
// fine-tune/rating controls always say exactly which swing they apply to.
export function MarkerButtons({ activeMarker, onJumpToPhase, ratings, onRate }: Props) {
  return (
    <div className="marker-buttons">
      <div className="marker-buttons-row">
        {(["start", "top", "impact"] as SwingPhase[]).map((phase) => (
          <button
            key={phase}
            type="button"
            className={`marker-jump-button${activeMarker?.phase === phase ? ` is-active is-${phase}` : ""}`}
            onClick={() => onJumpToPhase(phase)}
          >
            {phase.toUpperCase()}
          </button>
        ))}
      </div>

      {activeMarker && (
        <div className="marker-detail">
          <p className={`marker-target-label is-${activeMarker.phase}`}>
            SWING {activeMarker.swingNumber} — {activeMarker.phase.toUpperCase()}
          </p>
          <p className="marker-helper-text">{HELPER_TEXT[activeMarker.phase]}</p>

          {activeMarker.phase !== "start" && (
            <div className="marker-rating">
              <p className="marker-rating-label">
                Was swing {activeMarker.swingNumber}'s {activeMarker.phase.toUpperCase()}:
              </p>
              <div className="marker-rating-buttons">
                {(["early", "on-time", "late"] as SwingRating[]).map((rating) => (
                  <button
                    key={rating}
                    type="button"
                    className={ratings[activeMarker.phase] === rating ? "is-selected" : ""}
                    onClick={() => onRate(activeMarker, rating)}
                  >
                    {RATING_LABELS[rating]}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
