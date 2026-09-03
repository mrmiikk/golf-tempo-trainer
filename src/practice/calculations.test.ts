import { describe, expect, it } from "vitest";
import {
  computeDistanceStats,
  computeRoll,
  computeSessionStats,
  computeShortGameMatrix,
  computeWedgeMatrix,
  validateShotDistances,
} from "./calculations";
import type { PracticeSession, Shot } from "./types";

function makeShot(overrides: Partial<Shot>): Shot {
  return {
    id: overrides.id ?? "shot-1",
    sessionId: overrides.sessionId ?? "session-1",
    createdAt: overrides.createdAt ?? Date.now(),
    carry: overrides.carry ?? null,
    total: overrides.total ?? null,
    roll: overrides.roll ?? null,
    unit: overrides.unit ?? "m",
    success: overrides.success ?? true,
    note: overrides.note ?? "",
  };
}

function makeSession(overrides: Partial<PracticeSession>): PracticeSession {
  return {
    id: overrides.id ?? "session-1",
    userId: overrides.userId ?? "user-1",
    createdAt: overrides.createdAt ?? Date.now(),
    endedAt: overrides.endedAt ?? null,
    selection: overrides.selection ?? { mode: "full-swing", clubCategory: "iron" },
    targetTempoName: overrides.targetTempoName ?? "24/8",
    targetBackswingFrames: overrides.targetBackswingFrames ?? 24,
    targetDownswingFrames: overrides.targetDownswingFrames ?? 8,
    targetRatio: overrides.targetRatio ?? 3,
    targetCarry: overrides.targetCarry ?? null,
    unit: overrides.unit ?? "m",
  };
}

describe("computeRoll", () => {
  it("subtracts carry from total", () => {
    expect(computeRoll(80, 95)).toBe(15);
  });

  it("returns null when either value is missing", () => {
    expect(computeRoll(null, 95)).toBeNull();
    expect(computeRoll(80, null)).toBeNull();
  });

  it("never returns a negative value even if called on unvalidated input", () => {
    expect(computeRoll(90, 80)).toBe(0);
  });

  it("returns 0 when total equals carry", () => {
    expect(computeRoll(80, 80)).toBe(0);
  });
});

describe("validateShotDistances", () => {
  it("accepts a normal carry/total pair", () => {
    expect(validateShotDistances(80, 95)).toBeNull();
  });

  it("rejects total less than carry", () => {
    expect(validateShotDistances(90, 80)).not.toBeNull();
  });

  it("rejects negative carry", () => {
    expect(validateShotDistances(-5, 10)).not.toBeNull();
  });

  it("rejects negative total", () => {
    expect(validateShotDistances(5, -10)).not.toBeNull();
  });

  it("allows partial input (only carry, or only total)", () => {
    expect(validateShotDistances(80, null)).toBeNull();
    expect(validateShotDistances(null, 95)).toBeNull();
  });
});

describe("computeDistanceStats", () => {
  it("excludes failed shots from averages by default", () => {
    const shots = [
      makeShot({ carry: 80, total: 90, success: true }),
      makeShot({ carry: 40, total: 40, success: false }),
    ];
    const stats = computeDistanceStats(shots);
    expect(stats.averageCarry).toBe(80);
    expect(stats.count).toBe(2); // total recorded shots, including the failed one
    expect(stats.successRate).toBe(0.5);
  });

  it("includes failed shots when explicitly requested", () => {
    const shots = [
      makeShot({ carry: 80, total: 90, success: true }),
      makeShot({ carry: 40, total: 40, success: false }),
    ];
    const stats = computeDistanceStats(shots, { includeFailed: true });
    expect(stats.averageCarry).toBe(60);
  });

  it("returns nulls for an empty group", () => {
    const stats = computeDistanceStats([]);
    expect(stats.count).toBe(0);
    expect(stats.averageCarry).toBeNull();
    expect(stats.successRate).toBeNull();
    expect(stats.carryStdDev).toBeNull();
  });

  it("computes a sensible standard deviation", () => {
    const shots = [
      makeShot({ carry: 70, total: 75, success: true }),
      makeShot({ carry: 80, total: 85, success: true }),
      makeShot({ carry: 90, total: 95, success: true }),
    ];
    const stats = computeDistanceStats(shots);
    expect(stats.averageCarry).toBe(80);
    expect(stats.carryStdDev).toBeCloseTo(10, 5);
  });
});

