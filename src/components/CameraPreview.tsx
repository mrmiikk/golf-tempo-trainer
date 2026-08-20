import { useEffect, useRef } from "react";

type Props = {
  stream: MediaStream | null;
  mirrored: boolean;
};

// Pure video-rendering surface: binds a MediaStream to a <video> element.
// Knows nothing about camera acquisition or tempo -- a future pose-tracking
// feature can read frames from the same `stream` (e.g. via a hidden canvas)
// without touching this component.
export function CameraPreview({ stream, mirrored }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.srcObject = stream;
    if (stream) {
      video.play().catch(() => {
        // Autoplay can reject before the user gesture settles; the video
        // element will still start once the stream/DOM stabilizes.
      });
    }
  }, [stream]);

  return (
    <div className="camera-preview">
      <video
        ref={videoRef}
        className={`camera-video${mirrored ? " is-mirrored" : ""}`}
        autoPlay
        muted
        playsInline
        aria-label="Live camera preview"
      />
      <div className="camera-framing-guide" aria-hidden="true">
        <div className="camera-framing-center-line" />
        <div className="camera-framing-ground-line" />
      </div>
    </div>
  );
}
