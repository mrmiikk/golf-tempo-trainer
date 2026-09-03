import { useState } from "react";
import type { Club, ClubCategory } from "../types";
import { CLUB_CATEGORY_LABELS } from "../labels";

type Props = {
  clubs: Club[];
  onAdd: (name: string, category: ClubCategory) => void;
  onRename: (clubId: string, name: string) => void;
  onRemove: (clubId: string) => void;
  onReorder: (orderedIds: string[]) => void;
};

const CATEGORY_OPTIONS: ClubCategory[] = ["driver", "wood", "hybrid", "iron", "wedge", "putter"];

export function ClubManager({ clubs, onAdd, onRename, onRemove, onReorder }: Props) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<ClubCategory>("wedge");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const handleAdd = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onAdd(trimmed, category);
    setName("");
  };

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= clubs.length) return;
    const ids = clubs.map((club) => club.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    onReorder(ids);
  };

  const commitRename = (clubId: string) => {
    const trimmed = editingName.trim();
    if (trimmed) onRename(clubId, trimmed);
    setEditingId(null);
  };

  return (
    <div className="club-manager">
      <p className="eyebrow">My Bag</p>

      {clubs.length === 0 && <p className="club-manager-empty">Add your clubs to start tracking distances.</p>}

      {clubs.length > 0 && (
        <ul className="club-list">
          {clubs.map((club, index) => (
            <li key={club.id} className="club-list-item">
              {editingId === club.id ? (
                <input
                  className="club-rename-input"
                  value={editingName}
                  autoFocus
                  onChange={(event) => setEditingName(event.target.value)}
                  onBlur={() => commitRename(club.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") commitRename(club.id);
                    if (event.key === "Escape") setEditingId(null);
                  }}
                />
              ) : (
                <button
                  type="button"
                  className="club-list-name"
                  onClick={() => {
                    setEditingId(club.id);
                    setEditingName(club.name);
                  }}
                >
                  {club.name}
                  <span className="club-list-category">{CLUB_CATEGORY_LABELS[club.category]}</span>
                </button>
              )}
              <span className="club-list-actions">
                <button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label="Move up">
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => move(index, 1)}
                  disabled={index === clubs.length - 1}
                  aria-label="Move down"
                >
                  ↓
                </button>
                <button type="button" onClick={() => onRemove(club.id)} aria-label="Remove club">
                  Remove
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="club-add-form">
        <input
          className="club-add-name"
          placeholder="e.g. 56°, PW, 7 Iron"
          value={name}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") handleAdd();
          }}
        />
        <select value={category} onChange={(event) => setCategory(event.target.value as ClubCategory)}>
          {CATEGORY_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {CLUB_CATEGORY_LABELS[option]}
            </option>
          ))}
        </select>
        <button type="button" className="btn-primary club-add-button" onClick={handleAdd}>
          Add Club
        </button>
      </div>
    </div>
  );
}
