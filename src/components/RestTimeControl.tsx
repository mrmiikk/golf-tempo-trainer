type Props = {
  restSeconds: number;
  onChange: (value: number) => void;
};

const MIN = 1;
const MAX = 5;
const STEP = 0.25;

export function RestTimeControl({ restSeconds, onChange }: Props) {
  const decrease = () => onChange(Math.max(MIN, +(restSeconds - STEP).toFixed(2)));
  const increase = () => onChange(Math.min(MAX, +(restSeconds + STEP).toFixed(2)));

  return (
    <div className="rest-control">
      <p className="rest-label">Rest between swings</p>
      <div className="rest-stepper">
        <button type="button" onClick={decrease} disabled={restSeconds <= MIN} aria-label="Decrease rest time">
          −
        </button>
        <span className="rest-value">{restSeconds.toFixed(2)}s</span>
        <button type="button" onClick={increase} disabled={restSeconds >= MAX} aria-label="Increase rest time">
          +
        </button>
      </div>
    </div>
  );
}
