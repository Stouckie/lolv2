export type SlotId = "slot-1" | "slot-2" | "slot-3";

export interface SaveFile<T = unknown> {
  version: number;
  savedAt: number;
  updatedAt?: number;
  summary?: any;
  state?: any;
  file: T;
}

export interface SaveStore<T = unknown> {
  list(): Promise<Array<{ slot: SlotId; exists: boolean; updatedAt?: number }>>;
  read(slot: SlotId): Promise<SaveFile<T> | null>;
  write(slot: SlotId, file: SaveFile<T>): Promise<void>;
  remove(slot: SlotId): Promise<void>;
}
