import { JsonStore } from "./jsonStore";
import { loadSeedSnapshot } from "./loadSeed";
import { migrateSave } from "./migrations";
import type { SaveSnapshot } from "./schemas";

export class DB {
  constructor(private store = new JsonStore()) {}

  async init(): Promise<SaveSnapshot> {
    const existing = await this.store.load();
    if (existing) return migrateSave(existing);
    const seed = await loadSeedSnapshot();
    await this.store.save(seed);
    return seed;
  }

  async save(s: SaveSnapshot) { await this.store.save(s); }
  async snapshot(s: SaveSnapshot) { await this.store.rotate?.(10); await this.store.save(s); }
}
