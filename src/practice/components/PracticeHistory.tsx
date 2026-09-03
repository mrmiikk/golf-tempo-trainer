import { useState } from "react";
import type { PracticeSession, Shot } from "../types";
import { computeSessionStats } from "../calculations";
import { describeSelection } from "../describeSelection";
import { formatDistance, formatPercent } from "../labels";

type Props = {
  sessions: PracticeSession[];
  shots: Shot[];
  onDeleteShot: (shotId: string) => void;
  onDeleteSession: (sessionId: string) => void;
};

export function PracticeHistory({ sessions, shots, onDeleteShot, onDeleteSession }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const sorted = [...sessions].sort((a, b) => b.createdAt - a.createdAt);

  if (sorted.length === 0) {
    return (
      <div className="matrix-empty-state">
        <p>Your finished practice sessions will show up here.</p>
      </div>
    );
  }

  return (
    <div className="practice-history">
      <p className="eyebrow">Practice History</p>
      <ul className="history-list">
        {sorted.map((session) => {
          const sessionShots = shots.filter((shot) => shot.sessionId === session.id);
          const stats = computeSessionStats(session, shots);
          const isExpanded = expandedId === session.id;
          return (
            <li key={session.id} className="history-item">
              <button
                type="button"
                className="history-item-header"
                onClick={() => setExpandedId(isExpanded ? null : session.id)}
              >
                <span className="history-item-title">
                  {describeSelection(session.selection)}
                  <span className="history-item-date">
                    {new Date(session.createdAt).toLocaleDateString()}{" "}
                    {new Date(session.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </span>
                <span className="history-item-meta">
                  {sessionShots.length} shots · {formatPercent(stats.successRate)} success
                </span>
              </button>

              {isExpanded && (
                <div className="history-item-detail">
                  <div className="review-marker-times">
                    <div>
                      <span className="label">Target tempo</span>
                      <span className="value">{session.targetTempoName}</span>
                    </div>
                    <div>
                      <span className="label">Avg carry</span>
                      <span className="value">{formatDistance(stats.averageCarry, session.unit)}</span>
                    </div>
                    <div>
                      <span className="label">Avg total</span>
                      <span className="value">{formatDistance(stats.averageTotal, session.unit)}</span>
                    </div>
                  </div>
                  <p className="matrix-cell-detail-line">
                    Actual tempo: analysis not yet available for logged shots.
                  </p>

                  {sessionShots.length > 0 && (
                    <ul className="shot-list">
                      {sessionShots.map((shot, index) => (
                        <li key={shot.id} className={`shot-list-item${shot.success ? "" : " is-fail"}`}>
                          <span className="shot-list-index">#{index + 1}</span>
                          <span className="shot-list-distances">
                            {formatDistance(shot.carry, shot.unit)} carry · {formatDistance(shot.total, shot.unit)}{" "}
                            total
                          </span>
                          <span className="shot-list-actions">
                            <button type="button" onClick={() => onDeleteShot(shot.id)}>
                              Delete
                            </button>
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}

                  <button type="button" className="btn-outline" onClick={() => onDeleteSession(session.id)}>
                    Delete Session
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
