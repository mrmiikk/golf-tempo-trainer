import { useState } from "react";
import type { TempoPreset } from "./types";
import { GolfTempoTrainer } from "./components/GolfTempoTrainer";
import { TempoFinder } from "./components/TempoFinder";
import { TabBar, type Tab } from "./components/TabBar";

export default function App() {
  const [tab, setTab] = useState<Tab>("trainer");
  const [presetToApply, setPresetToApply] = useState<TempoPreset | null>(null);

  const handleTrainWithPreset = (preset: TempoPreset) => {
    setPresetToApply(preset);
    setTab("trainer");
  };

  return (
    <div className="app">
      <main className="app-content">
        {tab === "trainer" ? (
          <GolfTempoTrainer presetToApply={presetToApply} onPresetApplied={() => setPresetToApply(null)} />
        ) : (
          <TempoFinder onTrainWithPreset={handleTrainWithPreset} />
        )}
      </main>
      <TabBar active={tab} onChange={setTab} />
    </div>
  );
}
