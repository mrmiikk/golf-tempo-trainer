import { useState } from "react";
import type { Shot } from "../types";
import { computeRoll, validateShotDistances } from "../calculations";
import { formatDistance } from "../labels";

type Props = {
  shots: Shot[];
  unit: "m" | "yd";
  onAddShot: (input: { carry: number | null; total: number | null; success: boolean; note: string }) => void;
  onUpdateShot: (shot: Shot) => void;
  onDeleteShot: (shotId: string) => void;
};

type DraftState = {
  carry: string;
  total: string;
  success: boolean;
  note: string;
};

const EMPTY_DRAFT: DraftState = { carry: "", total: "", success: true, note: "" };

function parseDistance(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const parsed = Number(trimmed.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

export function ShotLogger({ shots, unit, onAddShot, onUpdateShot, onDeleteShot }: Props) {
  const [draft, setDraft] = useState<DraftState>(EMPTY_DRAFT);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startEdit = (shot: Shot) => {
    setEditingId(shot.id);
    setDraft({
      carry: shot.carry !== null ? String(shot.carry) : "",
      total: shot.total !== null ? String(shot.total) : "",
      success: shot.success,
      note: shot.note,
    });
    setError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraft(EMPTY_DRAFT);
    setError(null);
  };

  const submit = () => {
    const carry = parseDistance(draft.carry);
    const total = parseDistance(draft.total);
    const validationError = validateShotDistances(carry, total);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);

    if (editingId) {
      const existing = shots.find((shot) => shot.id === editingId);
      if (existing) {
        onUpdateShot({
          ...existing,
          carry,
          total,
          roll: computeRoll(carry, total),
          success: draft.success,
          note: draft.note.trim(),
        });
      }
    } else {
      onAddShot({ carry, total, success: draft.success, note: draft.note.trim() });
    }
    setEditingId(null);
    setDraft(EMPTY_DRAFT);
  };

  return (
    <div className="shot-logger">
      <p className="start-delay-label">{editingId ? "Edit shot" : "Log a shot"}</p>

      <div className="shot-form-row">
        <label className="shot-form-field">
          <span>Carry ({unit})</span>
          <input
            type="number"
            inputMode="decimal"
            value={draft.carry}
            onChange={(event) => setDraft((prev) => ({ ...prev, carry: event.target.value }))}
            placeholder="0"
          />
        </label>
        <label className="shot-form-field">
          <span>Total ({unit})</span>
          <input
            type="number"
            inputMode="decimal"
            value={draft.total}
            onChange={(event) => setDraft((prev) => ({ ...prev, total: event.target.value }))}
            placeholder="0"
          />
        </label>
      </div>

      <button
        type="button"
        className={`shot-success-toggle${draft.success ? " is-success" : " is-fail"}`}
        onClick={() => setDraft((prev) => ({ ...prev, success: !prev.success }))}
        aria-pressed={draft.success}
      >
        {draft.success ? "✓ Good shot" : "✗ Miss-hit"}
      </button>

      <textarea
        className="shot-note-input"
        placeholder="Note (optional)"
        value={draft.note}
        onChange={(event) => setDraft((prev) => ({ ...prev, note: event.target.value }))}
        rows={2}
      />

      {error && <p className="shot-form-error">{error}</p>}

      <div className="shot-form-actions">
        <button type="button" className="btn-primary" onClick={submit}>
          {editingId ? "Save changes" : "Add shot"}
        </button>
        {editingId && (
          <button type="button" className="btn-outline" onClick={cancelEdit}>
            Cancel
          </button>
        )}
      </div>

      {shots.length > 0 && (
        <ul className="shot-list">
          {shots
            .slice()
            .reverse()
            .map((shot, index) => (
              <li key={shot.id} className={`shot-list-item${shot.success ? "" : " is-fail"}`}>
                <span className="shot-list-index">#{shots.length - index}</span>
                <span className="shot-list-distances">
                  {formatDistance(shot.carry, unit)} carry · {formatDistance(shot.total, unit)} total
                  {shot.roll !== null && <span className="shot-list-roll"> (roll {shot.roll.toFixed(1)})</span>}
                </span>
                <span className="shot-list-actions">
                  <button type="button" onClick={() => startEdit(shot)} aria-label="Edit shot">
                    Edit
                  </button>
                  <button type="button" onClick={() => onDeleteShot(shot.id)} aria-label="Delete shot">
                    Delete
                  </button>
                </span>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}
