import type { Club, PracticeSession, Shot, TempoMeasurement, User, VideoRecording } from "../types";
import type { PracticeRepository } from "./practiceRepository";

const KEYS = {
  user: "golf-tempo-practice-user-v1",
  clubs: "golf-tempo-practice-clubs-v1",
  sessions: "golf-tempo-practice-sessions-v1",
  shots: "golf-tempo-practice-shots-v1",
  tempoMeasurements: "golf-tempo-practice-tempo-measurements-v1",
  // Video recordings are stored WITHOUT their videoUrl -- Blob URLs never
  // survive a reload, so persisting one would just be a dead reference.
  videoRecordings: "golf-tempo-practice-video-recordings-v1",
} as const;

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw !== null ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage unavailable or full; the in-memory store the caller already
    // updated keeps working for this session, it just won't persist.
  }
}

function upsertById<T extends { id: string }>(list: T[], item: T): T[] {
  const index = list.findIndex((existing) => existing.id === item.id);
  if (index === -1) return [...list, item];
  const next = [...list];
  next[index] = item;
  return next;
}

export class LocalStoragePracticeRepository implements PracticeRepository {
  getUser(): User {
    const existing = readJson<User | null>(KEYS.user, null);
    if (existing) return existing;
    const created: User = { id: `user-${Date.now()}`, createdAt: Date.now() };
    writeJson(KEYS.user, created);
    return created;
  }

  listClubs(): Club[] {
    return readJson<Club[]>(KEYS.clubs, []);
  }

  saveClub(club: Club): void {
    writeJson(KEYS.clubs, upsertById(this.listClubs(), club));
  }

  deleteClub(clubId: string): void {
    writeJson(
      KEYS.clubs,
      this.listClubs().filter((club) => club.id !== clubId),
    );
  }

  reorderClubs(orderedIds: string[]): void {
    const byId = new Map(this.listClubs().map((club) => [club.id, club]));
    const reordered = orderedIds
      .map((id, index) => {
        const club = byId.get(id);
        return club ? { ...club, order: index } : null;
      })
      .filter((club): club is Club => club !== null);
    writeJson(KEYS.clubs, reordered);
  }

  listSessions(): PracticeSession[] {
    return readJson<PracticeSession[]>(KEYS.sessions, []);
  }

  saveSession(session: PracticeSession): void {
    writeJson(KEYS.sessions, upsertById(this.listSessions(), session));
  }

  deleteSession(sessionId: string): void {
    writeJson(
      KEYS.sessions,
      this.listSessions().filter((session) => session.id !== sessionId),
    );
    writeJson(
      KEYS.shots,
      this.listShots().filter((shot) => shot.sessionId !== sessionId),
    );
  }

  listShots(): Shot[] {
    return readJson<Shot[]>(KEYS.shots, []);
  }

  saveShot(shot: Shot): void {
    writeJson(KEYS.shots, upsertById(this.listShots(), shot));
  }

  deleteShot(shotId: string): void {
    writeJson(
      KEYS.shots,
      this.listShots().filter((shot) => shot.id !== shotId),
    );
  }

  listTempoMeasurements(): TempoMeasurement[] {
    return readJson<TempoMeasurement[]>(KEYS.tempoMeasurements, []);
  }

  saveTempoMeasurement(measurement: TempoMeasurement): void {
    writeJson(KEYS.tempoMeasurements, upsertById(this.listTempoMeasurements(), measurement));
  }

  listVideoRecordings(): VideoRecording[] {
    return readJson<VideoRecording[]>(KEYS.videoRecordings, []);
  }

  saveVideoRecording(recording: VideoRecording): void {
    // Never persist the ephemeral Blob URL itself.
    const { videoUrl: _videoUrl, ...withoutUrl } = recording;
    writeJson(KEYS.videoRecordings, upsertById(this.listVideoRecordings(), { ...withoutUrl, videoUrl: null }));
  }
}

export const practiceRepository: PracticeRepository = new LocalStoragePracticeRepository();
