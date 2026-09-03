import type { SwingMarkerSet, SwingPhase } from "../types";

type Props = {
  duration: number;
  currentTime: number;
  swings: SwingMarkerSet[];
  onSeek: (time: number) => void;
  onMarkerTap: (swingNumber: number, phase: SwingPhase, time: number) => void;
};

// One timeline spans the whole recorded session; every swing's START/TOP/
// IMPACT appears on it as a small colored tick (no per-tick text -- with up
// to 10 swings that's 30 marks, and permanent labels for all of them would
// overlap into noise on a phone). Tapping a tick jumps straight to it; the
// caller shows which marker was tapped elsewhere on screen.
export function TempoMarkerTimeline({ duration, currentTime, swings, onSeek, onMarkerTap }: Props) {
  const safeDuration = duration > 0 ? duration : 0.001;
  const pct = (t: number) => `${Math.min(100, Math.max(0, (t / safeDuration) * 100))}%`;

  return (
    <div className="marker-timeline">
      <div className="marker-timeline-track">
        <div className="marker-timeline-progress" style={{ width: pct(currentTime) }} />
        {swings.map((swing) => (
          <div key={swing.swingNumber} className="marker-timeline-swing-group">
            {(["start", "top", "impact"] as SwingPhase[]).map((phase) => (
              <button
                key={phase}
                type="button"
                className={`marker-tick is-${phase}`}
                style={{ left: pct(swing[phase]) }}
                onClick={() => onMarkerTap(swing.swingNumber, phase, swing[phase])}
                aria-label={`Swing ${swing.swingNumber} ${phase}`}
              />
            ))}
          </div>
        ))}
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
