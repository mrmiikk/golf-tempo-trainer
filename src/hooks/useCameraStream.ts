import { useCallback, useEffect, useRef, useState } from "react";
import type { CameraFacingMode } from "../types";

export type CameraStatus = "idle" | "requesting" | "active" | "error";
export type CameraErrorKind = "permission-denied" | "not-found" | "in-use" | "unsupported" | "timeout" | "unknown";

// getUserMedia() can hang indefinitely on some browsers/devices (a stalled
// permission prompt, an OS-level dialog nobody answers) -- the UI must
// never be stuck on "Requesting..." forever, so acquisition is raced
// against this and surfaced as its own explicit "timeout" error kind.
const REQUEST_TIMEOUT_MS = 15000;

function classifyError(err: unknown): CameraErrorKind {
  if (err instanceof DOMException) {
    switch (err.name) {
      case "NotAllowedError":
      case "SecurityError":
        return "permission-denied";
      case "NotFoundError":
      case "OverconstrainedError":
        return "not-found";
      case "NotReadableError":
      case "TrackStartError":
        return "in-use";
      default:
        return "unknown";
    }
  }
  return "unknown";
}

const TIMEOUT_SENTINEL = Symbol("camera-request-timeout");

// Owns getUserMedia acquisition, camera switching, and track cleanup only.
// Deliberately exposes the raw MediaStream (via `stream`) rather than
// rendering anything itself, so a future pose-tracking feature can consume
// the same stream/frames without CameraPreview or this hook being rewritten.
export function useCameraStream() {
  const [status, setStatus] = useState<CameraStatus>("idle");
  const [errorKind, setErrorKind] = useState<CameraErrorKind | null>(null);
  const [facingMode, setFacingMode] = useState<CameraFacingMode>("environment");
  const [canSwitchCamera, setCanSwitchCamera] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  // Bumped on every new acquire() call so a getUserMedia promise that
  // finally resolves AFTER its own request already timed out (or a newer
  // request superseded it) can recognize it's stale and not touch state.
  const requestIdRef = useRef(0);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setStream(null);
  }, []);

  const acquire = useCallback(
    async (requestedMode: CameraFacingMode) => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus("error");
        setErrorKind("unsupported");
        return;
      }
      const requestId = ++requestIdRef.current;
      setStatus("requesting");
      setErrorKind(null);
      stopStream();
      try {
        const nextStream = await Promise.race([
          navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: requestedMode } },
            audio: false,
          }),
          new Promise<typeof TIMEOUT_SENTINEL>((resolve) =>
            window.setTimeout(() => resolve(TIMEOUT_SENTINEL), REQUEST_TIMEOUT_MS),
          ),
        ]);

        if (requestId !== requestIdRef.current) {
          // A newer request (retry, or a later acquire()) has already taken
          // over; if this one actually won a real stream, don't leak it.
          if (nextStream !== TIMEOUT_SENTINEL) nextStream.getTracks().forEach((track) => track.stop());
          return;
        }

        if (nextStream === TIMEOUT_SENTINEL) {
          setStatus("error");
          setErrorKind("timeout");
          return;
        }

        streamRef.current = nextStream;
        setStream(nextStream);

        const settings = nextStream.getVideoTracks()[0]?.getSettings();
        const resolvedMode = (settings?.facingMode as CameraFacingMode | undefined) ?? requestedMode;
        setFacingMode(resolvedMode);
        setStatus("active");

        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          if (requestId !== requestIdRef.current) return;
          const videoInputs = devices.filter((device) => device.kind === "videoinput");
          setCanSwitchCamera(videoInputs.length > 1);
        } catch {
          if (requestId === requestIdRef.current) setCanSwitchCamera(false);
        }
      } catch (err) {
        if (requestId !== requestIdRef.current) return;
        setStatus("error");
        setErrorKind(classifyError(err));
      }
    },
    [stopStream],
  );

  const enable = useCallback(() => acquire(facingMode), [acquire, facingMode]);

  const disable = useCallback(() => {
    requestIdRef.current++; // invalidate any in-flight acquire()
    stopStream();
    setStatus("idle");
    setErrorKind(null);
  }, [stopStream]);

  const switchCamera = useCallback(() => {
    acquire(facingMode === "environment" ? "user" : "environment");
  }, [acquire, facingMode]);

  useEffect(() => () => stopStream(), [stopStream]);

  return { status, errorKind, facingMode, canSwitchCamera, stream, enable, disable, switchCamera, retry: enable };
}
