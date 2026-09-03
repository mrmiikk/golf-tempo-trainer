import type {
  PreparationDelaySeconds,
  RecordingMode,
  RecordingStage,
  SessionDisplay,
  SwingCount,
  SwingPhase,
  TimeBetweenSwingsSeconds,
} from "../types";
import { CameraPreview } from "./CameraPreview";
import { CameraControls } from "./CameraControls";
import { RecordingCountdown } from "./RecordingCountdown";
import { SwingIndicators } from "./SwingIndicators";

const PREP_OPTIONS: PreparationDelaySeconds[] = [1, 1.5, 2, 3];
const SWING_COUNT_OPTIONS: SwingCount[] = [3, 5, 10];
const TIME_BETWEEN_OPTIONS: TimeBetweenSwingsSeconds[] = [3, 5, 7, 10];

type Props = {
  stream: MediaStream | null;
  mirrored: boolean;
  activePhase: SwingPhase | null;
  visualCues: boolean;
  stage: RecordingStage;
  countdown: number | null;
  mode: RecordingMode;
  onChangeMode: (mode: RecordingMode) => void;
  preparationDelay: PreparationDelaySeconds;
  onChangePreparationDelay: (value: PreparationDelaySeconds) => void;
  swingCount: SwingCount;
  onChangeSwingCount: (value: SwingCount) => void;
  restBetweenSwings: TimeBetweenSwingsSeconds;
  onChangeRestBetweenSwings: (value: TimeBetweenSwingsSeconds) => void;
  sessionDisplay: SessionDisplay | null;
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
  mode,
  onChangeMode,
  preparationDelay,
  onChangePreparationDelay,
  swingCount,
  onChangeSwingCount,
  restBetweenSwings,
  onChangeRestBetweenSwings,
  sessionDisplay,
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
  const isSession = mode === "session";
  const displayedPhase = visualCues ? activePhase : null;
  const showTempoIndicators = stage === "recording" && (!isSession || sessionDisplay?.phase === "swing");

  const handlePress = () => {
    if (stage === "recording") onStopRecording();
    else if (stage === "countdown") onCancelCountdown();
    else onRecordSwing();
  };

  return (
    <div className="swing-recorder">
      <div className="camera-stage">
        <CameraPreview stream={stream} mirrored={mirrored} />
        {visualCues && showTempoIndicators && (
          <div className={`camera-flash-border${displayedPhase ? ` is-${displayedPhase}` : ""}`} aria-hidden="true" />
        )}
        <RecordingCountdown countdown={countdown} isRecording={stage === "recording" && !isSession} />

        {stage === "recording" && isSession && sessionDisplay && (
          <div className="session-overlay" aria-hidden="true">
            <span className="recording-badge">
              <span className="recording-dot" />
              REC
            </span>
            {sessionDisplay.phase === "countdown" && (
              <div className="camera-countdown-overlay">{sessionDisplay.value}</div>
            )}
            {sessionDisplay.phase === "get-ready" && <div className="camera-countdown-overlay">GET READY</div>}
            {sessionDisplay.phase === "swing" && (
              <div className="session-swing-label">
                SWING {sessionDisplay.swingIndex + 1} / {swingCount}
              </div>
            )}
            {sessionDisplay.phase === "between" && (
              <>
                <div className="session-swing-label">
                  SWING {sessionDisplay.swingIndex + 1} / {swingCount}
                </div>
                <div className="session-next-swing">
                  <span>NEXT SWING IN</span>
                  <span className="session-next-swing-count">{sessionDisplay.nextIn}</span>
                </div>
              </>
            )}
          </div>
        )}

        {showTempoIndicators && (
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

      <div className="recording-mode-selector" role="group" aria-label="Recording mode">
        <button type="button" className={mode === "single" ? "is-selected" : ""} onClick={() => onChangeMode("single")} disabled={isBusy}>
          Single
        </button>
        <button type="button" className={mode === "session" ? "is-selected" : ""} onClick={() => onChangeMode("session")} disabled={isBusy}>
          Session
        </button>
      </div>

      {isSession ? (
        <>
          <div className="start-delay-control">
            <p className="start-delay-label">Swings</p>
            <div className="start-delay-options">
              {SWING_COUNT_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={swingCount === option ? "is-selected" : ""}
                  onClick={() => onChangeSwingCount(option)}
                  disabled={isBusy}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
          <div className="start-delay-control">
            <p className="start-delay-label">Time between swings</p>
            <div className="start-delay-options">
              {TIME_BETWEEN_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={restBetweenSwings === option ? "is-selected" : ""}
                  onClick={() => onChangeRestBetweenSwings(option)}
                  disabled={isBusy}
                >
                  {option}s
                </button>
              ))}
            </div>
          </div>
        </>
      ) : (
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
      )}

      <button
        type="button"
        className={`record-swing-button${isBusy ? " is-recording" : ""}`}
        onClick={handlePress}
        disabled={!stream}
      >
        {stage === "recording"
          ? "Stop Recording"
          : stage === "countdown"
            ? "Cancel"
            : isSession
              ? "Record Session"
              : "Record Swing"}
      </button>
      <p className="camera-privacy-note">Your video stays on this device and is not uploaded.</p>
    </div>
  );
}
