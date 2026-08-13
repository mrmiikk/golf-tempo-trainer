import { FPS } from "../data/presets";

type Props = {
  backswingFrames: number;
  downswingFrames: number;
  onChange: (backswingFrames: number, downswingFrames: number) => void;
};

export function CustomTempoControl({ backswingFrames, downswingFrames, onChange }: Props) {
  const backswingDuration = backswingFrames / FPS;
  const downswingDuration = downswingFrames / FPS;
  const total = backswingDuration + downswingDuration;
  const ratio = downswingFrames > 0 ? backswingFrames / downswingFrames : 0;

  return (
    <div className="custom-tempo">
      <div className="custom-inputs">
        <label>
          Backswing frames
          <input
            type="number"
            min={1}
            value={backswingFrames}
            onChange={(e) => onChange(Math.max(1, Number(e.target.value) || 1), downswingFrames)}
          />
        </label>
        <label>
          Downswing frames
          <input
            type="number"
            min={1}
            value={downswingFrames}
            onChange={(e) => onChange(backswingFrames, Math.max(1, Number(e.target.value) || 1))}
          />
        </label>
      </div>
      <div className="custom-summary">
        <div>
          <span className="label">Backswing</span>
          <span className="value">{backswingDuration.toFixed(3)}s</span>
        </div>
        <div>
          <span className="label">Downswing</span>
          <span className="value">{downswingDuration.toFixed(3)}s</span>
        </div>
        <div>
          <span className="label">Total</span>
          <span className="value">{total.toFixed(3)}s</span>
        </div>
        <div>
          <span className="label">Ratio</span>
          <span className="value">{ratio.toFixed(2)} : 1</span>
        </div>
      </div>
    </div>
  );
}
