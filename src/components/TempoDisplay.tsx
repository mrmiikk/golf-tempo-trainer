type Props = {
  name: string;
  backswingDuration: number;
  downswingDuration: number;
  ratio: number;
};

export function TempoDisplay({ name, backswingDuration, downswingDuration, ratio }: Props) {
  return (
    <div className="tempo-display">
      <p className="eyebrow">Golf Tempo</p>
      <h1 className="tempo-name">{name}</h1>
      <p className="tempo-ratio">{ratio.toFixed(2)} : 1</p>
      <div className="tempo-durations">
        <div className="tempo-duration">
          <span className="label">Backswing</span>
          <span className="value">{backswingDuration.toFixed(2)}s</span>
        </div>
        <div className="tempo-duration">
          <span className="label">Downswing</span>
          <span className="value">{downswingDuration.toFixed(2)}s</span>
        </div>
      </div>
    </div>
  );
}
