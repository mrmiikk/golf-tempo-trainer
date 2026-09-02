import type { SwingPhase, SwingRating } from "../types";

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
  activeMarker: SwingPhase | null;
  onJump: (marker: SwingPhase) => void;
  ratings: Partial<Record<SwingPhase, SwingRating>>;
  onRate: (marker: SwingPhase, rating: SwingRating) => void;
};

export function MarkerButtons({ activeMarker, onJump, ratings, onRate }: Props) {
  return (
    <div className="marker-buttons">
      <div className="marker-buttons-row">
        {(["start", "top", "impact"] as SwingPhase[]).map((marker) => (
          <button
            key={marker}
            type="button"
            className={`marker-jump-button${activeMarker === marker ? ` is-active is-${marker}` : ""}`}
            onClick={() => onJump(marker)}
          >
            {marker.toUpperCase()}
          </button>
        ))}
      </div>

      {activeMarker && (
        <div className="marker-detail">
          <p className={`marker-target-label is-${activeMarker}`}>TARGET: {activeMarker.toUpperCase()}</p>
          <p className="marker-helper-text">{HELPER_TEXT[activeMarker]}</p>

          {activeMarker !== "start" && (
            <div className="marker-rating">
              <p className="marker-rating-label">Was your {activeMarker.toUpperCase()}:</p>
              <div className="marker-rating-buttons">
                {(["early", "on-time", "late"] as SwingRating[]).map((rating) => (
                  <button
                    key={rating}
                    type="button"
                    className={ratings[activeMarker] === rating ? "is-selected" : ""}
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
