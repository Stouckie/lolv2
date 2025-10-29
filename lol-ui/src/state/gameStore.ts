import { create } from "zustand";

import { getSaveStore } from "@/persist/store";
import type { SaveFile, SaveListEntry, SlotId } from "@/persist/types";
import { normalizeGameDB } from "@/utils/gameNormalization";
import type { GameDB } from "@/utils/types";

export interface GameProfile {
  name: string;
  nationality: string;
  autosave?: boolean;
  ironman?: boolean;
}

export interface GameTeam {
  id: string;
  name: string;
  budgetEUR?: number;
  objective?: string;
  stars?: number;
  logo?: string;
}

export interface GameContext {
  profile?: GameProfile | null;
  league?: string | null;
  team?: GameTeam | null;
  homeUrl?: string | null;
}

type GameStatus = "idle" | "loading" | "ready" | "error";

interface GameStoreState {
  slot: SlotId;
  status: GameStatus;
  db: GameDB | null;
  lastSave: SaveFile<GameDB> | null;
  context: GameContext;
  error?: string;
}

interface PersistOptions extends Partial<SaveFile<GameDB>> {
  slot?: SlotId;
}

interface GameStoreActions {
  setSlot(slot: SlotId): void;
  setDb(db: GameDB | null): void;
  setContext(context: Partial<GameContext>): void;
  hydrate(save: SaveFile<GameDB> | null, slot?: SlotId): void;
  load(slot?: SlotId): Promise<SaveFile<GameDB> | null>;
  persist(options?: PersistOptions): Promise<SaveFile<GameDB> | null>;
  listSaves(): Promise<SaveListEntry[]>;
  remove(slot?: SlotId): Promise<void>;
  reset(): void;
}

type GameStore = GameStoreState & GameStoreActions;

const DEFAULT_SLOT: SlotId = "slot-1";

