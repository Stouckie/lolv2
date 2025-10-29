import type { SaveFile, SaveListEntry, SaveStore, SlotId } from "./types";

interface TauriFsApi {
  readTextFile(path: string): Promise<string>;
  writeTextFile(path: string, contents: string): Promise<void>;
  exists(path: string): Promise<boolean>;
  createDir(path: string, options?: { recursive?: boolean }): Promise<void>;
  removeFile(path: string): Promise<void>;
}

interface TauriPathApi {
  appDataDir(): Promise<string>;
  join(...paths: string[]): Promise<string>;
}

interface TauriApi {
  fs: TauriFsApi;
  path: TauriPathApi;
}

const SLOTS: SlotId[] = ["slot-1", "slot-2", "slot-3"];
const SAVE_DIR = ["LoLManager", "saves"];

function getTauri(): TauriApi | null {
  if (typeof window === "undefined") return null;
  const api = (window as unknown as { __TAURI__?: TauriApi }).__TAURI__;
  return api ?? null;
}

async function resolveBaseDir(pathApi: TauriPathApi): Promise<string> {
  const appData = await pathApi.appDataDir();
  return pathApi.join(appData, ...SAVE_DIR);
}

async function ensureBaseDir(tauri: TauriApi): Promise<string> {
  const base = await resolveBaseDir(tauri.path);
  await tauri.fs.createDir(base, { recursive: true });
  return base;
}

async function resolveSlotPath(tauri: TauriApi, slot: SlotId): Promise<string> {
  const base = await resolveBaseDir(tauri.path);
  return tauri.path.join(base, `${slot}.json`);
}

async function readSlot<TState>(tauri: TauriApi, slot: SlotId): Promise<SaveFile<TState> | null> {
  const filePath = await resolveSlotPath(tauri, slot);
  const exists = await tauri.fs.exists(filePath);
  if (!exists) return null;
  try {
    const raw = await tauri.fs.readTextFile(filePath);
    return JSON.parse(raw) as SaveFile<TState>;
  } catch {
    return null;
  }
}

export function createTauriStore<TState>(): SaveStore<TState> {
  const tauri = getTauri();
  if (!tauri) {
    throw new Error("Tauri API unavailable");
  }

  return {
    async list(): Promise<SaveListEntry[]> {
      await ensureBaseDir(tauri);
      const entries = await Promise.all(
        SLOTS.map(async slot => {
          const file = await readSlot<TState>(tauri, slot);
          if (!file) {
            return { slot, exists: false } satisfies SaveListEntry;
          }
          return {
            slot,
            exists: true,
            updatedAt: file.updatedAt ?? file.savedAt,
            summary: file.summary,
          } satisfies SaveListEntry;
        }),
      );
      return entries;
    },
    async read(slot) {
      return readSlot<TState>(tauri, slot);
    },
    async write(slot, file) {
      await ensureBaseDir(tauri);
      const target = await resolveSlotPath(tauri, slot);
      await tauri.fs.writeTextFile(target, JSON.stringify(file));
    },
    async remove(slot) {
      const target = await resolveSlotPath(tauri, slot);
      const exists = await tauri.fs.exists(target);
      if (!exists) return;
      await tauri.fs.removeFile(target);
    },
  };
}
