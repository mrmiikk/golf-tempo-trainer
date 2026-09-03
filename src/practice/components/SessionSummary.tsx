import type { DistanceStats } from "../calculations";
import { formatDistance, formatPercent } from "../labels";

type Props = {
  stats: DistanceStats;
  unit: "m" | "yd";
  onStartNew: () => void;
};

export function SessionSummary({ stats, unit, onStartNew }: Props) {
  return (
    <div className="session-summary-panel">
      <p className="eyebrow">Session Summary</p>
      <div className="session-summary-stats">
        <div>
          <span className="label">Shots</span>
          <span className="value">{stats.count}</span>
        </div>
        <div>
          <span className="label">Success</span>
          <span className="value">{formatPercent(stats.successRate)}</span>
        </div>
        <div>
          <span className="label">Avg carry</span>
          <span className="value">{formatDistance(stats.averageCarry, unit)}</span>
        </div>
        <div>
          <span className="label">Avg total</span>
          <span className="value">{formatDistance(stats.averageTotal, unit)}</span>
        </div>
      </div>
      {stats.carryStdDev !== null && (
        <p className="session-summary-note">
          Carry consistency: shots landed within roughly ±{stats.carryStdDev.toFixed(1)} {unit} of your average most
          of the time. A smaller number means more consistent distances.
        </p>
      )}
      {stats.count === 0 && <p className="session-summary-note">No shots were logged this session.</p>}
      <button type="button" className="btn-primary" onClick={onStartNew}>
        Start New Session
      </button>
    </div>
  );
}
