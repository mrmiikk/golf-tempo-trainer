import type { SwingPhase } from "../types";

type Props = { activePhase: SwingPhase | null };

const PHASES: { key: SwingPhase; label: string }[] = [
  { key: "start", label: "Start" },
  { key: "top", label: "Top" },
  { key: "impact", label: "Impact" },
];

export function SwingIndicators({ activePhase }: Props) {
  return (
    <div className="swing-indicators">
      {PHASES.map(({ key, label }) => (
        <div
          key={key}
          className={`indicator indicator-${key}${activePhase === key ? " is-active" : ""}`}
        >
          {label}
        </div>
      ))}
    </div>
  );
}
