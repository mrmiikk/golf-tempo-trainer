import type { PreparationDelaySeconds, RecordingStage, SwingPhase } from "../types";
import { CameraPreview } from "./CameraPreview";
import { CameraControls } from "./CameraControls";
import { RecordingCountdown } from "./RecordingCountdown";
import { SwingIndicators } from "./SwingIndicators";

const PREP_OPTIONS: PreparationDelaySeconds[] = [1, 1.5, 2, 3];

type Props = {
  stream: MediaStream | null;
  mirrored: boolean;
  activePhase: SwingPhase | null;
  visualCues: boolean;
  stage: RecordingStage;
  countdown: number | null;
  preparationDelay: PreparationDelaySeconds;
  onChangePreparationDelay: (value: PreparationDelaySeconds) => void;
  onRecordSwing: () => void;
  onCancelCountdown: () => void;
  onStopRecording: () => void;
  errorMessage: string | null;
  canSwitchCamera: boolean;
  onSwitchCamera: () => void;
  onToggleMirror: (mirrored: boolean) => void;
  onToggleVisualCues: (enabled: boolean) => void;
  onDisableCamera: () => void;
};

export function SwingRecorder({
  stream,
  mirrored,
  activePhase,
  visualCues,
  stage,
  countdown,
  preparationDelay,
  onChangePreparationDelay,
  onRecordSwing,
  onCancelCountdown,
  onStopRecording,
  errorMessage,
  canSwitchCamera,
  onSwitchCamera,
  onToggleMirror,
  onToggleVisualCues,
  onDisableCamera,
}: Props) {
  const isBusy = stage === "countdown" || stage === "recording";
  const displayedPhase = visualCues ? activePhase : null;

  const handlePress = () => {
    if (stage === "recording") onStopRecording();
    else if (stage === "countdown") onCancelCountdown();
    else onRecordSwing();
  };

  return (
    <div className="swing-recorder">
      <div className="camera-stage">
        <CameraPreview stream={stream} mirrored={mirrored} />
        {visualCues && stage === "recording" && (
          <div className={`camera-flash-border${displayedPhase ? ` is-${displayedPhase}` : ""}`} aria-hidden="true" />
        )}
        <RecordingCountdown countdown={countdown} isRecording={stage === "recording"} />
        {stage === "recording" && (
          <div className="camera-phase-overlay">
            <SwingIndicators activePhase={displayedPhase} />
          </div>
        )}
      </div>

      {errorMessage && <p className="camera-error-note">{errorMessage}</p>}

      <CameraControls
        canSwitchCamera={canSwitchCamera && !isBusy}
        onSwitchCamera={onSwitchCamera}
        mirrored={mirrored}
        onToggleMirror={onToggleMirror}
        visualCues={visualCues}
        onToggleVisualCues={onToggleVisualCues}
        onDisableCamera={onDisableCamera}
      />

      <div className="start-delay-control">
        <p className="start-delay-label">Preparation delay</p>
        <div className="start-delay-options">
          {PREP_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              className={preparationDelay === option ? "is-selected" : ""}
              onClick={() => onChangePreparationDelay(option)}
              disabled={isBusy}
            >
              {option}s
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        className={`record-swing-button${isBusy ? " is-recording" : ""}`}
        onClick={handlePress}
        disabled={!stream}
      >
        {stage === "recording" ? "Stop Recording" : stage === "countdown" ? "Cancel" : "Record Swing"}
      </button>
      <p className="camera-privacy-note">Your video stays on this device and is not uploaded.</p>
    </div>
  );
}
