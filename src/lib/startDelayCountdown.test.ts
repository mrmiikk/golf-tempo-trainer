import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runDelayCountdown } from "./startDelayCountdown";

// This module is written against the DOM's `window.setInterval` etc. (the
// same convention used throughout the rest of this codebase's timer code),
// so under vitest's plain "node" environment `window` needs a stand-in --
// same pattern the practice repository test uses for `localStorage`.
beforeEach(() => {
  (globalThis as unknown as { window: typeof globalThis }).window = globalThis;
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval", "performance"] });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("runDelayCountdown", () => {
  it("never calls onTick and returns a no-op cancel for a zero/negative delay", () => {
    const onTick = vi.fn();
    const cancel = runDelayCountdown(0, onTick);
    vi.advanceTimersByTime(5000);
    expect(onTick).not.toHaveBeenCalled();
    expect(() => cancel()).not.toThrow();
  });

  it("counts down from the delay to 0, then clears with null, and never counts up", () => {
    const onTick = vi.fn();
    runDelayCountdown(3, onTick);

    // Immediate first call announces the full delay.
    expect(onTick).toHaveBeenCalledWith(3);

    vi.advanceTimersByTime(1000);
    expect(onTick).toHaveBeenCalledWith(2);

    vi.advanceTimersByTime(1000);
    expect(onTick).toHaveBeenCalledWith(1);

    vi.advanceTimersByTime(1000);
    expect(onTick).toHaveBeenCalledWith(0);

    vi.advanceTimersByTime(500);
    expect(onTick).toHaveBeenCalledWith(null);

    // Never called with anything higher than the initial delay after that.
    const calledValues = onTick.mock.calls.map((call) => call[0]);
    expect(Math.max(...calledValues.filter((v): v is number => v !== null))).toBe(3);
  });

  it("stops calling onTick once cancelled", () => {
    const onTick = vi.fn();
    const cancel = runDelayCountdown(5, onTick);
    vi.advanceTimersByTime(1000);
    const callsBeforeCancel = onTick.mock.calls.length;

    cancel();
    vi.advanceTimersByTime(10000);

    expect(onTick.mock.calls.length).toBe(callsBeforeCancel);
  });
});
