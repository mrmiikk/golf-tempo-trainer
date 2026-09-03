import { useEffect, useMemo, useState } from "react";
import type { TempoSelection } from "../../hooks/useTempoSelection";
import { FPS } from "../../data/presets";
import { TempoDisplay } from "../../components/TempoDisplay";
import { TempoPresetSelector } from "../../components/TempoPresetSelector";
import { CustomTempoControl } from "../../components/CustomTempoControl";
import { GolfTempoTrainer } from "../../components/GolfTempoTrainer";
import type { PracticeStore } from "../usePracticeStore";
import type {
  FullSwingClubCategory,
  PracticeSession,
  ShortGameSwingLength,
  ShortGameTechnique,
  TrainingModeKind,
  TrainingSelection,
  WedgeSwingLength,
} from "../types";
import {
  FULL_SWING_CLUB_LABELS,
  SHORT_GAME_SWING_LENGTH_LABELS,
  SHORT_GAME_TECHNIQUE_LABELS,
  TRAINING_MODE_LABELS,
  WEDGE_SWING_LENGTH_LABELS,
} from "../labels";
import { describeSelection } from "../describeSelection";
import { SHORT_GAME_DEFAULT_CUSTOM } from "../tempoDefaults";
import { computeRoll, computeSessionStats } from "../calculations";
import { ShotLogger } from "./ShotLogger";
import { SessionSummary } from "./SessionSummary";

const FULL_SWING_OPTIONS: FullSwingClubCategory[] = ["driver", "wood", "hybrid", "iron", "full-wedge"];
const WEDGE_LENGTH_OPTIONS: WedgeSwingLength[] = ["half", "three-quarter", "full"];
const SHORT_GAME_TECHNIQUE_OPTIONS: ShortGameTechnique[] = ["chip", "pitch", "bump-and-run", "lob", "bunker", "putt"];
const SHORT_GAME_LENGTH_OPTIONS: ShortGameSwingLength[] = ["knee", "hip", "waist", "chest", "shoulder"];

type Props = {
  tempo: TempoSelection;
  store: PracticeStore;
  activeSession: PracticeSession | null;
  onSessionStart: (session: PracticeSession) => void;
  onSessionEnd: () => void;
  onOpenCamera: () => void;
};

