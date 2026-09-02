type Props = {
  countdown: number | null;
  isRecording: boolean;
};

export function RecordingCountdown({ countdown, isRecording }: Props) {
  if (countdown === null && !isRecording) return null;
  return (
    <>
      {countdown !== null && <div className="camera-countdown-overlay">{countdown > 0 ? countdown : "GO"}</div>}
      {isRecording && countdown === null && (
        <div className="recording-badge" aria-hidden="true">
          <span className="recording-dot" />
          REC
        </div>
      )}
    </>
  );
}
