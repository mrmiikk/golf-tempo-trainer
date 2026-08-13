type Props = {
  backswingDuration: number;
  downswingDuration: number;
};

export function SwingTimeline({ backswingDuration, downswingDuration }: Props) {
  const total = backswingDuration + downswingDuration;
  const backswingPct = total > 0 ? (backswingDuration / total) * 100 : 75;
  const downswingPct = 100 - backswingPct;

  return (
    <div className="swing-timeline">
      <div className="timeline-bar">
        <div className="segment segment-backswing" style={{ width: `${backswingPct}%` }} />
        <div className="segment segment-downswing" style={{ width: `${downswingPct}%` }} />
      </div>
      <div className="timeline-labels">
        <span>Start</span>
        <span>Top</span>
        <span>Impact</span>
      </div>
    </div>
  );
}
