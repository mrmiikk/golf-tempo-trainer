import type { CameraErrorKind, CameraStatus } from "../hooks/useCameraStream";

type Props = {
  status: CameraStatus;
  errorKind: CameraErrorKind | null;
  onEnable: () => void;
  onRetry: () => void;
};

const ERROR_MESSAGES: Record<CameraErrorKind, string> = {
  "permission-denied": "Camera permission was denied. Allow camera access in your browser settings and try again.",
  "not-found": "No camera was found on this device.",
  "in-use": "The camera is already in use by another app or browser tab.",
  unsupported: "This browser does not support camera access.",
  unknown: "Camera unavailable. Please try again.",
};

export function CameraPermission({ status, errorKind, onEnable, onRetry }: Props) {
  if (status === "error") {
    return (
      <div className="camera-permission camera-permission-error">
        <p className="camera-permission-title">Camera unavailable</p>
        <p className="camera-permission-message">{errorKind ? ERROR_MESSAGES[errorKind] : ERROR_MESSAGES.unknown}</p>
        <button type="button" className="btn-primary" onClick={onRetry}>
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="camera-permission">
      <p className="camera-permission-title">Camera permission required</p>
      <p className="camera-permission-message">
        See yourself live while the tempo clicks play. Camera video stays on your device and is not uploaded.
      </p>
      <button type="button" className="btn-primary" onClick={onEnable} disabled={status === "requesting"}>
        {status === "requesting" ? "Requesting…" : "Enable Camera"}
      </button>
    </div>
  );
}
