import type { StartDelaySeconds } from "../types";

const OPTIONS: StartDelaySeconds[] = [0, 3, 5, 10];

type Props = {
  value: StartDelaySeconds;
  onChange: (value: StartDelaySeconds) => void;
  disabled?: boolean;
};

export function StartDelayControl({ value, onChange, disabled }: Props) {
  return (
    <div className="start-delay-control">
      <p className="start-delay-label">Start delay</p>
      <div className="start-delay-options">
        {OPTIONS.map((option) => (
          <button
            key={option}
            type="button"
            className={value === option ? "is-selected" : ""}
            onClick={() => onChange(option)}
            disabled={disabled}
          >
            {option === 0 ? "Off" : `${option}s`}
          </button>
        ))}
      </div>
    </div>
  );
}
