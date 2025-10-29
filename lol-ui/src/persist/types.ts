export type SlotId = "slot-1" | "slot-2" | "slot-3";

export interface SaveFile<T = unknown> {
  version: number;
  savedAt: number;
  updatedAt?: number;
  summary?: unknown;
  state?: unknown;
  file: T;
}

export interface SaveListEntry {
  slot: SlotId;
  exists: boolean;
  updatedAt?: number;
  summary?: unknown;
}

export interface SaveStore<T = unknown> {
  list(): Promise<SaveListEntry[]>;
  read(slot: SlotId): Promise<SaveFile<T> | null>;
  write(slot: SlotId, file: SaveFile<T>): Promise<void>;
  remove(slot: SlotId): Promise<void>;
}
