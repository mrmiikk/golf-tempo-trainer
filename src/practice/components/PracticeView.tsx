import { useMemo, useState } from "react";
import type { TempoSelection } from "../../hooks/useTempoSelection";
import { useStoredState } from "../../hooks/useStoredState";
import { FPS } from "../../data/presets";
import { TempoDisplay } from "../../components/TempoDisplay";
import { TempoPresetSelector } from "../../components/TempoPresetSelector";
import { CustomTempoControl } from "../../components/CustomTempoControl";
import { PracticeModeSelector } from "../../components/PracticeModeSelector";
import { StartDelayControl } from "../../components/StartDelayControl";
import { RestTimeControl } from "../../components/RestTimeControl";
import type { PracticeMode, StartDelaySeconds, SwingCount } from "../../types";
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
import { computeRoll, computeSessionStats } from "../calculations";
import { resolveClubChoices, resolveEffectiveClubId, resolveEffectiveClubName } from "../clubSelection";
import { ShotLogger } from "./ShotLogger";
import { SessionSummary } from "./SessionSummary";
import { ListenAndPractice } from "./ListenAndPractice";
import { RecordAndReview } from "./RecordAndReview";

const FULL_SWING_OPTIONS: FullSwingClubCategory[] = ["driver", "wood", "hybrid", "iron", "full-wedge"];
const WEDGE_LENGTH_OPTIONS: WedgeSwingLength[] = ["half", "three-quarter", "full"];
const SHORT_GAME_TECHNIQUE_OPTIONS: ShortGameTechnique[] = ["chip", "pitch", "bump-and-run", "lob", "bunker", "putt"];
const SHORT_GAME_LENGTH_OPTIONS: ShortGameSwingLength[] = ["knee", "hip", "waist", "chest", "shoulder"];

const MODE_KEY = "golf-tempo-selected-mode-v1";
const FULL_SWING_CLUB_KEY = "golf-tempo-full-swing-club-v1";
const SELECTED_CLUB_ID_KEY = "golf-tempo-selected-club-id-v1";
const WEDGE_LENGTH_KEY = "golf-tempo-wedge-length-v1";
const SG_TECHNIQUE_KEY = "golf-tempo-sg-technique-v1";
const SG_LENGTH_KEY = "golf-tempo-sg-length-v1";
const PRACTICE_MODE_KEY = "golf-tempo-practice-mode-v2";
const START_DELAY_KEY = "golf-tempo-start-delay-v2";
const SWING_COUNT_KEY = "golf-tempo-swing-count-v2";

function isTrainingMode(value: unknown): value is TrainingModeKind {
  return value === "full-swing" || value === "distance-wedge" || value === "short-game";
}
function isFullSwingClub(value: unknown): value is FullSwingClubCategory {
  return (FULL_SWING_OPTIONS as string[]).includes(value as string);
}
function isString(value: unknown): value is string {
  return typeof value === "string";
}
function isWedgeLength(value: unknown): value is WedgeSwingLength {
  return (WEDGE_LENGTH_OPTIONS as string[]).includes(value as string);
}
function isShortGameTechnique(value: unknown): value is ShortGameTechnique {
  return (SHORT_GAME_TECHNIQUE_OPTIONS as string[]).includes(value as string);
}
function isShortGameLength(value: unknown): value is ShortGameSwingLength {
  return (SHORT_GAME_LENGTH_OPTIONS as string[]).includes(value as string);
}
function isPracticeMode(value: unknown): value is PracticeMode {
  return value === "single" || value === "repeat";
}
function isStartDelay(value: unknown): value is StartDelaySeconds {
  return value === 0 || value === 3 || value === 5 || value === 10;
}
function isSwingCount(value: unknown): value is SwingCount {
  return value === 3 || value === 5 || value === 10;
}

type PracticeHow = "listen" | "record";

type Props = {
  tempo: TempoSelection;
  store: PracticeStore;
  activeSession: PracticeSession | null;
  onSessionStart: (session: PracticeSession) => void;
  onSessionEnd: () => void;
  onGoToMyBag: () => void;
};

