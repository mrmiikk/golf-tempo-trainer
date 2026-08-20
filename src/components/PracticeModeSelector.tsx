import type { PracticeMode } from "../types";

type Props = {
  value: PracticeMode;
  onChange: (value: PracticeMode) => void;
  disabled?: boolean;
};

export function PracticeModeSelector({ value, onChange, disabled }: Props) {
  return (
    <div className="practice-mode-selector" role="group" aria-label="Practice mode">
      <button
        type="button"
        className={value === "single" ? "is-selected" : ""}
        onClick={() => onChange("single")}
        disabled={disabled}
      >
        Single
      </button>
      <button
        type="button"
        className={value === "repeat" ? "is-selected" : ""}
        onClick={() => onChange("repeat")}
        disabled={disabled}
      >
        Repeat
      </button>
    </div>
  );
}
