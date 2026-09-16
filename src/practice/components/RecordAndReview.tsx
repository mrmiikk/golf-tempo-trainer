import { useCallback, useEffect, useRef, useState } from "react";
import type { PracticeMode, RecordedSwingTempo, StartDelaySeconds, SwingCount } from "../../types";
import { FPS } from "../../data/presets";
import { useCameraStream } from "../../hooks/useCameraStream";
import { useSwingRecorder } from "../../hooks/useSwingRecorder";
import { useStoredState } from "../../hooks/useStoredState";
import { CameraPermission } from "../../components/CameraPermission";
import { SwingRecorder } from "../../components/SwingRecorder";
import { RecordedSwingReview } from "../../components/RecordedSwingReview";
import type { PracticeSession } from "../types";
import type { PracticeStore } from "../usePracticeStore";

const VISUAL_CUES_KEY = "golf-tempo-camera-visual-cues";

function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

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
  swingCount: SwingCount;
  onSwingCountChange: (value: SwingCount) => void;
  activeSession: PracticeSession;
  practiceStore: PracticeStore;
  onUseListenInstead: () => void;
};

// Camera permission is requested only once this screen is reached -- never
// on landing in the unified Practice setup, and never for Listen &
// Practice. Reuses the same camera/recording/review building blocks the
// old standalone Camera Practice feature used; this component's own job is
// just wiring them to the session's already-chosen settings instead of
// asking for them again.
export function RecordAndReview({
  tempoName,
  backswingFrames,
  downswingFrames,
  ratio,
  restSeconds,
  practiceMode,
  onPracticeModeChange,
  startDelaySeconds,
  onStartDelayChange,
  swingCount,
  onSwingCountChange,
  activeSession,
  practiceStore,
  onUseListenInstead,
}: Props) {
  const camera = useCameraStream();
  const [mirrored, setMirrored] = useState(false);
  const [userSetMirror, setUserSetMirror] = useState(false);
  const [visualCues, setVisualCues] = useStoredState(VISUAL_CUES_KEY, true, isBoolean);

  const recordingTempo: RecordedSwingTempo = {
    name: tempoName,
    backswingFrames,
    downswingFrames,
    backswingDuration: backswingFrames / FPS,
    downswingDuration: downswingFrames / FPS,
    ratio,
  };

  const recorder = useSwingRecorder({
    stream: camera.stream,
    tempo: recordingTempo,
    mode: practiceMode,
    startDelaySeconds,
    restSeconds,
    swingCount,
  });

  // Default mirror to what a natural self-view expects (front camera mirrors,
  // rear camera doesn't) whenever the active camera side changes, unless the
  // user has explicitly chosen a value already.
  useEffect(() => {
    if (!userSetMirror) setMirrored(camera.facingMode === "user");
  }, [camera.facingMode, userSetMirror]);

  const handleMirrorToggle = (next: boolean) => {
    setUserSetMirror(true);
    setMirrored(next);
  };

  const handleDisableCamera = useCallback(() => {
    if (recorder.stage !== "idle") {
      recorder.stopRecording();
      recorder.retake();
    }
    camera.disable();
  }, [recorder, camera]);

  // Every recorded video (and its swing markers) belongs to whichever
  // session was active when the recording finished -- no reliable
  // automatic link to a specific logged Shot exists yet (that would need
  // real pose detection or the user manually pairing a video with a shot),
  // so shotId stays null. Guarded so exactly one VideoRecording is created
  // per finished recording, never a duplicate.
  const loggedRecordingIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (recorder.stage !== "review" || !recorder.recordedSession) return;
    if (loggedRecordingIdRef.current === recorder.recordedSession.id) return;
    loggedRecordingIdRef.current = recorder.recordedSession.id;
    practiceStore.addVideoRecording({
      sessionId: activeSession.id,
      shotId: null,
      swingCount: recorder.recordedSession.swingCount,
      mimeType: recorder.recordedSession.mimeType,
      videoUrl: recorder.recordedSession.videoUrl,
      swings: recorder.recordedSession.swings,
    });
  }, [activeSession.id, recorder.stage, recorder.recordedSession, practiceStore]);

  const isReviewing = recorder.stage === "processing" || recorder.stage === "review";

  if (camera.status !== "active") {
    return (
      <CameraPermission
        status={camera.status}
        errorKind={camera.errorKind}
        onEnable={camera.enable}
        onRetry={camera.retry}
        onUseListenInstead={onUseListenInstead}
      />
    );
  }

  if (isReviewing && recorder.recordedSession) {
    return (
      <RecordedSwingReview
        session={recorder.recordedSession}
        stage={recorder.stage}
        onProcessed={recorder.finalizeReview}
        onRetake={recorder.retake}
        onRecordAnother={recorder.retake}
      />
    );
  }

  return (
    <SwingRecorder
      stream={camera.stream}
      mirrored={mirrored}
      activePhase={visualCues ? recorder.activePhase : null}
      visualCues={visualCues}
      stage={recorder.stage}
      countdown={recorder.countdown}
      mode={practiceMode}
      onChangeMode={onPracticeModeChange}
      startDelaySeconds={startDelaySeconds}
      onChangeStartDelay={onStartDelayChange}
      swingCount={swingCount}
      onChangeSwingCount={onSwingCountChange}
      sessionDisplay={recorder.sessionDisplay}
      onRecordSwing={recorder.recordSwing}
      onStopRecording={recorder.stopRecording}
      errorMessage={recorder.errorMessage}
      canSwitchCamera={camera.canSwitchCamera}
      onSwitchCamera={camera.switchCamera}
      onToggleMirror={handleMirrorToggle}
      onToggleVisualCues={setVisualCues}
      onDisableCamera={handleDisableCamera}
    />
  );
}
