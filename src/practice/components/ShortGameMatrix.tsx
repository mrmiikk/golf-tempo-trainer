import type { ShortGameMatrixCell } from "../calculations";
import { SHORT_GAME_SWING_LENGTH_LABELS, SHORT_GAME_TECHNIQUE_LABELS, formatDistance } from "../labels";

type Props = {
  cells: ShortGameMatrixCell[];
  unit: "m" | "yd";
};

export function ShortGameMatrix({ cells, unit }: Props) {
  if (cells.length === 0) {
    return (
      <div className="matrix-empty-state">
        <p>Log some Short Game shots to start building this table.</p>
      </div>
    );
  }

  return (
    <div className="matrix-scroll">
      <table className="matrix-table short-game-table">
        <thead>
          <tr>
            <th>Club</th>
            <th>Technique</th>
            <th>Length</th>
            <th>Avg carry</th>
            <th>Avg roll</th>
            <th>Avg total</th>
            <th>Spread</th>
            <th>Shots</th>
          </tr>
        </thead>
        <tbody>
          {cells.map((cell) => (
            <tr key={`${cell.clubId}__${cell.technique}__${cell.swingLength}`}>
              <td>{cell.clubName}</td>
              <td>{SHORT_GAME_TECHNIQUE_LABELS[cell.technique]}</td>
              <td>{SHORT_GAME_SWING_LENGTH_LABELS[cell.swingLength]}</td>
              <td>{formatDistance(cell.stats.averageCarry, unit, 0)}</td>
              <td>{formatDistance(cell.stats.averageRoll, unit, 0)}</td>
              <td>{formatDistance(cell.stats.averageTotal, unit, 0)}</td>
              <td>{cell.stats.carryStdDev !== null ? `±${cell.stats.carryStdDev.toFixed(1)}` : "—"}</td>
              <td>{cell.stats.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
