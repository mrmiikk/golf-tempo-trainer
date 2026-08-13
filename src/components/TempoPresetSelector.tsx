import type { TempoPreset } from "../types";
import { TEMPO_PRESETS } from "../data/presets";

type Props = {
  selectedName: string;
  isCustom: boolean;
  onSelect: (preset: TempoPreset) => void;
  onSelectCustom: () => void;
};

const GROUPS: { category: TempoPreset["category"]; label: string }[] = [
  { category: "fast", label: "Fast" },
  { category: "standard", label: "Standard" },
  { category: "smooth", label: "Smooth" },
];

export function TempoPresetSelector({ selectedName, isCustom, onSelect, onSelectCustom }: Props) {
  return (
    <div className="preset-selector">
      {GROUPS.map(({ category, label }) => (
        <div key={category} className="preset-group">
          <p className="preset-group-label">{label}</p>
          <div className="preset-buttons">
            {TEMPO_PRESETS.filter((preset) => preset.category === category).map((preset) => (
              <button
                key={preset.name}
                type="button"
                className={`preset-button${!isCustom && selectedName === preset.name ? " is-selected" : ""}`}
                onClick={() => onSelect(preset)}
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>
      ))}
      <button
        type="button"
        className={`preset-button custom-button${isCustom ? " is-selected" : ""}`}
        onClick={onSelectCustom}
      >
        Custom
      </button>
    </div>
  );
}