describe("computeWedgeMatrix", () => {
  it("groups shots by club and swing length across multiple sessions", () => {
    const sessionA = makeSession({
      id: "s1",
      selection: { mode: "distance-wedge", clubId: "club-56", clubName: "56°", swingLength: "full" },
    });
    const sessionB = makeSession({
      id: "s2",
      selection: { mode: "distance-wedge", clubId: "club-56", clubName: "56°", swingLength: "full" },
    });
    const sessionC = makeSession({
      id: "s3",
      selection: { mode: "distance-wedge", clubId: "club-52", clubName: "52°", swingLength: "half" },
    });

    const shots = [
      makeShot({ id: "sh1", sessionId: "s1", carry: 60, total: 62, success: true }),
      makeShot({ id: "sh2", sessionId: "s2", carry: 64, total: 66, success: true }),
      makeShot({ id: "sh3", sessionId: "s3", carry: 30, total: 33, success: true }),
    ];

    const matrix = computeWedgeMatrix([sessionA, sessionB, sessionC], shots);
    expect(matrix).toHaveLength(2);

    const cell56 = matrix.find((c) => c.clubId === "club-56");
    expect(cell56?.stats.averageCarry).toBe(62); // (60+64)/2, combined across both sessions
    expect(cell56?.stats.count).toBe(2);
    expect(cell56?.sessionIds.sort()).toEqual(["s1", "s2"]);

    const cell52 = matrix.find((c) => c.clubId === "club-52");
    expect(cell52?.stats.averageCarry).toBe(30);
  });

  it("does not average per-session averages together (weights by shot, not by session)", () => {
    // Session 1 has one shot at 100, session 2 has three shots averaging 50.
    // A naive "average of session averages" would give (100+50)/2 = 75.
    // The correct shot-weighted average is (100+40+50+60)/4 = 62.5.
    const s1 = makeSession({
      id: "s1",
      selection: { mode: "distance-wedge", clubId: "c", clubName: "C", swingLength: "full" },
    });
    const s2 = makeSession({
      id: "s2",
      selection: { mode: "distance-wedge", clubId: "c", clubName: "C", swingLength: "full" },
    });
    const shots = [
      makeShot({ id: "a", sessionId: "s1", carry: 100, total: 100, success: true }),
      makeShot({ id: "b", sessionId: "s2", carry: 40, total: 40, success: true }),
      makeShot({ id: "c", sessionId: "s2", carry: 50, total: 50, success: true }),
      makeShot({ id: "d", sessionId: "s2", carry: 60, total: 60, success: true }),
    ];
    const matrix = computeWedgeMatrix([s1, s2], shots);
    expect(matrix[0].stats.averageCarry).toBeCloseTo(62.5, 5);
  });

  it("ignores sessions from other modes", () => {
    const fullSwingSession = makeSession({ id: "fs", selection: { mode: "full-swing", clubCategory: "iron" } });
    const shots = [makeShot({ sessionId: "fs", carry: 150, total: 160, success: true })];
    expect(computeWedgeMatrix([fullSwingSession], shots)).toHaveLength(0);
  });
});

describe("computeShortGameMatrix", () => {
  it("groups by club, technique and swing length", () => {
    const chip = makeSession({
      id: "s1",
      selection: {
        mode: "short-game",
        clubId: "club-pw",
        clubName: "PW",
        technique: "chip",
        swingLength: "hip",
      },
    });
    const pitch = makeSession({
      id: "s2",
      selection: {
        mode: "short-game",
        clubId: "club-pw",
        clubName: "PW",
        technique: "pitch",
        swingLength: "hip",
      },
    });
    const shots = [
      makeShot({ sessionId: "s1", carry: 15, total: 18, success: true }),
      makeShot({ sessionId: "s2", carry: 25, total: 30, success: true }),
    ];
    const matrix = computeShortGameMatrix([chip, pitch], shots);
    expect(matrix).toHaveLength(2);
    expect(matrix.find((c) => c.technique === "chip")?.stats.averageRoll).toBe(3);
    expect(matrix.find((c) => c.technique === "pitch")?.stats.averageRoll).toBe(5);
  });
});

describe("computeSessionStats", () => {
  it("only counts shots belonging to that session", () => {
    const session = makeSession({ id: "s1" });
    const shots = [
      makeShot({ sessionId: "s1", carry: 80, total: 85, success: true }),
      makeShot({ sessionId: "other", carry: 999, total: 999, success: true }),
    ];
    const stats = computeSessionStats(session, shots);
    expect(stats.count).toBe(1);
    expect(stats.averageCarry).toBe(80);
  });
});
