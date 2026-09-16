import type { CameraErrorKind, CameraStatus } from "../hooks/useCameraStream";

type Props = {
  status: CameraStatus;
  errorKind: CameraErrorKind | null;
  onEnable: () => void;
  onRetry: () => void;
  onUseListenInstead: () => void;
};

// Six explicit states, per spec: Not requested / Requesting / Granted /
// Denied / Unavailable / Timed out or failed. "Granted" is handled by the
// caller (status === "active" renders the camera itself, not this
// component) -- this covers the other five, each with its own copy so the
// UI is never a generic "camera unavailable" catch-all.
const COPY: Record<
  CameraErrorKind,
  { title: string; message: string; showSettingsHint: boolean }
> = {
  "permission-denied": {
    title: "Camera permission denied",
    message: "You'll need to allow camera access for Record & Review to work.",
    showSettingsHint: true,
  },
  "not-found": {
    title: "No camera found",
    message: "This device doesn't appear to have a usable camera.",
    showSettingsHint: false,
  },
  "in-use": {
    title: "Camera unavailable",
    message: "The camera is already in use by another app or browser tab. Close it there and try again.",
    showSettingsHint: false,
  },
  unsupported: {
    title: "Camera not supported",
    message: "This browser does not support camera access.",
    showSettingsHint: false,
  },
  timeout: {
    title: "Camera request timed out",
    message: "The camera didn't respond in time. This can happen if a permission prompt was missed or dismissed.",
    showSettingsHint: true,
  },
  unknown: {
    title: "Camera unavailable",
    message: "Something went wrong accessing the camera. Please try again.",
    showSettingsHint: false,
  },
};

export function CameraPermission({ status, errorKind, onEnable, onRetry, onUseListenInstead }: Props) {
  if (status === "error") {
    const copy = errorKind ? COPY[errorKind] : COPY.unknown;
    return (
      <div className="camera-permission camera-permission-error">
        <p className="camera-permission-title">{copy.title}</p>
        <p className="camera-permission-message">{copy.message}</p>
        {copy.showSettingsHint && (
          <p className="camera-permission-hint">
            To enable it: open your browser's site settings for this page and set Camera to Allow, then retry.
          </p>
        )}
        <div className="camera-permission-actions">
          <button type="button" className="btn-primary" onClick={onRetry}>
            Retry
          </button>
          <button type="button" className="btn-outline" onClick={onUseListenInstead}>
            Use Listen & Practice instead
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="camera-permission">
      <p className="camera-permission-title">Camera permission required</p>
      <p className="camera-permission-message">
        See yourself live while the tempo clicks play, then review your recording. Camera video stays on your device
        and is not uploaded.
      </p>
      <div className="camera-permission-actions">
        <button type="button" className="btn-primary" onClick={onEnable} disabled={status === "requesting"}>
          {status === "requesting" ? "Requesting…" : "Enable Camera"}
        </button>
        <button type="button" className="btn-outline" onClick={onUseListenInstead}>
          Use Listen & Practice instead
        </button>
      </div>
    </div>
  );
}
