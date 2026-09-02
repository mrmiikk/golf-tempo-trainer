import type { PlaybackSpeed } from "../types";

const SPEEDS: PlaybackSpeed[] = [1, 0.5, 0.25];

type Props = {
  value: PlaybackSpeed;
  onChange: (value: PlaybackSpeed) => void;
};

export function PlaybackSpeedControl({ value, onChange }: Props) {
  return (
    <div className="playback-speed-control" role="group" aria-label="Playback speed">
      {SPEEDS.map((speed) => (
        <button key={speed} type="button" className={value === speed ? "is-selected" : ""} onClick={() => onChange(speed)}>
          {speed}x
        </button>
      ))}
    </div>
  );
}
