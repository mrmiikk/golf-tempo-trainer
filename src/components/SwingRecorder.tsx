import type { PracticeMode, RecordingStage, SessionDisplay, StartDelaySeconds, SwingCount, SwingPhase } from "../types";
import { CameraPreview } from "./CameraPreview";
import { CameraControls } from "./CameraControls";
import { RecordingCountdown } from "./RecordingCountdown";
import { SwingIndicators } from "./SwingIndicators";
import { PracticeModeSelector } from "./PracticeModeSelector";
import { StartDelayControl } from "./StartDelayControl";

const SWING_COUNT_OPTIONS: SwingCount[] = [3, 5, 10];

type Props = {
  stream: MediaStream | null;
  mirrored: boolean;
  activePhase: SwingPhase | null;
  visualCues: boolean;
  stage: RecordingStage;
  countdown: number | null;
  mode: PracticeMode;
  onChangeMode: (mode: PracticeMode) => void;
  startDelaySeconds: StartDelaySeconds;
  onChangeStartDelay: (value: StartDelaySeconds) => void;
  swingCount: SwingCount;
  onChangeSwingCount: (value: SwingCount) => void;
  sessionDisplay: SessionDisplay | null;
  onRecordSwing: () => void;
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
  startDelaySeconds,
  onChangeStartDelay,
  swingCount,
  onChangeSwingCount,
  sessionDisplay,
  onRecordSwing,
  onStopRecording,
  errorMessage,
  canSwitchCamera,
  onSwitchCamera,
  onToggleMirror,
  onToggleVisualCues,
  onDisableCamera,
}: Props) {
  const isBusy = stage === "recording";
  const isRepeat = mode === "repeat";
  const displayedPhase = visualCues ? activePhase : null;
  const showTempoIndicators = stage === "recording" && (!isRepeat || sessionDisplay?.phase === "swing");

  return (
    <div className="swing-recorder">
      <div className="camera-stage">
        <CameraPreview stream={stream} mirrored={mirrored} />
        {visualCues && showTempoIndicators && (
          <div className={`camera-flash-border${displayedPhase ? ` is-${displayedPhase}` : ""}`} aria-hidden="true" />
        )}
        <RecordingCountdown countdown={countdown} isRecording={stage === "recording" && !isRepeat} />

        {stage === "recording" && isRepeat && sessionDisplay && (
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

      <PracticeModeSelector value={mode} onChange={onChangeMode} disabled={isBusy} />

      {mode === "single" ? (
        <StartDelayControl value={startDelaySeconds} onChange={onChangeStartDelay} disabled={isBusy} />
      ) : (
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
      )}

      <button
        type="button"
        className={`record-swing-button${isBusy ? " is-recording" : ""}`}
        onClick={stage === "recording" ? onStopRecording : onRecordSwing}
        disabled={!stream}
      >
        {stage === "recording" ? "Stop Recording" : isRepeat ? "Record Session" : "Record Swing"}
      </button>
      <p className="camera-privacy-note">Your video stays on this device and is not uploaded.</p>
    </div>
  );
}
