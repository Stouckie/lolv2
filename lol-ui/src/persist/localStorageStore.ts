import type { SaveStore, SaveFile, SlotId } from "./types";

const KEY = "lolm2:saves:v1";
type Dict = Record<string, string>;

function readAll(): Dict {
  try { return JSON.parse(localStorage.getItem(KEY) || "{}") as Dict; }
  catch { return {}; }
}
function writeAll(d: Dict) {
  localStorage.setItem(KEY, JSON.stringify(d));
}

export function createLocalStorageStore<TState>(): SaveStore<TState> {
  return {
    async list() {
      const all = readAll();
      const slots: SlotId[] = ["slot-1","slot-2","slot-3"];
      return slots.map(slot => {
        const raw = all[slot];
        if (!raw) return { slot, exists: false };
        try {
          const f = JSON.parse(raw) as SaveFile<TState>;
          return { slot, exists: true, savedAt: f.savedAt };
        } catch {
          return { slot, exists: true };
        }
      });
    },
    async read(slot) {
      const raw = readAll()[slot];
      if (!raw) return null;
      try { return JSON.parse(raw) as SaveFile<TState>; } catch { return null; }
    },
    async write(slot, file) {
      const all = readAll();
      all[slot] = JSON.stringify(file);
      writeAll(all);
    },
    async remove(slot) {
      const all = readAll();
      delete all[slot];
      writeAll(all);
    }
  };
}
