import { useState } from "react";
import { CameraPractice } from "./components/CameraPractice";
import { TempoFinder } from "./components/TempoFinder";
import { TabBar, type Tab } from "./components/TabBar";
import { useTempoSelection } from "./hooks/useTempoSelection";
import { usePracticeStore } from "./practice/usePracticeStore";
import { PracticeView } from "./practice/components/PracticeView";
import { MyBagView } from "./practice/components/MyBagView";
import { PracticeHistory } from "./practice/components/PracticeHistory";
import type { PracticeSession, WedgeSwingLength } from "./practice/types";

export default function App() {
  const [tab, setTab] = useState<Tab>("trainer");
  const tempo = useTempoSelection();
  const practiceStore = usePracticeStore();
  const [activeSession, setActiveSession] = useState<PracticeSession | null>(null);

  const handleStartWedgePracticeFromMatrix = (clubId: string, _clubName: string, _swingLength: WedgeSwingLength) => {
    // Just take the user to the setup flow with the right mode already
    // implied; re-selecting club/length there is one tap, and keeps
    // PracticeView as the single place session creation happens.
    void clubId;
    setTab("trainer");
  };

  return (
    <div className="app">
      <main className="app-content">
        {tab === "trainer" && (
          <PracticeView
            tempo={tempo}
            store={practiceStore}
            activeSession={activeSession}
            onSessionStart={setActiveSession}
            onSessionEnd={() => setActiveSession(null)}
            onOpenCamera={() => setTab("camera")}
          />
        )}
        {tab === "camera" && <CameraPractice tempo={tempo} activeSession={activeSession} practiceStore={practiceStore} />}
        {tab === "bag" && <MyBagView store={practiceStore} onStartWedgePractice={handleStartWedgePracticeFromMatrix} />}
        {tab === "history" && (
          <PracticeHistory
            sessions={practiceStore.sessions}
            shots={practiceStore.shots}
            onDeleteShot={practiceStore.removeShot}
            onDeleteSession={(sessionId) => {
              if (activeSession?.id === sessionId) setActiveSession(null);
              practiceStore.deleteSession(sessionId);
            }}
          />
        )}
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
