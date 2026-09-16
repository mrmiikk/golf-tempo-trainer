// Shared elapsed-based countdown poller. Previously this exact algorithm
// was duplicated inline in CameraPractice's handleStart (for Listen-style
// tempo playback) and approximated separately (a fixed 3s) in
// useSwingRecorder's single-mode recording. Extracted once so both the
// Listen & Practice and Record & Review paths show the same countdown
// behavior for the same shared "Start delay" setting.
//
// Polls frequently and derives the displayed number from elapsed
// wall-clock time (via performance.now()) rather than decrementing once
// per 1s tick, so a single delayed tick can't cost a full extra second of
// display lag. `onTick` is called with the remaining whole seconds while
// counting down, then `0` once ("GO"), then `null` shortly after to clear
// the overlay. Returns a cancel function that stops the poll immediately
// without calling `onTick` again.
export function runDelayCountdown(delaySeconds: number, onTick: (remaining: number | null) => void): () => void {
  if (delaySeconds <= 0) {
    return () => {};
  }

  const countdownStart = performance.now();
  let lastShown = delaySeconds + 1;
  let intervalId: number | null = null;
  let clearTimeoutId: number | null = null;

  const clear = () => {
    if (intervalId !== null) {
      window.clearInterval(intervalId);
      intervalId = null;
    }
    if (clearTimeoutId !== null) {
      window.clearTimeout(clearTimeoutId);
      clearTimeoutId = null;
    }
  };

  onTick(delaySeconds);
  intervalId = window.setInterval(() => {
    const elapsed = (performance.now() - countdownStart) / 1000;
    const remaining = Math.max(0, delaySeconds - Math.floor(elapsed));
    if (remaining === lastShown) return;
    lastShown = remaining;
    if (remaining > 0) {
      onTick(remaining);
    } else {
      onTick(0);
      if (intervalId !== null) {
        window.clearInterval(intervalId);
        intervalId = null;
      }
      clearTimeoutId = window.setTimeout(() => onTick(null), 500);
    }
  }, 100);

  return clear;
}
