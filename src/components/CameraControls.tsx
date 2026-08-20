type Props = {
  canSwitchCamera: boolean;
  onSwitchCamera: () => void;
  mirrored: boolean;
  onToggleMirror: (mirrored: boolean) => void;
  visualCues: boolean;
  onToggleVisualCues: (enabled: boolean) => void;
  onDisableCamera: () => void;
};

export function CameraControls({
  canSwitchCamera,
  onSwitchCamera,
  mirrored,
  onToggleMirror,
  visualCues,
  onToggleVisualCues,
  onDisableCamera,
}: Props) {
  return (
    <div className="camera-controls">
      {canSwitchCamera && (
        <button type="button" className="camera-control-chip" onClick={onSwitchCamera}>
          Switch Camera
        </button>
      )}
      <button
        type="button"
        className={`camera-control-chip${mirrored ? " is-on" : ""}`}
        onClick={() => onToggleMirror(!mirrored)}
        aria-pressed={mirrored}
      >
        Mirror: {mirrored ? "On" : "Off"}
      </button>
      <button
        type="button"
        className={`camera-control-chip${visualCues ? " is-on" : ""}`}
        onClick={() => onToggleVisualCues(!visualCues)}
        aria-pressed={visualCues}
      >
        Visual cues: {visualCues ? "On" : "Off"}
      </button>
      <button type="button" className="camera-control-chip camera-control-chip-danger" onClick={onDisableCamera}>
        Disable Camera
      </button>
    </div>
  );
}
