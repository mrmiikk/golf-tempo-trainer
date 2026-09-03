import type { Club, PracticeSession, Shot, TempoMeasurement, User, VideoRecording } from "../types";

// Everything the app needs to read/write practice data, independent of
// WHERE it's stored. Swapping localStorage for e.g. Supabase later means
// writing one new class that implements this interface -- nothing that
// calls the repository needs to change.
export interface PracticeRepository {
  getUser(): User;

  listClubs(): Club[];
  saveClub(club: Club): void;
  deleteClub(clubId: string): void;
  reorderClubs(orderedIds: string[]): void;

  listSessions(): PracticeSession[];
  saveSession(session: PracticeSession): void;
  deleteSession(sessionId: string): void;

  listShots(): Shot[];
  saveShot(shot: Shot): void;
  deleteShot(shotId: string): void;

  listTempoMeasurements(): TempoMeasurement[];
  saveTempoMeasurement(measurement: TempoMeasurement): void;

  listVideoRecordings(): VideoRecording[];
  saveVideoRecording(recording: VideoRecording): void;
}
