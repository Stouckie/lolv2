import type { GameDB } from "@/utils/types";
import type { SaveFile } from "@/persist/types";
import { normalizeGameDB } from "@/utils/gameNormalization";

export type GameSaveFile = SaveFile<GameDB>;

const SLOT_KEY = "lolm2:slot-1";
const STATE_KEY = "lolm2:save:game";
const CURRENT_VERSION = 1;

function readJson(key: string): unknown {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
}

function isObject(value: unknown): value is Record<string, any> {
  return !!value && typeof value === "object";
}

function toTimestamp(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function findNestedCandidate(raw: any): any {
  for (const key of ["save", "data", "payload", "content", "root"]) {
    const nested = raw?.[key];
    if (isObject(nested)) {
      if (nested.file || nested.state || Array.isArray(nested.schedule)) return nested;
    }
  }
  return null;
}

function collectState(raw: any): any {
  if (!isObject(raw)) return undefined;
  const fragments: Record<string, unknown> = {};
  if (isObject(raw.state)) Object.assign(fragments, raw.state);
  if (isObject(raw.context)) Object.assign(fragments, raw.context);
  if (Object.keys(fragments).length) return fragments;
  const nested = findNestedCandidate(raw);
  if (nested && nested !== raw) return collectState(nested);
  return undefined;
}

function extractGamePayload(raw: unknown): {
  fileCandidate: unknown;
  summarySource?: any;
  state?: any;
  savedAt?: number;
  updatedAt?: number;
  version?: number;
} {
  if (!isObject(raw)) return { fileCandidate: null };

  const state = collectState(raw);
  const savedAt = toTimestamp(raw.savedAt ?? raw.meta?.createdAt ?? raw.summary?.createdAt);
  const updatedAt = toTimestamp(raw.updatedAt ?? raw.meta?.updatedAt);
  const version = typeof raw.version === "number" ? raw.version : undefined;

  if (isObject(raw.file)) {
    return { fileCandidate: raw.file, summarySource: raw.summary ?? raw.meta ?? raw, state, savedAt, updatedAt, version };
  }

  if (isObject(raw.state?.file)) {
    return {
      fileCandidate: raw.state.file,
      summarySource: raw.state.meta ?? raw.meta ?? raw.summary ?? raw,
      state: raw.state.state ?? state,
      savedAt,
      updatedAt: updatedAt ?? toTimestamp(raw.state.updatedAt),
      version,
    };
  }

  if (isObject(raw.state) && (Array.isArray(raw.state.schedule) || raw.state.meta || raw.state.file)) {
    return {
      fileCandidate: raw.state.file ?? raw.state,
      summarySource: raw.state.meta ?? raw.meta ?? raw.summary ?? raw,
      state,
      savedAt,
      updatedAt,
      version,
    };
  }

  if (Array.isArray(raw.schedule) || raw.meta || raw.calendar || raw.season) {
    return {
      fileCandidate: raw,
      summarySource: raw.meta ?? raw.summary ?? raw,
      state,
      savedAt,
      updatedAt,
      version,
    };
  }

  const nested = findNestedCandidate(raw);
  if (nested) return extractGamePayload(nested);

  return { fileCandidate: null, summarySource: raw, state, savedAt, updatedAt, version };
}

function buildSummary(db: GameDB, source?: any, state?: any) {
  const stateObj = state ?? {};
  const manager = source?.manager ?? stateObj?.profile?.name ?? "Manager";
  const league = source?.league ?? stateObj?.league ?? db.meta.league ?? "LCK";
  const inferredTeamId = source?.teamId ?? stateObj?.team?.id;
  const teamId = typeof inferredTeamId === "string" ? inferredTeamId : db.teams?.[0]?.id;
  const teamName = source?.team
    ?? stateObj?.team?.name
    ?? (teamId ? db.teams?.find(t => t.id === teamId)?.name : undefined)
    ?? db.teams?.[0]?.name
    ?? "Team";

  return {
    manager,
    league,
    team: teamName,
    teamId,
    season: db.meta.season ?? 1,
    currentWeek: db.meta.currentWeek ?? 1,
    currentDayIndex: db.meta.currentDayIndex ?? 0,
  };
}

function canonicalize(raw: unknown): GameSaveFile | null {
  const payload = extractGamePayload(raw);
  if (!payload.fileCandidate) return null;
  const db = normalizeGameDB(payload.fileCandidate);
  const summary = buildSummary(db, payload.summarySource, payload.state);
  const savedAt = payload.savedAt ?? Date.now();
  const updatedAt = payload.updatedAt ?? savedAt;

  return {
    version: payload.version ?? CURRENT_VERSION,
    savedAt,
    updatedAt,
    summary,
    state: payload.state,
    file: db,
  };
}

export function readSaveFile(): GameSaveFile | null {
  const raw = readJson(SLOT_KEY);
  const canonical = canonicalize(raw);
  if (canonical) {
    writeSave(canonical);
  }
  return canonical;
}

export function writeSave(file: GameSaveFile) {
  const normalized = normalizeGameDB(file.file);
  const summary = buildSummary(normalized, file.summary, file.state);
  const stamped: GameSaveFile = {
    version: file.version ?? CURRENT_VERSION,
    savedAt: file.savedAt ?? Date.now(),
    updatedAt: file.updatedAt ?? Date.now(),
    summary,
    state: file.state,
    file: normalized,
  };
  writeJson(SLOT_KEY, stamped);
  writeJson(STATE_KEY, stamped.file);
}

export function readGameState(): GameDB | null {
  const raw = readJson(STATE_KEY);
  if (raw) return normalizeGameDB(raw);
  const fromFile = readSaveFile();
  return fromFile ? fromFile.file : null;
}

export function upsertSave(mutator: (file: GameSaveFile) => GameSaveFile | void, defaults?: { summary?: any; state?: any }): GameSaveFile {
  const existing = readSaveFile();
  const base: GameSaveFile = existing ?? {
    version: CURRENT_VERSION,
    savedAt: Date.now(),
    updatedAt: Date.now(),
    summary: defaults?.summary,
    state: defaults?.state,
    file: normalizeGameDB({}),
  };

  const draft: GameSaveFile = { ...base, summary: base.summary ? { ...base.summary } : base.summary, state: base.state ? { ...base.state } : base.state };
  const result = (mutator(draft) ?? draft) as GameSaveFile;
  if (result.savedAt == null) result.savedAt = base.savedAt ?? Date.now();
  writeSave(result);
  return result;
}
