import { beforeEach, describe, expect, it } from "vitest";
import { LocalStoragePracticeRepository } from "./localStoragePracticeRepository";
import type { Club, PracticeSession, Shot } from "../types";

// Minimal in-memory localStorage polyfill -- this suite runs under
// Vitest's node environment, which has no localStorage of its own.
class MemoryStorage {
  private store = new Map<string, string>();
  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }
  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  clear(): void {
    this.store.clear();
  }
}

beforeEach(() => {
  (globalThis as unknown as { localStorage: MemoryStorage }).localStorage = new MemoryStorage();
});

function makeClub(overrides: Partial<Club> = {}): Club {
  return { id: overrides.id ?? "club-1", name: overrides.name ?? "56°", category: overrides.category ?? "wedge", order: overrides.order ?? 0 };
}

describe("LocalStoragePracticeRepository", () => {
  it("creates and persists a single user across instances", () => {
    const repoA = new LocalStoragePracticeRepository();
    const user = repoA.getUser();
    const repoB = new LocalStoragePracticeRepository();
    expect(repoB.getUser()).toEqual(user);
  });

  it("saves and lists clubs, upserting by id", () => {
    const repo = new LocalStoragePracticeRepository();
    repo.saveClub(makeClub({ id: "c1", name: "PW" }));
    repo.saveClub(makeClub({ id: "c2", name: "52°" }));
    expect(repo.listClubs().map((c) => c.name)).toEqual(["PW", "52°"]);

    repo.saveClub(makeClub({ id: "c1", name: "Pitching Wedge" }));
    expect(repo.listClubs()).toHaveLength(2);
    expect(repo.listClubs().find((c) => c.id === "c1")?.name).toBe("Pitching Wedge");
  });

  it("deletes a club", () => {
    const repo = new LocalStoragePracticeRepository();
    repo.saveClub(makeClub({ id: "c1" }));
    repo.deleteClub("c1");
    expect(repo.listClubs()).toHaveLength(0);
  });

  it("reorders clubs", () => {
    const repo = new LocalStoragePracticeRepository();
    repo.saveClub(makeClub({ id: "c1", order: 0 }));
    repo.saveClub(makeClub({ id: "c2", order: 1 }));
    repo.reorderClubs(["c2", "c1"]);
    const ordered = repo.listClubs().sort((a, b) => a.order - b.order);
    expect(ordered.map((c) => c.id)).toEqual(["c2", "c1"]);
  });

  it("deleting a session also deletes its shots", () => {
    const repo = new LocalStoragePracticeRepository();
    const session: PracticeSession = {
      id: "s1",
      userId: "u1",
      createdAt: Date.now(),
      endedAt: null,
      selection: { mode: "full-swing", clubCategory: "iron" },
      targetTempoName: "24/8",
      targetBackswingFrames: 24,
      targetDownswingFrames: 8,
      targetRatio: 3,
      targetCarry: null,
      unit: "m",
    };
    const shot: Shot = {
      id: "sh1",
      sessionId: "s1",
      createdAt: Date.now(),
      carry: 100,
      total: 105,
      roll: 5,
      unit: "m",
      success: true,
      note: "",
    };
    repo.saveSession(session);
    repo.saveShot(shot);
    expect(repo.listShots()).toHaveLength(1);

    repo.deleteSession("s1");
    expect(repo.listSessions()).toHaveLength(0);
    expect(repo.listShots()).toHaveLength(0);
  });

  it("never persists a video recording's blob URL", () => {
    const repo = new LocalStoragePracticeRepository();
    repo.saveVideoRecording({
      id: "v1",
      sessionId: "s1",
      shotId: null,
      createdAt: Date.now(),
      swingCount: 1,
      mimeType: "video/webm",
      videoUrl: "blob:http://localhost/fake",
    });
    expect(repo.listVideoRecordings()[0].videoUrl).toBeNull();
  });
});
