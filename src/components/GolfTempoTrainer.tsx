import { useEffect, useState } from "react";
import type { TempoPreset } from "../types";
import { DEFAULT_PRESET } from "../data/presets";
import { useSwingTrainer } from "../hooks/useSwingTrainer";
import { TempoDisplay } from "./TempoDisplay";
import { SwingIndicators } from "./SwingIndicators";
import { SwingTimeline } from "./SwingTimeline";
import { TempoPresetSelector } from "./TempoPresetSelector";
import { RestTimeControl } from "./RestTimeControl";
import { StartStopButton } from "./StartStopButton";
import { CustomTempoControl } from "./CustomTempoControl";

type Props = {
  presetToApply: TempoPreset | null;
  onPresetApplied: () => void;
};

export function GolfTempoTrainer({ presetToApply, onPresetApplied }: Props) {
  const [preset, setPreset] = useState<TempoPreset>(DEFAULT_PRESET);
  const [isCustom, setIsCustom] = useState(false);
  const [customFrames, setCustomFrames] = useState({ backswingFrames: 24, downswingFrames: 8 });
  const [restSeconds, setRestSeconds] = useState(2);

  const activeFrames = isCustom ? customFrames : preset;
  const { isPlaying, activePhase, start, stop, backswingDuration, downswingDuration } = useSwingTrainer(
    activeFrames.backswingFrames,
    activeFrames.downswingFrames,
    restSeconds,
  );

  useEffect(() => {
    if (presetToApply) {
      stop();
      setPreset(presetToApply);
      setIsCustom(false);
      onPresetApplied();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presetToApply]);

  const handleSelectPreset = (next: TempoPreset) => {
    stop();
    setPreset(next);
    setIsCustom(false);
  };

  const handleSelectCustom = () => {
    stop();
    setIsCustom(true);
  };

  const handleCustomChange = (backswingFrames: number, downswingFrames: number) => {
    stop();
    setCustomFrames({ backswingFrames, downswingFrames });
  };

  const ratio = activeFrames.downswingFrames > 0 ? activeFrames.backswingFrames / activeFrames.downswingFrames : 0;

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
      <StartStopButton isPlaying={isPlaying} onToggle={isPlaying ? stop : start} />
    </div>
  );
}
