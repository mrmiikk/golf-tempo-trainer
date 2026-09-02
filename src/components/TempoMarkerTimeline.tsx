import type { VideoTempoMarkers } from "../types";

type Props = {
  duration: number;
  currentTime: number;
  markers: VideoTempoMarkers;
  onSeek: (time: number) => void;
};

export function TempoMarkerTimeline({ duration, currentTime, markers, onSeek }: Props) {
  const safeDuration = duration > 0 ? duration : 0.001;
  const pct = (t: number) => `${Math.min(100, Math.max(0, (t / safeDuration) * 100))}%`;

  return (
    <div className="marker-timeline">
      <div className="marker-timeline-track">
        <div className="marker-timeline-progress" style={{ width: pct(currentTime) }} />
        <div className="marker-tick is-start" style={{ left: pct(markers.start) }}>
          <span>START</span>
        </div>
        <div className="marker-tick is-top" style={{ left: pct(markers.top) }}>
          <span>TOP</span>
        </div>
        <div className="marker-tick is-impact" style={{ left: pct(markers.impact) }}>
          <span>IMPACT</span>
        </div>
        <div className="marker-timeline-playhead" style={{ left: pct(currentTime) }} />
      </div>
      <input
        type="range"
        className="marker-timeline-scrub"
        min={0}
        max={duration > 0 ? duration : 0.001}
        step={0.001}
        value={Math.min(currentTime, duration > 0 ? duration : 0)}
        onChange={(event) => onSeek(Number(event.target.value))}
        aria-label="Scrub recorded video"
      />
    </div>
  );
}
