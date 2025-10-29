import type { GameDB } from "@/utils/types";
import { readSaveFile, writeSave, type GameSaveFile } from "@/adapters/persist/localStorage";

export function readGameSave(): GameSaveFile | null {
  return readSaveFile();
}

export function readGameDB(): GameDB | null {
  return readSaveFile()?.file ?? null;
}

export function saveGameFile(file: GameSaveFile) {
  writeSave(file);
}

export function updateGameSave(mutator: (draft: GameSaveFile) => void): GameSaveFile | null {
  const current = readSaveFile();
  if (!current) return null;
  const draft: GameSaveFile = {
    ...current,
    summary: current.summary ? { ...current.summary } : current.summary,
    state: current.state ? { ...current.state } : current.state,
    file: { ...current.file },
  };
  mutator(draft);
  writeSave(draft);
  return draft;
}

export function extractDB(raw: GameSaveFile | null): { db: GameDB | null; root: GameSaveFile | null; where: "file" } {
  if (!raw) return { db: null, root: null, where: "file" };
  return { db: raw.file, root: raw, where: "file" };
}

export function readDB() {
  return extractDB(readSaveFile());
}

export function persistDB(root: GameSaveFile | null, _where: string, db: GameDB) {
  const timestamp = Date.now();
  const base: GameSaveFile = root ?? {
    version: 1,
    savedAt: timestamp,
    updatedAt: timestamp,
    summary: undefined,
    state: undefined,
    file: db,
  };

  const next: GameSaveFile = {
    ...base,
    file: db,
    updatedAt: timestamp,
  };

  writeSave(next);
}
