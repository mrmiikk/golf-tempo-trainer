type Props = {
  isPlaying: boolean;
  onTogglePlay: () => void;
  onStepFrame: (direction: 1 | -1) => void;
  onNudge: (ms: number) => void;
};

export function FrameControls({ isPlaying, onTogglePlay, onStepFrame, onNudge }: Props) {
  return (
    <div className="frame-controls">
      <div className="frame-controls-row">
        <button type="button" onClick={() => onStepFrame(-1)} aria-label="Previous frame">
          ◀ Frame
        </button>
        <button type="button" className="frame-controls-play" onClick={onTogglePlay}>
          {isPlaying ? "Pause" : "Play"}
        </button>
        <button type="button" onClick={() => onStepFrame(1)} aria-label="Next frame">
          Frame ▶
        </button>
      </div>
      <div className="frame-controls-nudge">
        <button type="button" onClick={() => onNudge(-50)}>
          -50ms
        </button>
        <button type="button" onClick={() => onNudge(-10)}>
          -10ms
        </button>
        <button type="button" onClick={() => onNudge(10)}>
          +10ms
        </button>
        <button type="button" onClick={() => onNudge(50)}>
          +50ms
        </button>
      </div>
    </div>
  );
}
