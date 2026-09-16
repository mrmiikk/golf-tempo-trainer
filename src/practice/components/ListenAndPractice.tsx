import type { PracticeMode, StartDelaySeconds } from "../../types";
import { usePracticeRun } from "../../hooks/usePracticeRun";
import { TempoDisplay } from "../../components/TempoDisplay";
import { SwingTimeline } from "../../components/SwingTimeline";
import { SwingIndicators } from "../../components/SwingIndicators";
import { StartStopButton } from "../../components/StartStopButton";
import { PracticeModeSelector } from "../../components/PracticeModeSelector";
import { StartDelayControl } from "../../components/StartDelayControl";

type Props = {
  tempoName: string;
  backswingFrames: number;
  downswingFrames: number;
  ratio: number;
  restSeconds: number;
  practiceMode: PracticeMode;
  onPracticeModeChange: (mode: PracticeMode) => void;
  startDelaySeconds: StartDelaySeconds;
  onStartDelayChange: (value: StartDelaySeconds) => void;
};

// The camera-free practice surface: plays the tempo sounds and shows
// Start/Top/Impact feedback, no camera involved at all -- this is what
// used to require choosing "Tempo Trainer" as a whole separate feature.
// Tempo itself (preset/custom) and Rest between swings are configured once
// during setup and shown here read-only; Single/Repeat and Start delay
// stay live-adjustable, matching how Record & Review's own controls work.
export function ListenAndPractice({
  tempoName,
  backswingFrames,
  downswingFrames,
  ratio,
  restSeconds,
  practiceMode,
  onPracticeModeChange,
  startDelaySeconds,
  onStartDelayChange,
}: Props) {
  const { isPlaying, activePhase, countdown, error, start, stop, backswingDuration, downswingDuration } =
    usePracticeRun(backswingFrames, downswingFrames, restSeconds, practiceMode, startDelaySeconds);

  return (
    <div className="listen-and-practice">
      <TempoDisplay name={tempoName} backswingDuration={backswingDuration} downswingDuration={downswingDuration} ratio={ratio} />
      <SwingTimeline backswingDuration={backswingDuration} downswingDuration={downswingDuration} />
      {countdown !== null && <div className="trainer-countdown">{countdown > 0 ? countdown : "GO"}</div>}
      <SwingIndicators activePhase={activePhase} />

      <PracticeModeSelector value={practiceMode} onChange={onPracticeModeChange} disabled={isPlaying} />
      <StartDelayControl value={startDelaySeconds} onChange={onStartDelayChange} disabled={isPlaying} />

      {error && <p className="camera-error-note">{error}</p>}

      <StartStopButton isPlaying={isPlaying} onToggle={isPlaying ? stop : () => void start()} />
      <p className="camera-privacy-note">No camera is used in Listen &amp; Practice.</p>
    </div>
  );
}