export function PracticeView({ tempo, store, activeSession, onSessionStart, onSessionEnd, onOpenCamera }: Props) {
  const [mode, setMode] = useState<TrainingModeKind | null>(null);
  const [fullSwingClub, setFullSwingClub] = useState<FullSwingClubCategory | null>(null);
  const [wedgeClubId, setWedgeClubId] = useState<string | null>(null);
  const [wedgeLength, setWedgeLength] = useState<WedgeSwingLength | null>(null);
  const [sgClubId, setSgClubId] = useState<string | null>(null);
  const [sgTechnique, setSgTechnique] = useState<ShortGameTechnique | null>(null);
  const [sgLength, setSgLength] = useState<ShortGameSwingLength | null>(null);
  const [targetCarryInput, setTargetCarryInput] = useState("");
  const [finishedSession, setFinishedSession] = useState<PracticeSession | null>(null);
  const [skipTracking, setSkipTracking] = useState(false);

  // Short Game gets a slower 2:1 suggestion the moment it's picked; the
  // preset selector right below still lets the user change it freely.
  useEffect(() => {
    if (mode === "short-game") {
      tempo.selectCustom();
      tempo.updateCustomFrames(SHORT_GAME_DEFAULT_CUSTOM.backswingFrames, SHORT_GAME_DEFAULT_CUSTOM.downswingFrames);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const selection: TrainingSelection | null = useMemo(() => {
    if (mode === "full-swing" && fullSwingClub) {
      return { mode: "full-swing", clubCategory: fullSwingClub };
    }
    if (mode === "distance-wedge" && wedgeClubId && wedgeLength) {
      const club = store.clubs.find((c) => c.id === wedgeClubId);
      if (!club) return null;
      return { mode: "distance-wedge", clubId: club.id, clubName: club.name, swingLength: wedgeLength };
    }
    if (mode === "short-game" && sgClubId && sgTechnique && sgLength) {
      const club = store.clubs.find((c) => c.id === sgClubId);
      if (!club) return null;
      return {
        mode: "short-game",
        clubId: club.id,
        clubName: club.name,
        technique: sgTechnique,
        swingLength: sgLength,
      };
    }
    return null;
  }, [mode, fullSwingClub, wedgeClubId, wedgeLength, sgClubId, sgTechnique, sgLength, store.clubs]);

  const resetSelection = () => {
    setMode(null);
    setFullSwingClub(null);
    setWedgeClubId(null);
    setWedgeLength(null);
    setSgClubId(null);
    setSgTechnique(null);
    setSgLength(null);
    setTargetCarryInput("");
    setSkipTracking(false);
  };

  const handleStartSession = () => {
    if (!selection) return;
    const parsedCarry = targetCarryInput.trim() === "" ? null : Number(targetCarryInput);
    const session = store.startSession({
      selection,
      targetTempoName: tempo.isCustom ? "Custom" : tempo.preset.name,
      targetBackswingFrames: tempo.activeFrames.backswingFrames,
      targetDownswingFrames: tempo.activeFrames.downswingFrames,
      targetRatio: tempo.ratio,
      targetCarry: parsedCarry !== null && Number.isFinite(parsedCarry) ? parsedCarry : null,
      unit: "m",
    });
    onSessionStart(session);
  };

  const handleEndSession = () => {
    if (!activeSession) return;
    store.endSession(activeSession.id);
    setFinishedSession(activeSession);
    onSessionEnd();
  };

  const handleStartNewFromSummary = () => {
    setFinishedSession(null);
    resetSelection();
  };

  if (activeSession) {
    const sessionShots = store.shots.filter((shot) => shot.sessionId === activeSession.id);
    return (
      <div className="practice-view">
        <div className="active-session-banner">
          <p className="active-session-title">{describeSelection(activeSession.selection)}</p>
          <p className="active-session-meta">
            Target: {activeSession.targetTempoName} ({activeSession.targetRatio.toFixed(2)}:1)
            {activeSession.targetCarry !== null &&
              ` · Target carry ${activeSession.targetCarry} ${activeSession.unit}`}
          </p>
        </div>

        <GolfTempoTrainer tempo={tempo} />

        <button type="button" className="btn-outline camera-link-button" onClick={onOpenCamera}>
          Open Camera Practice for this session
        </button>

        <ShotLogger
          shots={sessionShots}
          unit={activeSession.unit}
          onAddShot={(input) =>
            store.addShot({
              ...input,
              sessionId: activeSession.id,
              unit: activeSession.unit,
              roll: computeRoll(input.carry, input.total),
            })
          }
          onUpdateShot={store.updateShot}
          onDeleteShot={store.removeShot}
        />

        <button type="button" className="btn-primary end-session-button" onClick={handleEndSession}>
          End Session
        </button>
      </div>
    );
  }

  if (finishedSession) {
    return (
      <div className="practice-view">
        <SessionSummary
          stats={computeSessionStats(finishedSession, store.shots)}
          unit={finishedSession.unit}
          onStartNew={handleStartNewFromSummary}
        />
      </div>
    );
  }

  // Skipping tracking is the pre-existing behavior, completely unchanged:
  // just the tempo trainer, no mode/club selection or shot logging.
  if (skipTracking) {
    return (
      <div className="practice-view">
        <button type="button" className="btn-outline skip-tracking-back-button" onClick={() => setSkipTracking(false)}>
          ‹ Back to session setup
        </button>
        <GolfTempoTrainer tempo={tempo} />
      </div>
    );
  }

  return (
    <div className="practice-view">
      <p className="eyebrow">Practice</p>
      <h1 className="tempo-name practice-view-title">New Session</h1>

      <div className="training-mode-selector">
        {(["full-swing", "distance-wedge", "short-game"] as TrainingModeKind[]).map((option) => (
          <button
            key={option}
            type="button"
            className={mode === option ? "is-selected" : ""}
            onClick={() => setMode(option)}
          >
            {TRAINING_MODE_LABELS[option]}
          </button>
        ))}
      </div>

      {mode === null && (
        <button type="button" className="skip-tracking-link" onClick={() => setSkipTracking(true)}>
          Skip — just use the tempo trainer without tracking
        </button>
      )}

      {mode === "full-swing" && (
        <div className="training-context-selector">
          <p className="start-delay-label">Club</p>
          <div className="start-delay-options training-context-grid">
            {FULL_SWING_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                className={fullSwingClub === option ? "is-selected" : ""}
                onClick={() => setFullSwingClub(option)}
              >
                {FULL_SWING_CLUB_LABELS[option]}
              </button>
            ))}
          </div>
        </div>
      )}

      {mode === "distance-wedge" &&
        (store.clubs.length === 0 ? (
          <p className="club-manager-empty">Add a club in My Bag first.</p>
        ) : (
          <div className="training-context-selector">
            <p className="start-delay-label">Club</p>
            <div className="start-delay-options training-context-grid">
              {store.clubs.map((club) => (
                <button
                  key={club.id}
                  type="button"
                  className={wedgeClubId === club.id ? "is-selected" : ""}
                  onClick={() => setWedgeClubId(club.id)}
                >
                  {club.name}
                </button>
              ))}
            </div>
            <p className="start-delay-label">Swing length</p>
            <div className="start-delay-options">
              {WEDGE_LENGTH_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={wedgeLength === option ? "is-selected" : ""}
                  onClick={() => setWedgeLength(option)}
                >
                  {WEDGE_SWING_LENGTH_LABELS[option]}
                </button>
              ))}
            </div>
          </div>
        ))}

      {mode === "short-game" &&
        (store.clubs.length === 0 ? (
          <p className="club-manager-empty">Add a club in My Bag first.</p>
        ) : (
          <div className="training-context-selector">
            <p className="start-delay-label">Club</p>
            <div className="start-delay-options training-context-grid">
              {store.clubs.map((club) => (
                <button
                  key={club.id}
                  type="button"
                  className={sgClubId === club.id ? "is-selected" : ""}
                  onClick={() => setSgClubId(club.id)}
                >
                  {club.name}
                </button>
              ))}
            </div>
            <p className="start-delay-label">Technique</p>
            <div className="start-delay-options training-context-grid">
              {SHORT_GAME_TECHNIQUE_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={sgTechnique === option ? "is-selected" : ""}
                  onClick={() => setSgTechnique(option)}
                >
                  {SHORT_GAME_TECHNIQUE_LABELS[option]}
                </button>
              ))}
            </div>
            <p className="start-delay-label">Swing length</p>
            <div className="start-delay-options training-context-grid">
              {SHORT_GAME_LENGTH_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={sgLength === option ? "is-selected" : ""}
                  onClick={() => setSgLength(option)}
                >
                  {SHORT_GAME_SWING_LENGTH_LABELS[option]}
                </button>
              ))}
            </div>
          </div>
        ))}

      {selection && (
        <>
          <TempoDisplay
            name={tempo.isCustom ? "Custom" : tempo.preset.name}
            backswingDuration={tempo.activeFrames.backswingFrames / FPS}
            downswingDuration={tempo.activeFrames.downswingFrames / FPS}
            ratio={tempo.ratio}
          />
          <TempoPresetSelector
            selectedName={tempo.preset.name}
            isCustom={tempo.isCustom}
            onSelect={tempo.selectPreset}
            onSelectCustom={tempo.selectCustom}
          />
          {tempo.isCustom && (
            <CustomTempoControl
              backswingFrames={tempo.customFrames.backswingFrames}
              downswingFrames={tempo.customFrames.downswingFrames}
              onChange={tempo.updateCustomFrames}
            />
          )}

          <label className="target-carry-field">
            <span>Target carry (optional, m)</span>
            <input
              type="number"
              inputMode="decimal"
              value={targetCarryInput}
              onChange={(event) => setTargetCarryInput(event.target.value)}
              placeholder="e.g. 80"
            />
          </label>

          <button type="button" className="btn-primary start-session-button" onClick={handleStartSession}>
            Start Session
          </button>
        </>
      )}
    </div>
  );
}