const initialState: GameStoreState = {
  slot: DEFAULT_SLOT,
  status: "idle",
  db: null,
  lastSave: null,
  context: {},
  error: undefined,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function extractContext(save: SaveFile<GameDB> | null, db: GameDB | null): GameContext {
  if (!save && !db) return {};

  const summary = save?.summary;
  const state = save?.state;

  const summaryRecord = isRecord(summary) ? summary : undefined;
  const stateRecord = isRecord(state) ? state : undefined;

  const profileRecord = stateRecord && isRecord(stateRecord.profile)
    ? (stateRecord.profile as Record<string, unknown>)
    : undefined;

  const teamRecord = stateRecord && isRecord(stateRecord.team)
    ? (stateRecord.team as Record<string, unknown>)
    : undefined;

  const profileName = typeof profileRecord?.name === "string"
    ? profileRecord.name
    : (summaryRecord && typeof summaryRecord.manager === "string" ? summaryRecord.manager : undefined);

  const profileNationality = typeof profileRecord?.nationality === "string"
    ? profileRecord.nationality
    : undefined;

  const profileAutosave = typeof profileRecord?.autosave === "boolean" ? profileRecord.autosave : undefined;
  const profileIronman = typeof profileRecord?.ironman === "boolean" ? profileRecord.ironman : undefined;

  const league = typeof stateRecord?.league === "string"
    ? stateRecord.league
    : (summaryRecord && typeof summaryRecord.league === "string" ? summaryRecord.league : undefined);

  const teamId = typeof teamRecord?.id === "string"
    ? teamRecord.id
    : (summaryRecord && typeof summaryRecord.teamId === "string" ? summaryRecord.teamId : undefined);

  const teamName = typeof teamRecord?.name === "string"
    ? teamRecord.name
    : (summaryRecord && typeof summaryRecord.team === "string" ? summaryRecord.team : undefined);

  const teamBudget = typeof teamRecord?.budgetEUR === "number" ? teamRecord.budgetEUR : undefined;
  const teamObjective = typeof teamRecord?.objective === "string" ? teamRecord.objective : undefined;
  const teamStars = typeof teamRecord?.stars === "number" ? teamRecord.stars : undefined;
  const teamLogo = typeof teamRecord?.logo === "string" ? teamRecord.logo : undefined;

  const meta = isRecord(db) && isRecord(db.meta) ? (db.meta as Record<string, unknown>) : undefined;
  const homeUrl = meta && typeof meta.homeUrl === "string" ? meta.homeUrl : undefined;

  const context: GameContext = {};
  if (profileName) {
    context.profile = {
      name: profileName,
      nationality: profileNationality ?? "KR",
      autosave: profileAutosave,
      ironman: profileIronman,
    } satisfies GameProfile;
  }
  if (league) context.league = league;
  if (teamId && teamName) {
    context.team = {
      id: teamId,
      name: teamName,
      budgetEUR: teamBudget,
      objective: teamObjective,
      stars: teamStars,
      logo: teamLogo,
    } satisfies GameTeam;
  }
  if (homeUrl) context.homeUrl = homeUrl;

  return context;
}

function buildSummary(db: GameDB, context: GameContext, fallback?: unknown): unknown {
  const summary: Record<string, unknown> = isRecord(fallback) ? { ...fallback } : {};
  const meta = isRecord(db.meta) ? (db.meta as Record<string, unknown>) : undefined;

  if (context.profile?.name) summary.manager = context.profile.name;
  if (context.league) summary.league = context.league;
  if (context.team?.name) summary.team = context.team.name;
  if (context.team?.id) summary.teamId = context.team.id;
  if (typeof meta?.season === "number") summary.season = meta.season;
  if (typeof meta?.currentWeek === "number") summary.currentWeek = meta.currentWeek;
  if (typeof meta?.currentDayIndex === "number") summary.currentDayIndex = meta.currentDayIndex;

  return summary;
}

function buildState(context: GameContext, fallback?: unknown): unknown {
  const base = isRecord(fallback) ? { ...fallback } : {};
  if (context.profile) base.profile = context.profile;
  if (context.league) base.league = context.league;
  if (context.team) base.team = context.team;
  if (context.homeUrl) base.homeUrl = context.homeUrl;
  return Object.keys(base).length ? base : fallback;
}

export const useGameStore = create<GameStore>((set, get) => ({
  ...initialState,
  setSlot(slot) {
    set({ slot });
  },
  setDb(db) {
    set({ db, status: db ? "ready" : "idle" });
  },
  setContext(context) {
    set(state => ({ context: { ...state.context, ...context } }));
  },
  hydrate(save, slot) {
    const targetSlot = slot ?? get().slot;
    if (!save) {
      set({
        slot: targetSlot,
        db: null,
        lastSave: null,
        status: "idle",
        error: undefined,
        context: {},
      });
      return;
    }

    const normalized = normalizeGameDB(save.file);
    const canonical: SaveFile<GameDB> = { ...save, file: normalized };
    const context = extractContext(canonical, normalized);

    set({
      slot: targetSlot,
      db: normalized,
      lastSave: canonical,
      context,
      status: "ready",
      error: undefined,
    });
  },
  async load(slot) {
    const targetSlot = slot ?? get().slot;
    set({ status: "loading", error: undefined, slot: targetSlot });
    try {
      const persistence = getSaveStore<GameDB>();
      const save = await persistence.read(targetSlot);
      get().hydrate(save, targetSlot);
      return save;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      set({ status: "error", error: message });
      return null;
    }
  },
  async persist(options) {
    const { db, context, lastSave } = get();
    if (!db) return null;

    const persistence = getSaveStore<GameDB>();
    const slot = options?.slot ?? get().slot;
    const now = Date.now();

    const payload: SaveFile<GameDB> = {
      version: options?.version ?? lastSave?.version ?? 1,
      savedAt: options?.savedAt ?? lastSave?.savedAt ?? now,
      updatedAt: options?.updatedAt ?? now,
      summary: options?.summary ?? buildSummary(db, context, lastSave?.summary),
      state: options?.state ?? buildState(context, lastSave?.state),
      file: options?.file ?? db,
    };

    await persistence.write(slot, payload);
    set({ slot, lastSave: payload, status: "ready", error: undefined });
    return payload;
  },
  async listSaves() {
    const persistence = getSaveStore<GameDB>();
    return persistence.list();
  },
  async remove(slot) {
    const targetSlot = slot ?? get().slot;
    const persistence = getSaveStore<GameDB>();
    await persistence.remove(targetSlot);
    if (targetSlot === get().slot) {
      set({ lastSave: null, db: null, status: "idle" });
    }
  },
  reset() {
    set({ ...initialState });
  },
}));
