import { useCallback, useEffect, useRef, useState } from "react";
import type { PracticeMode, StartDelaySeconds } from "../types";
import { useSwingTrainer } from "../hooks/useSwingTrainer";
import { useCameraStream } from "../hooks/useCameraStream";
import type { TempoSelection } from "../hooks/useTempoSelection";
import { CameraPreview } from "./CameraPreview";
import { CameraPermission } from "./CameraPermission";
import { CameraControls } from "./CameraControls";
import { StartDelayControl } from "./StartDelayControl";
import { PracticeModeSelector } from "./PracticeModeSelector";
import { SwingIndicators } from "./SwingIndicators";
import { TempoPresetSelector } from "./TempoPresetSelector";
import { CustomTempoControl } from "./CustomTempoControl";
import { RestTimeControl } from "./RestTimeControl";
import { StartStopButton } from "./StartStopButton";

const VISUAL_CUES_KEY = "golf-tempo-camera-visual-cues";
const START_DELAY_KEY = "golf-tempo-camera-start-delay";
const PRACTICE_MODE_KEY = "golf-tempo-camera-practice-mode";

function loadBoolean(key: string, fallback: boolean): boolean {
  try {
    const stored = localStorage.getItem(key);
    return stored === null ? fallback : stored === "true";
  } catch {
    return fallback;
  }
}

function loadStartDelay(): StartDelaySeconds {
  try {
    const raw = localStorage.getItem(START_DELAY_KEY);
    if (raw !== null) {
      const stored = Number(raw);
      if (stored === 0 || stored === 3 || stored === 5 || stored === 10) return stored;
    }
  } catch {
    // ignore, fall through to default
  }
  return 3;
}

function loadPracticeMode(): PracticeMode {
  try {
    const stored = localStorage.getItem(PRACTICE_MODE_KEY);
    if (stored === "single" || stored === "repeat") return stored;
  } catch {
    // ignore, fall through to default
  }
  return "repeat";
}

type Props = {
  tempo: TempoSelection;
};

