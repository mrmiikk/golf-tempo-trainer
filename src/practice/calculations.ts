import type { PracticeSession, Shot, ShortGameSwingLength, ShortGameTechnique, WedgeSwingLength } from "./types";

// Validates carry/total BEFORE a shot is saved -- this is what actually
// enforces "no negative roll", not a silent clamp after the fact.
export function validateShotDistances(carry: number | null, total: number | null): string | null {
  if (carry !== null && carry < 0) return "Carry cannot be negative.";
  if (total !== null && total < 0) return "Total cannot be negative.";
  if (carry !== null && total !== null && total < carry) {
    return "Total cannot be less than carry (that would make roll negative).";
  }
  return null;
}

// roll = total - carry. Never negative: validateShotDistances is the real
// gate at save time, this clamps defensively so a derived value can never
// go negative even if it's ever called on unvalidated input.
export function computeRoll(carry: number | null, total: number | null): number | null {
  if (carry === null || total === null) return null;
  return Math.max(0, total - carry);
}

export type DistanceStats = {
  /** All shots in the group, successful or not. */
  count: number;
  successRate: number | null;
  averageCarry: number | null;
  averageTotal: number | null;
  averageRoll: number | null;
  carryStdDev: number | null;
};

function average(values: number[]): number | null {
  return values.length ? values.reduce((sum, v) => sum + v, 0) / values.length : null;
}

function sampleStdDev(values: number[]): number | null {
  if (values.length < 2) return null;
  const mean = average(values)!;
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

// By default only successful shots feed the averages (failed attempts stay
// in history but don't skew "what distance should I expect"); pass
// includeFailed to compute stats across everything instead.
export function computeDistanceStats(shots: Shot[], options?: { includeFailed?: boolean }): DistanceStats {
  const included = options?.includeFailed ? shots : shots.filter((shot) => shot.success);
  const carries = included.map((s) => s.carry).filter((v): v is number => v !== null);
  const totals = included.map((s) => s.total).filter((v): v is number => v !== null);
  const rolls = included.map((s) => computeRoll(s.carry, s.total)).filter((v): v is number => v !== null);

  return {
    count: shots.length,
    successRate: shots.length ? shots.filter((s) => s.success).length / shots.length : null,
    averageCarry: average(carries),
    averageTotal: average(totals),
    averageRoll: average(rolls),
    carryStdDev: sampleStdDev(carries),
  };
}

export type WedgeMatrixCell = {
  clubId: string;
  clubName: string;
  swingLength: WedgeSwingLength;
  stats: DistanceStats;
  typicalTempoName: string | null;
  lastSessionAt: number | null;
  sessionIds: string[];
};

// Groups shots by (club, swing length) across ALL matching sessions and
// computes stats once per group -- never averages per-session averages
// together, which would silently misweight sessions with different shot
// counts.
export function computeWedgeMatrix(sessions: PracticeSession[], shots: Shot[]): WedgeMatrixCell[] {
  const shotsBySession = groupShotsBySession(shots);
  const groups = new Map<
    string,
    { clubId: string; clubName: string; swingLength: WedgeSwingLength; shots: Shot[]; sessions: PracticeSession[] }
  >();

  for (const session of sessions) {
    if (session.selection.mode !== "distance-wedge") continue;
    const { clubId, clubName, swingLength } = session.selection;
    const key = `${clubId}__${swingLength}`;
    const group = groups.get(key) ?? { clubId, clubName, swingLength, shots: [], sessions: [] };
    group.shots.push(...(shotsBySession.get(session.id) ?? []));
    group.sessions.push(session);
    groups.set(key, group);
  }

  return [...groups.values()].map((group) => ({
    clubId: group.clubId,
    clubName: group.clubName,
    swingLength: group.swingLength,
    stats: computeDistanceStats(group.shots),
    typicalTempoName: mostCommonTempoName(group.sessions),
    lastSessionAt: latestSessionTime(group.sessions),
    sessionIds: group.sessions.map((s) => s.id),
  }));
}

export type ShortGameMatrixCell = {
  clubId: string;
  clubName: string;
  technique: ShortGameTechnique;
  swingLength: ShortGameSwingLength;
  stats: DistanceStats;
  lastSessionAt: number | null;
  sessionIds: string[];
};

export function computeShortGameMatrix(sessions: PracticeSession[], shots: Shot[]): ShortGameMatrixCell[] {
  const shotsBySession = groupShotsBySession(shots);
  const groups = new Map<
    string,
    {
      clubId: string;
      clubName: string;
      technique: ShortGameTechnique;
      swingLength: ShortGameSwingLength;
      shots: Shot[];
      sessions: PracticeSession[];
    }
  >();

  for (const session of sessions) {
    if (session.selection.mode !== "short-game") continue;
    const { clubId, clubName, technique, swingLength } = session.selection;
    const key = `${clubId}__${technique}__${swingLength}`;
    const group = groups.get(key) ?? { clubId, clubName, technique, swingLength, shots: [], sessions: [] };
    group.shots.push(...(shotsBySession.get(session.id) ?? []));
    group.sessions.push(session);
    groups.set(key, group);
  }

  return [...groups.values()].map((group) => ({
    clubId: group.clubId,
    clubName: group.clubName,
    technique: group.technique,
    swingLength: group.swingLength,
    stats: computeDistanceStats(group.shots),
    lastSessionAt: latestSessionTime(group.sessions),
    sessionIds: group.sessions.map((s) => s.id),
  }));
}

export function computeSessionStats(session: PracticeSession, shots: Shot[]): DistanceStats {
  return computeDistanceStats(shots.filter((shot) => shot.sessionId === session.id));
}

function groupShotsBySession(shots: Shot[]): Map<string, Shot[]> {
  const map = new Map<string, Shot[]>();
  for (const shot of shots) {
    const list = map.get(shot.sessionId) ?? [];
    list.push(shot);
    map.set(shot.sessionId, list);
  }
  return map;
}

function latestSessionTime(sessions: PracticeSession[]): number | null {
  return sessions.length ? Math.max(...sessions.map((s) => s.createdAt)) : null;
}

function mostCommonTempoName(sessions: PracticeSession[]): string | null {
  if (!sessions.length) return null;
  const counts = new Map<string, number>();
  for (const session of sessions) {
    counts.set(session.targetTempoName, (counts.get(session.targetTempoName) ?? 0) + 1);
  }
  let best: string | null = null;
  let bestCount = 0;
  for (const [name, count] of counts) {
    if (count > bestCount) {
      best = name;
      bestCount = count;
    }
  }
  return best;
}
