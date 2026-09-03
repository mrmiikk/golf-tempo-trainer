import { useState } from "react";
import { ClubManager } from "./ClubManager";
import { WedgeMatrix } from "./WedgeMatrix";
import { ShortGameMatrix } from "./ShortGameMatrix";
import { computeShortGameMatrix, computeWedgeMatrix } from "../calculations";
import type { PracticeStore } from "../usePracticeStore";
import type { WedgeSwingLength } from "../types";

type Props = {
  store: PracticeStore;
  onStartWedgePractice: (clubId: string, clubName: string, swingLength: WedgeSwingLength) => void;
};

type SubTab = "bag" | "wedge-matrix" | "short-game-matrix";

export function MyBagView({ store, onStartWedgePractice }: Props) {
  const [subTab, setSubTab] = useState<SubTab>("bag");
  const wedgeMatrix = computeWedgeMatrix(store.sessions, store.shots);
  const shortGameMatrix = computeShortGameMatrix(store.sessions, store.shots);

  return (
    <div className="my-bag-view">
      <p className="eyebrow">Distances</p>
      <div className="recording-mode-selector my-bag-subtabs">
        <button type="button" className={subTab === "bag" ? "is-selected" : ""} onClick={() => setSubTab("bag")}>
          My Bag
        </button>
        <button
          type="button"
          className={subTab === "wedge-matrix" ? "is-selected" : ""}
          onClick={() => setSubTab("wedge-matrix")}
        >
          Wedge Matrix
        </button>
        <button
          type="button"
          className={subTab === "short-game-matrix" ? "is-selected" : ""}
          onClick={() => setSubTab("short-game-matrix")}
        >
          Short Game
        </button>
      </div>

      {subTab === "bag" && (
        <ClubManager
          clubs={store.clubs}
          onAdd={store.addClub}
          onRename={store.renameClub}
          onRemove={store.removeClub}
          onReorder={store.reorderClubs}
        />
      )}
      {subTab === "wedge-matrix" && (
        <WedgeMatrix
          cells={wedgeMatrix}
          clubs={store.clubs}
          sessions={store.sessions}
          unit="m"
          onStartPractice={onStartWedgePractice}
        />
      )}
      {subTab === "short-game-matrix" && <ShortGameMatrix cells={shortGameMatrix} unit="m" />}
    </div>
  );
}
