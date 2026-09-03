import { useState } from "react";
import type { WedgeMatrixCell } from "../calculations";
import type { Club, PracticeSession, WedgeSwingLength } from "../types";
import { WEDGE_SWING_LENGTH_LABELS, formatDistance } from "../labels";

type Props = {
  cells: WedgeMatrixCell[];
  clubs: Club[];
  sessions: PracticeSession[];
  unit: "m" | "yd";
  onStartPractice: (clubId: string, clubName: string, swingLength: WedgeSwingLength) => void;
};

const LENGTHS: WedgeSwingLength[] = ["half", "three-quarter", "full"];

export function WedgeMatrix({ cells, clubs, sessions, unit, onStartPractice }: Props) {
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  const wedgeClubs = clubs.filter((club) => club.category === "wedge" || club.category === "iron");
  const cellFor = (clubId: string, length: WedgeSwingLength) =>
    cells.find((cell) => cell.clubId === clubId && cell.swingLength === length) ?? null;

  if (wedgeClubs.length === 0) {
    return (
      <div className="matrix-empty-state">
        <p>Add a wedge in My Bag to start building your Wedge Matrix.</p>
      </div>
    );
  }

  return (
    <div className="wedge-matrix">
      <div className="matrix-scroll">
        <table className="matrix-table">
          <thead>
            <tr>
              <th>Club</th>
              {LENGTHS.map((length) => (
                <th key={length}>{WEDGE_SWING_LENGTH_LABELS[length]}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {wedgeClubs.map((club) => (
              <tr key={club.id}>
                <th scope="row">{club.name}</th>
                {LENGTHS.map((length) => {
                  const cell = cellFor(club.id, length);
                  const key = `${club.id}__${length}`;
                  return (
                    <td key={length}>
                      {cell && cell.stats.count > 0 ? (
                        <button type="button" className="matrix-cell-button" onClick={() => setExpandedKey(key)}>
                          {formatDistance(cell.stats.averageCarry, unit, 0)}
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="matrix-cell-button matrix-cell-empty"
                          onClick={() => onStartPractice(club.id, club.name, length)}
                        >
                          + Practice
                        </button>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {expandedKey &&
        (() => {
          const [clubId, length] = expandedKey.split("__") as [string, WedgeSwingLength];
          const club = wedgeClubs.find((c) => c.id === clubId);
          const cell = cellFor(clubId, length);
          if (!club || !cell) return null;
          const lastSession = cell.lastSessionAt
            ? new Date(cell.lastSessionAt).toLocaleDateString()
            : "—";
          const relatedCount = sessions.filter((s) => cell.sessionIds.includes(s.id)).length;
          return (
            <div className="matrix-cell-detail">
              <div className="matrix-cell-detail-header">
                <p className="marker-target-label">
                  {club.name} — {WEDGE_SWING_LENGTH_LABELS[length]}
                </p>
                <button type="button" onClick={() => setExpandedKey(null)} aria-label="Close">
                  ✕
                </button>
              </div>
              <div className="review-marker-times">
                <div>
                  <span className="label">Avg carry</span>
                  <span className="value">{formatDistance(cell.stats.averageCarry, unit)}</span>
                </div>
                <div>
                  <span className="label">Carry spread</span>
                  <span className="value">{cell.stats.carryStdDev !== null ? `±${cell.stats.carryStdDev.toFixed(1)}` : "—"}</span>
                </div>
                <div>
                  <span className="label">Avg total</span>
                  <span className="value">{formatDistance(cell.stats.averageTotal, unit)}</span>
                </div>
              </div>
              <p className="matrix-cell-detail-line">Typical tempo: {cell.typicalTempoName ?? "—"}</p>
              <p className="matrix-cell-detail-line">Shots recorded: {cell.stats.count}</p>
              <p className="matrix-cell-detail-line">Most recent practice: {lastSession}</p>
              <p className="matrix-cell-detail-line">Linked sessions: {relatedCount}</p>
              <button
                type="button"
                className="btn-outline"
                onClick={() => onStartPractice(club.id, club.name, length)}
              >
                Practice this again
              </button>
            </div>
          );
        })()}
    </div>
  );
}
