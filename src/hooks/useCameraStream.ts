import { useCallback, useEffect, useRef, useState } from "react";
import type { CameraFacingMode } from "../types";

export type CameraStatus = "idle" | "requesting" | "active" | "error";
export type CameraErrorKind = "permission-denied" | "not-found" | "in-use" | "unsupported" | "unknown";

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
      setStatus("requesting");
      setErrorKind(null);
      stopStream();
      try {
        const nextStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: requestedMode } },
          audio: false,
        });
        streamRef.current = nextStream;
        setStream(nextStream);

        const settings = nextStream.getVideoTracks()[0]?.getSettings();
        const resolvedMode = (settings?.facingMode as CameraFacingMode | undefined) ?? requestedMode;
        setFacingMode(resolvedMode);
        setStatus("active");

        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const videoInputs = devices.filter((device) => device.kind === "videoinput");
          setCanSwitchCamera(videoInputs.length > 1);
        } catch {
          setCanSwitchCamera(false);
        }
      } catch (err) {
        setStatus("error");
        setErrorKind(classifyError(err));
      }
    },
    [stopStream],
  );

  const enable = useCallback(() => acquire(facingMode), [acquire, facingMode]);

  const disable = useCallback(() => {
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
