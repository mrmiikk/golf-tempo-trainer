import { useSwingTrainer } from "../hooks/useSwingTrainer";
import type { TempoSelection } from "../hooks/useTempoSelection";
import { TempoDisplay } from "./TempoDisplay";
import { SwingIndicators } from "./SwingIndicators";
import { SwingTimeline } from "./SwingTimeline";
import { TempoPresetSelector } from "./TempoPresetSelector";
import { RestTimeControl } from "./RestTimeControl";
import { StartStopButton } from "./StartStopButton";
import { CustomTempoControl } from "./CustomTempoControl";

type Props = {
  tempo: TempoSelection;
};

export function GolfTempoTrainer({ tempo }: Props) {
  const { preset, isCustom, customFrames, restSeconds, activeFrames, ratio, selectPreset, selectCustom, updateCustomFrames, setRestSeconds } =
    tempo;

  const { isPlaying, activePhase, start, stop, backswingDuration, downswingDuration } = useSwingTrainer(
    activeFrames.backswingFrames,
    activeFrames.downswingFrames,
    restSeconds,
  );

  const handleSelectPreset = (next: Parameters<typeof selectPreset>[0]) => {
    stop();
    selectPreset(next);
  };

  const handleSelectCustom = () => {
    stop();
    selectCustom();
  };

  const handleCustomChange = (backswingFrames: number, downswingFrames: number) => {
    stop();
    updateCustomFrames(backswingFrames, downswingFrames);
  };

  return (
    <div className="trainer-view">
      <TempoDisplay
        name={isCustom ? "Custom" : preset.name}
        backswingDuration={backswingDuration}
        downswingDuration={downswingDuration}
        ratio={ratio}
      />
      <SwingTimeline backswingDuration={backswingDuration} downswingDuration={downswingDuration} />
      <SwingIndicators activePhase={activePhase} />
      <TempoPresetSelector
        selectedName={preset.name}
        isCustom={isCustom}
        onSelect={handleSelectPreset}
        onSelectCustom={handleSelectCustom}
      />
      {isCustom && (
        <CustomTempoControl
          backswingFrames={customFrames.backswingFrames}
          downswingFrames={customFrames.downswingFrames}
          onChange={handleCustomChange}
        />
      )}
      <RestTimeControl restSeconds={restSeconds} onChange={setRestSeconds} />
      <StartStopButton isPlaying={isPlaying} onToggle={isPlaying ? stop : () => void start()} />
    </div>
  );
}
