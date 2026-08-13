import type { TempoPreset } from "../types";
import { nearestPreset, ratioOf, toFrames, type FinderMeasurement } from "../lib/tempoFinder";

type Props = {
  latest: FinderMeasurement;
  average: FinderMeasurement | null;
  history: FinderMeasurement[];
  onTryAgain: () => void;
  onTrainWithPreset: (preset: TempoPreset) => void;
};

function formatFrameTempo(m: FinderMeasurement) {
  return `${toFrames(m.backswingSeconds).toFixed(1)} / ${toFrames(m.downswingSeconds).toFixed(1)}`;
}

export function TempoFinderResults({ latest, average, history, onTryAgain, onTrainWithPreset }: Props) {
  const source = average ?? latest;
  const recommended = nearestPreset(source.backswingSeconds, source.downswingSeconds);
  const ratio = ratioOf(source.backswingSeconds, source.downswingSeconds);

  return (
    <div className="tempo-finder-results">
      <p className="eyebrow">Your Natural Tempo</p>
      <h1 className="tempo-name">{formatFrameTempo(source)}</h1>
      <p className="tempo-ratio">{ratio.toFixed(2)} : 1</p>
      <div className="tempo-durations">
        <div className="tempo-duration">
          <span className="label">Backswing</span>
          <span className="value">{source.backswingSeconds.toFixed(2)}s</span>
        </div>
        <div className="tempo-duration">
          <span className="label">Downswing</span>
          <span className="value">{source.downswingSeconds.toFixed(2)}s</span>
        </div>
      </div>

      {history.length > 1 && average && (
        <div className="finder-history">
          <p className="finder-history-title">Last {history.length} swings</p>
          <ul>
            {history.map((m, i) => (
              <li key={i}>
                Swing {i + 1}: {formatFrameTempo(m)}
              </li>
            ))}
          </ul>
          <p className="finder-average">Average: {formatFrameTempo(average)}</p>
        </div>
      )}

      <p className="finder-recommendation">Recommended training tempo: {recommended.name}</p>
      <div className="finder-actions">
        <button type="button" className="btn-primary" onClick={() => onTrainWithPreset(recommended)}>
          Train with {recommended.name}
        </button>
        <button type="button" className="btn-outline" onClick={onTryAgain}>
          Try Again
        </button>
      </div>
    </div>
  );
}
