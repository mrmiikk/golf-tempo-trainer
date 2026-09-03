import { useCallback, useMemo, useState } from "react";
import { practiceRepository } from "./storage/localStoragePracticeRepository";
import type { Club, ClubCategory, PracticeSession, Shot, TempoMeasurement, VideoRecording } from "./types";

function makeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// The single source of truth for practice data, mounted once in App.tsx
// and shared the same way useTempoSelection already shares tempo state.
// All reads come from React state (so the UI re-renders normally); every
// write also goes through the repository, which is the one place that
// knows HOW the data is persisted.
export function usePracticeStore() {
  const [user] = useState(() => practiceRepository.getUser());
  const [clubs, setClubs] = useState<Club[]>(() => practiceRepository.listClubs());
  const [sessions, setSessions] = useState<PracticeSession[]>(() => practiceRepository.listSessions());
  const [shots, setShots] = useState<Shot[]>(() => practiceRepository.listShots());
  const [tempoMeasurements, setTempoMeasurements] = useState<TempoMeasurement[]>(() =>
    practiceRepository.listTempoMeasurements(),
  );
  const [videoRecordings, setVideoRecordings] = useState<VideoRecording[]>(() =>
    practiceRepository.listVideoRecordings(),
  );

  const addClub = useCallback((name: string, category: ClubCategory) => {
    setClubs((prev) => {
      const club: Club = { id: makeId("club"), name, category, order: prev.length };
      practiceRepository.saveClub(club);
      return [...prev, club];
    });
  }, []);

  const renameClub = useCallback((clubId: string, name: string) => {
    setClubs((prev) => {
      const next = prev.map((club) => (club.id === clubId ? { ...club, name } : club));
      const updated = next.find((club) => club.id === clubId);
      if (updated) practiceRepository.saveClub(updated);
      return next;
    });
  }, []);

  const removeClub = useCallback((clubId: string) => {
    practiceRepository.deleteClub(clubId);
    setClubs((prev) => prev.filter((club) => club.id !== clubId));
  }, []);

  const reorderClubs = useCallback((orderedIds: string[]) => {
    practiceRepository.reorderClubs(orderedIds);
    setClubs((prev) => {
      const byId = new Map(prev.map((club) => [club.id, club]));
      return orderedIds
        .map((id, index) => {
          const club = byId.get(id);
          return club ? { ...club, order: index } : null;
        })
        .filter((club): club is Club => club !== null);
    });
  }, []);

  const startSession = useCallback(
    (input: Omit<PracticeSession, "id" | "userId" | "createdAt" | "endedAt">) => {
      const session: PracticeSession = {
        ...input,
        id: makeId("session"),
        userId: user.id,
        createdAt: Date.now(),
        endedAt: null,
      };
      practiceRepository.saveSession(session);
      setSessions((prev) => [...prev, session]);
      return session;
    },
    [user.id],
  );

  const endSession = useCallback((sessionId: string) => {
    setSessions((prev) => {
      const next = prev.map((session) => (session.id === sessionId ? { ...session, endedAt: Date.now() } : session));
      const updated = next.find((session) => session.id === sessionId);
      if (updated) practiceRepository.saveSession(updated);
      return next;
    });
  }, []);

  const deleteSession = useCallback((sessionId: string) => {
    practiceRepository.deleteSession(sessionId);
    setSessions((prev) => prev.filter((session) => session.id !== sessionId));
    setShots((prev) => prev.filter((shot) => shot.sessionId !== sessionId));
  }, []);

  const addShot = useCallback((input: Omit<Shot, "id" | "createdAt">) => {
    const shot: Shot = { ...input, id: makeId("shot"), createdAt: Date.now() };
    practiceRepository.saveShot(shot);
    setShots((prev) => [...prev, shot]);
    return shot;
  }, []);

  const updateShot = useCallback((shot: Shot) => {
    practiceRepository.saveShot(shot);
    setShots((prev) => prev.map((existing) => (existing.id === shot.id ? shot : existing)));
  }, []);

  const removeShot = useCallback((shotId: string) => {
    practiceRepository.deleteShot(shotId);
    setShots((prev) => prev.filter((shot) => shot.id !== shotId));
  }, []);

  const addVideoRecording = useCallback((input: Omit<VideoRecording, "id" | "createdAt">) => {
    const recording: VideoRecording = { ...input, id: makeId("video"), createdAt: Date.now() };
    practiceRepository.saveVideoRecording(recording);
    // Keep the Blob URL in memory for this page load even though the
    // repository never persists it.
    setVideoRecordings((prev) => [...prev, recording]);
    return recording;
  }, []);

  const addTempoMeasurement = useCallback((input: Omit<TempoMeasurement, "id">) => {
    const measurement: TempoMeasurement = { ...input, id: makeId("tempo") };
    practiceRepository.saveTempoMeasurement(measurement);
    setTempoMeasurements((prev) => [...prev, measurement]);
    return measurement;
  }, []);

  const clubsSorted = useMemo(() => [...clubs].sort((a, b) => a.order - b.order), [clubs]);

  return {
    user,
    clubs: clubsSorted,
    sessions,
    shots,
    tempoMeasurements,
    videoRecordings,
    addClub,
    renameClub,
    removeClub,
    reorderClubs,
    startSession,
    endSession,
    deleteSession,
    addShot,
    updateShot,
    removeShot,
    addVideoRecording,
    addTempoMeasurement,
  };
}

export type PracticeStore = ReturnType<typeof usePracticeStore>;
