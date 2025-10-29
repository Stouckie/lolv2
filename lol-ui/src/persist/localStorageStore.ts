import type { SaveFile, SaveListEntry, SaveStore, SlotId } from "./types";

const KEY = "lolm2:saves:v1";
const SLOTS: SlotId[] = ["slot-1", "slot-2", "slot-3"];

type Dict = Partial<Record<SlotId, string>>;

type ParseResult<TState> = { file: SaveFile<TState>; raw: string } | null;

function safeParse<TState>(raw: string | null | undefined): ParseResult<TState> {
  if (!raw) return null;
  try {
    return { file: JSON.parse(raw) as SaveFile<TState>, raw };
  } catch {
    return null;
  }
}

function readAll(): Dict {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Dict;
  } catch {
    return {};
  }
}

function writeAll(dict: Dict) {
  localStorage.setItem(KEY, JSON.stringify(dict));
}

export function createLocalStorageStore<TState>(): SaveStore<TState> {
  return {
    async list(): Promise<SaveListEntry[]> {
      const all = readAll();
      return SLOTS.map(slot => {
        const parsed = safeParse<TState>(all[slot] ?? null);
        if (!parsed) return { slot, exists: false } satisfies SaveListEntry;
        const { file } = parsed;
        return {
          slot,
          exists: true,
          updatedAt: file.updatedAt ?? file.savedAt,
          summary: file.summary,
        } satisfies SaveListEntry;
      });
    },
    async read(slot) {
      const parsed = safeParse<TState>(readAll()[slot] ?? null);
      return parsed?.file ?? null;
    },
    async write(slot, file) {
      const all = readAll();
      all[slot] = JSON.stringify(file);
      writeAll(all);
    },
    async remove(slot) {
      const all = readAll();
      if (slot in all) {
        delete all[slot];
        writeAll(all);
      }
    },
  };
}
