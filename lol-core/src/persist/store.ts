// lol-core/src/persist/store.ts
export type SlotId = 'slot-1' | 'slot-2' | 'slot-3';

export interface SaveFile<TState = unknown> {
  version: 1;
  savedAt: string; // ISO
  summary: {
    manager: string;
    league: string;
    team: string;
    week: number;
  };
  state: TState; // ton état sérialisé (UI ou core)
}

export interface SaveStore<TState = unknown> {
  list(): Promise<Array<{ slot: SlotId; exists: boolean; savedAt?: string }>>;
  read(slot: SlotId): Promise<SaveFile<TState> | null>;
  write(slot: SlotId, file: SaveFile<TState>): Promise<void>;
  remove(slot: SlotId): Promise<void>;
}
