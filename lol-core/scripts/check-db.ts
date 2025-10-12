import { DB } from "../src/db/service";

(async () => {
  const db = new DB();
  const save = await db.init();
  console.log("DB OK — version:", save.version, "teams:", Object.keys(save.teams).length, "players:", Object.keys(save.players).length);
})();
