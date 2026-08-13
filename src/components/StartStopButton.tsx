type Props = {
  isPlaying: boolean;
  onToggle: () => void;
};

export function StartStopButton({ isPlaying, onToggle }: Props) {
  return (
    <button type="button" className={`start-stop-button${isPlaying ? " is-playing" : ""}`} onClick={onToggle}>
      {isPlaying ? "Stop" : "Start Tempo"}
    </button>
  );
}
