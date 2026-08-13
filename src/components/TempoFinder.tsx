import { useCallback, useEffect, useState } from "react";
import type { TempoPreset } from "../types";
import { TempoFinderResults } from "./TempoFinderResults";
import { averageMeasurements, type FinderMeasurement } from "../lib/tempoFinder";

const STORAGE_KEY = "golf-tempo-finder-history";
const MAX_HISTORY = 5;

type Props = { onTrainWithPreset: (preset: TempoPreset) => void };

function loadHistory(): FinderMeasurement[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as FinderMeasurement[]) : [];
  } catch {
    return [];
  }
}

export function TempoFinder({ onTrainWithPreset }: Props) {
  const [taps, setTaps] = useState<number[]>([]);
  const [latest, setLatest] = useState<FinderMeasurement | null>(null);
  const [history, setHistory] = useState<FinderMeasurement[]>(loadHistory);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch {
      // localStorage unavailable in this browser context; history simply won't persist
    }
  }, [history]);

  const handleTap = useCallback(() => {
    setTaps((prev) => {
      if (prev.length >= 3) return prev;
      const next = [...prev, performance.now()];
      if (next.length === 3) {
        const measurement: FinderMeasurement = {
          backswingSeconds: (next[1] - next[0]) / 1000,
          downswingSeconds: (next[2] - next[1]) / 1000,
        };
        setLatest(measurement);
        setHistory((h) => [...h, measurement].slice(-MAX_HISTORY));
      }
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setTaps([]);
    setLatest(null);
  }, []);

  if (latest) {
    const average = history.length > 1 ? averageMeasurements(history) : null;
    return (
      <TempoFinderResults
        latest={latest}
        average={average}
        history={history}
        onTryAgain={reset}
        onTrainWithPreset={onTrainWithPreset}
      />
    );
  }

  const tapLabel = ["Tap: Start", "Tap: Top", "Tap: Impact"][taps.length] ?? "Tap: Start";

  return (
    <div className="tempo-finder">
      <p className="eyebrow">Tempo Finder</p>
      <h1>Find your natural tempo</h1>
      <p className="finder-instructions">
        Make a practice swing and tap once for Start, once for Top, once for Impact.
      </p>
      <button type="button" className="finder-tap-button" onClick={handleTap}>
        {tapLabel}
      </button>
      <p className="finder-progress">{taps.length} / 3 taps</p>
    </div>
  );
}