export function CameraPractice({ tempo }: Props) {
  const { preset, isCustom, customFrames, restSeconds, activeFrames, ratio, selectPreset, selectCustom, updateCustomFrames, setRestSeconds } =
    tempo;

  const camera = useCameraStream();
  const { isPlaying, activePhase, start, stop, backswingDuration, downswingDuration } = useSwingTrainer(
    activeFrames.backswingFrames,
    activeFrames.downswingFrames,
    restSeconds,
  );

  const [mirrored, setMirrored] = useState(false);
  const [userSetMirror, setUserSetMirror] = useState(false);
  const [visualCues, setVisualCues] = useState(() => loadBoolean(VISUAL_CUES_KEY, true));
  const [startDelaySeconds, setStartDelaySeconds] = useState<StartDelaySeconds>(loadStartDelay);
  const [practiceMode, setPracticeMode] = useState<PracticeMode>(loadPracticeMode);
  const [countdown, setCountdown] = useState<number | null>(null);

  const countdownIntervalRef = useRef<number | null>(null);
  const singleShotTimeoutRef = useRef<number | null>(null);

  // Default mirror to what a natural self-view expects (front camera mirrors,
  // rear camera doesn't) whenever the active camera side changes, unless the
  // user has explicitly chosen a value already.
  useEffect(() => {
    if (!userSetMirror) {
      setMirrored(camera.facingMode === "user");
    }
  }, [camera.facingMode, userSetMirror]);

  useEffect(() => {
    try {
      localStorage.setItem(VISUAL_CUES_KEY, String(visualCues));
    } catch {
      // ignore: preference simply won't persist
    }
  }, [visualCues]);

  useEffect(() => {
    try {
      localStorage.setItem(START_DELAY_KEY, String(startDelaySeconds));
    } catch {
      // ignore
    }
  }, [startDelaySeconds]);

  useEffect(() => {
    try {
      localStorage.setItem(PRACTICE_MODE_KEY, practiceMode);
    } catch {
      // ignore
    }
  }, [practiceMode]);

  const clearTimers = useCallback(() => {
    if (countdownIntervalRef.current !== null) {
      window.clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    if (singleShotTimeoutRef.current !== null) {
      window.clearTimeout(singleShotTimeoutRef.current);
      singleShotTimeoutRef.current = null;
    }
  }, []);

  const handleStop = useCallback(() => {
    clearTimers();
    setCountdown(null);
    stop();
  }, [clearTimers, stop]);

  useEffect(() => clearTimers, [clearTimers]);

  const handleStart = useCallback(async () => {
    const delay = startDelaySeconds;
    // Unlock/resume the AudioContext synchronously within this gesture, but
    // push the first swing out by `delay` seconds -- the countdown below is
    // a purely visual readout of that same delay, not a second clock.
    await start(delay > 0 ? delay : undefined);

    if (delay > 0) {
      let remaining = delay;
      setCountdown(remaining);
      countdownIntervalRef.current = window.setInterval(() => {
        remaining -= 1;
        if (remaining > 0) {
          setCountdown(remaining);
        } else {
          setCountdown(0);
          if (countdownIntervalRef.current !== null) {
            window.clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
          }
          window.setTimeout(() => setCountdown(null), 500);
        }
      }, 1000);
    }

    if (practiceMode === "single") {
      const totalMs = delay * 1000 + (backswingDuration + downswingDuration) * 1000 + 300;
      singleShotTimeoutRef.current = window.setTimeout(() => {
        singleShotTimeoutRef.current = null;
        handleStop();
      }, totalMs);
    }
  }, [start, startDelaySeconds, practiceMode, backswingDuration, downswingDuration, handleStop]);

  const handleSelectPreset = (next: Parameters<typeof selectPreset>[0]) => {
    handleStop();
    selectPreset(next);
  };

  const handleSelectCustom = () => {
    handleStop();
    selectCustom();
  };

  const handleCustomChange = (backswingFrames: number, downswingFrames: number) => {
    handleStop();
    updateCustomFrames(backswingFrames, downswingFrames);
  };

  const handleRestChange = (value: number) => {
    handleStop();
    setRestSeconds(value);
  };

  const handleMirrorToggle = (next: boolean) => {
    setUserSetMirror(true);
    setMirrored(next);
  };

  const handleDisableCamera = () => {
    handleStop();
    camera.disable();
  };

  const displayedPhase = visualCues ? activePhase : null;

  return (
    <div className="camera-practice">
      <p className="eyebrow">Camera Practice</p>
      <div className="camera-tempo-readout">
        <span className="camera-tempo-name">{isCustom ? "Custom" : preset.name}</span>
        <span className="camera-tempo-ratio">{ratio.toFixed(2)} : 1</span>
      </div>

      {camera.status !== "active" ? (
        <CameraPermission
          status={camera.status}
          errorKind={camera.errorKind}
          onEnable={camera.enable}
          onRetry={camera.retry}
        />
      ) : (
        <>
          <div className="camera-stage">
            <CameraPreview stream={camera.stream} mirrored={mirrored} />
            {visualCues && (
              <div className={`camera-flash-border${displayedPhase ? ` is-${displayedPhase}` : ""}`} aria-hidden="true" />
            )}
            {countdown !== null && (
              <div className="camera-countdown-overlay">{countdown > 0 ? countdown : "GO"}</div>
            )}
            <div className="camera-phase-overlay">
              <SwingIndicators activePhase={displayedPhase} />
            </div>
          </div>
          <CameraControls
            canSwitchCamera={camera.canSwitchCamera}
            onSwitchCamera={camera.switchCamera}
            mirrored={mirrored}
            onToggleMirror={handleMirrorToggle}
            visualCues={visualCues}
            onToggleVisualCues={setVisualCues}
            onDisableCamera={handleDisableCamera}
          />
        </>
      )}

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

      <div className="camera-practice-options">
        <PracticeModeSelector value={practiceMode} onChange={setPracticeMode} disabled={isPlaying} />
        <StartDelayControl value={startDelaySeconds} onChange={setStartDelaySeconds} disabled={isPlaying} />
      </div>

      <RestTimeControl restSeconds={restSeconds} onChange={handleRestChange} />
      <StartStopButton
        isPlaying={isPlaying}
        onToggle={isPlaying ? handleStop : handleStart}
      />
      <p className="camera-privacy-note">Camera video stays on your device and is not uploaded.</p>
    </div>
  );
}
