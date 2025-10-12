import type { SaveFile, GameDB } from "@core/models";

const SLOT_KEY = "lolm2:slot-1";
const STATE_KEY = "lolm2:save:auto";

export function writeSave(file: SaveFile<GameDB>) {
  localStorage.setItem(SLOT_KEY, JSON.stringify(file));
  localStorage.setItem(STATE_KEY, JSON.stringify(file.state));
}

export function readSaveFile(): SaveFile<GameDB> | null {
  try { return JSON.parse(localStorage.getItem(SLOT_KEY) || "null"); }
  catch { return null; }
}

export function readState(): GameDB | null {
  try { return JSON.parse(localStorage.getItem(STATE_KEY) || "null"); }
  catch { return null; }
}
