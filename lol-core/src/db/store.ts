import type { SaveSnapshot } from "./schemas";

export interface IStore {
  load(): Promise<SaveSnapshot | null>;
  save(data: SaveSnapshot): Promise<void>;
  /** sauvegardes tournantes: save_001.json, save_002.json... */
  rotate?(keepLast?: number): Promise<void>;
}