export function PracticeView({ tempo, store, activeSession, onSessionStart, onSessionEnd, onGoToMyBag }: Props) {
  // Every setup choice is persisted and defaults to something immediately
  // valid -- the whole setup renders complete on first paint, never
  // waiting on a click before showing the rest of the page.
  const [mode, setMode] = useStoredState<TrainingModeKind>(MODE_KEY, "full-swing", isTrainingMode);
  const [fullSwingClub, setFullSwingClub] = useStoredState<FullSwingClubCategory>(
    FULL_SWING_CLUB_KEY,
    "driver",
    isFullSwingClub,
  );
  // Distance Wedge and Short Game draw from the same My Bag club list, so
  // they share one persisted selection -- switching between those two
  // modes keeps the same club instead of forgetting it.
  const [selectedClubId, setSelectedClubId] = useStoredState<string>(SELECTED_CLUB_ID_KEY, "", isString);
  const [wedgeLength, setWedgeLength] = useStoredState<WedgeSwingLength>(WEDGE_LENGTH_KEY, "half", isWedgeLength);
  const [sgTechnique, setSgTechnique] = useStoredState<ShortGameTechnique>(SG_TECHNIQUE_KEY, "chip", isShortGameTechnique);
  const [sgLength, setSgLength] = useStoredState<ShortGameSwingLength>(SG_LENGTH_KEY, "knee", isShortGameLength);
  const [targetCarryInput, setTargetCarryInput] = useState("");
  const [finishedSession, setFinishedSession] = useState<PracticeSession | null>(null);
  const [practiceHow, setPracticeHow] = useState<PracticeHow | null>(null);

  // Practice settings (Single/Repeat, Start delay, Swing count) are shared
  // between Listen & Practice and Record & Review, configured once here
  // during setup, and persisted like the rest of the app's preferences.
  const [practiceMode, setPracticeMode] = useStoredState<PracticeMode>(PRACTICE_MODE_KEY, "repeat", isPracticeMode);
  const [startDelaySeconds, setStartDelaySeconds] = useStoredState<StartDelaySeconds>(START_DELAY_KEY, 0, isStartDelay);
  const [swingCount, setSwingCount] = useStoredState<SwingCount>(SWING_COUNT_KEY, 5, isSwingCount);

  const hasClubs = store.clubs.length > 0;
  const clubChoices = useMemo(() => resolveClubChoices(store.clubs), [store.clubs]);
  const effectiveClubId = useMemo(
    () => resolveEffectiveClubId(store.clubs, selectedClubId),
    [store.clubs, selectedClubId],
  );
  const effectiveClubName = useMemo(
    () => resolveEffectiveClubName(store.clubs, effectiveClubId),
    [store.clubs, effectiveClubId],
  );

  const selection: TrainingSelection = useMemo(() => {
    if (mode === "full-swing") {
      return { mode: "full-swing", clubCategory: fullSwingClub };
    }
    if (mode === "distance-wedge") {
      return { mode: "distance-wedge", clubId: effectiveClubId, clubName: effectiveClubName, swingLength: wedgeLength };
    }
    return {
      mode: "short-game",
      clubId: effectiveClubId,
      clubName: effectiveClubName,
      technique: sgTechnique,
      swingLength: sgLength,
    };
  }, [mode, fullSwingClub, effectiveClubId, effectiveClubName, wedgeLength, sgTechnique, sgLength]);

  const handleStart = (how: PracticeHow) => {
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
    setPracticeHow(how);
    onSessionStart(session);
  };

  const handleEndSession = () => {
    if (!activeSession) return;
    store.endSession(activeSession.id);
    setFinishedSession(activeSession);
    setPracticeHow(null);
    onSessionEnd();
  };

  // Setup choices (swing type, club, tempo, practice settings) are
  // persisted preferences now, not a one-shot wizard -- starting a new
  // session keeps them so a quick repeat doesn't force re-picking
  // everything. Only the per-session target carry input is cleared.
  const handleStartNewFromSummary = () => {
    setFinishedSession(null);
    setTargetCarryInput("");
  };

  if (activeSession && practiceHow) {
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

        {practiceHow === "record" ? (
          <RecordAndReview
            tempoName={activeSession.targetTempoName}
            backswingFrames={activeSession.targetBackswingFrames}
            downswingFrames={activeSession.targetDownswingFrames}
            ratio={activeSession.targetRatio}
            restSeconds={tempo.restSeconds}
            practiceMode={practiceMode}
            onPracticeModeChange={setPracticeMode}
            startDelaySeconds={startDelaySeconds}
            onStartDelayChange={setStartDelaySeconds}
            swingCount={swingCount}
            onSwingCountChange={setSwingCount}
            activeSession={activeSession}
            practiceStore={store}
            onUseListenInstead={() => setPracticeHow("listen")}
          />
        ) : (
          <ListenAndPractice
            tempoName={activeSession.targetTempoName}
            backswingFrames={activeSession.targetBackswingFrames}
            downswingFrames={activeSession.targetDownswingFrames}
            ratio={activeSession.targetRatio}
            restSeconds={tempo.restSeconds}
            practiceMode={practiceMode}
            onPracticeModeChange={setPracticeMode}
            startDelaySeconds={startDelaySeconds}
            onStartDelayChange={setStartDelaySeconds}
          />
        )}

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

  return (
    <div className="practice-view">
      <p className="eyebrow">Practice</p>
      <h1 className="tempo-name practice-view-title">New Session</h1>

      {/* 1. Swing type -- always visible, defaults to Full Swing. */}
      <div className="training-mode-selector" role="group" aria-label="Swing type">
        {(["full-swing", "distance-wedge", "short-game"] as TrainingModeKind[]).map((option) => (
          <button
            key={option}
            type="button"
            className={mode === option ? "is-selected" : ""}
            aria-pressed={mode === option}
            onClick={() => setMode(option)}
          >
            {TRAINING_MODE_LABELS[option]}
          </button>
        ))}
      </div>

      {/* 2. Club -- content adapts to swing type, the card itself never disappears. */}
      <div className="training-context-selector">
        <p className="start-delay-label">Club</p>
        <div className="start-delay-options training-context-grid" role="group" aria-label="Club">
          {mode === "full-swing"
            ? FULL_SWING_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={fullSwingClub === option ? "is-selected" : ""}
                  aria-pressed={fullSwingClub === option}
                  onClick={() => setFullSwingClub(option)}
                >
                  {FULL_SWING_CLUB_LABELS[option]}
                </button>
              ))
            : clubChoices.map((club) => (
                <button
                  key={club.id}
                  type="button"
                  className={effectiveClubId === club.id ? "is-selected" : ""}
                  aria-pressed={effectiveClubId === club.id}
                  onClick={() => setSelectedClubId(club.id)}
                >
                  {club.name}
                </button>
              ))}
        </div>

        {mode !== "full-swing" && !hasClubs && (
          <p className="club-manager-empty-inline">
            Practicing without a saved club -- add your real clubs any time for per-club distance tracking.
            <button type="button" className="btn-outline add-club-inline-link" onClick={onGoToMyBag}>
              Add Club to My Bag
            </button>
          </p>
        )}

        {mode === "distance-wedge" && (
          <>
            <p className="start-delay-label">Swing length</p>
            <div className="start-delay-options" role="group" aria-label="Swing length">
              {WEDGE_LENGTH_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={wedgeLength === option ? "is-selected" : ""}
                  aria-pressed={wedgeLength === option}
                  onClick={() => setWedgeLength(option)}
                >
                  {WEDGE_SWING_LENGTH_LABELS[option]}
                </button>
              ))}
            </div>
          </>
        )}

        {mode === "short-game" && (
          <>
            <p className="start-delay-label">Technique</p>
            <div className="start-delay-options training-context-grid" role="group" aria-label="Technique">
              {SHORT_GAME_TECHNIQUE_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={sgTechnique === option ? "is-selected" : ""}
                  aria-pressed={sgTechnique === option}
                  onClick={() => setSgTechnique(option)}
                >
                  {SHORT_GAME_TECHNIQUE_LABELS[option]}
                </button>
              ))}
            </div>
            <p className="start-delay-label">Swing length</p>
            <div className="start-delay-options training-context-grid" role="group" aria-label="Swing length">
              {SHORT_GAME_LENGTH_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={sgLength === option ? "is-selected" : ""}
                  aria-pressed={sgLength === option}
                  onClick={() => setSgLength(option)}
                >
                  {SHORT_GAME_SWING_LENGTH_LABELS[option]}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* 3. Golf tempo -- always visible; Custom only reveals its extra inputs. */}
      <div className="tempo-setup-card">
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
      </div>

      {/* 4. Practice settings -- always visible. */}
      <div className="practice-settings-group">
        <p className="eyebrow">Practice settings</p>
        <PracticeModeSelector value={practiceMode} onChange={setPracticeMode} />
        <StartDelayControl value={startDelaySeconds} onChange={setStartDelaySeconds} />
        <RestTimeControl restSeconds={tempo.restSeconds} onChange={tempo.setRestSeconds} />
      </div>

      {/* 5. Optional target -- always visible for every swing type. */}
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

      {/* 6 & 7. Final actions -- always visible and always usable, since a
          General Practice club stands in when My Bag has nothing saved. */}
      <div className="mode-choice-group">
        <button type="button" className="mode-choice-button" onClick={() => handleStart("listen")}>
          <span className="mode-choice-title">Listen &amp; Practice</span>
          <span className="mode-choice-description">Practise with tempo sounds without recording video.</span>
        </button>
        <button
          type="button"
          className="mode-choice-button mode-choice-button-record"
          onClick={() => handleStart("record")}
        >
          <span className="mode-choice-title">Record &amp; Review</span>
          <span className="mode-choice-description">Record your session and review every swing afterwards.</span>
        </button>
      </div>
    </div>
  );
}
