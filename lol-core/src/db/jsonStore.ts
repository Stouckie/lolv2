import fs from "node:fs/promises";
import path from "node:path";
import { SaveSnapshot } from "./schemas";
import type { IStore } from "./store";

export class JsonStore implements IStore {
  constructor(private dir = path.resolve("data"), private filename = "save.json") {}

  private filePath() { return path.join(this.dir, this.filename); }

  async load() {
    try {
      const buf = await fs.readFile(this.filePath(), "utf8");
      const json = JSON.parse(buf);
      return SaveSnapshot.parse(json);
    } catch (e:any) {
      if (e.code === "ENOENT") return null;
      throw e;
    }
  }

  async save(data: SaveSnapshot) {
    await fs.mkdir(this.dir, { recursive: true });
    const tmp = this.filePath() + ".tmp";
    await fs.writeFile(tmp, JSON.stringify(data, null, 2), "utf8");
    await fs.rename(tmp, this.filePath());
  }

  async rotate(keepLast = 5) {
    await fs.mkdir(this.dir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const from = this.filePath();
    const to = path.join(this.dir, `save_${stamp}.json`);
    try { await fs.copyFile(from, to); } catch {}
    // keep only last N
    const files = (await fs.readdir(this.dir)).filter(f => f.startsWith("save_") && f.endsWith(".json")).sort();
    while (files.length > keepLast) {
      const oldest = files.shift()!;
      await fs.unlink(path.join(this.dir, oldest));
    }
  }
}
