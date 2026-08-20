import { useState } from "react";
import { GolfTempoTrainer } from "./components/GolfTempoTrainer";
import { CameraPractice } from "./components/CameraPractice";
import { TempoFinder } from "./components/TempoFinder";
import { TabBar, type Tab } from "./components/TabBar";
import { useTempoSelection } from "./hooks/useTempoSelection";

export default function App() {
  const [tab, setTab] = useState<Tab>("trainer");
  const tempo = useTempoSelection();

  return (
    <div className="app">
      <main className="app-content">
        {tab === "trainer" && <GolfTempoTrainer tempo={tempo} />}
        {tab === "camera" && <CameraPractice tempo={tempo} />}
        {tab === "finder" && (
          <TempoFinder
            onTrainWithPreset={(preset) => {
              tempo.selectPreset(preset);
              setTab("trainer");
            }}
          />
        )}
      </main>
      <TabBar active={tab} onChange={setTab} />
    </div>
  );
}
