import fs from "node:fs/promises";
import path from "node:path";
import { Champion, Player, Team, MetaParams, MatchFixture, Standing, FinanceState, SaveSnapshot } from "./schemas";

export async function loadSeedSnapshot(): Promise<SaveSnapshot> {
  const champions = JSON.parse(await fs.readFile(path.resolve("data/seed.champions.json"), "utf8"));
  const players   = JSON.parse(await fs.readFile(path.resolve("data/seed.players.json"), "utf8"));
  const teams     = JSON.parse(await fs.readFile(path.resolve("data/seed.teams.json"), "utf8"));
  const meta      = JSON.parse(await fs.readFile(path.resolve("data/seed.meta.json"), "utf8"));
  const fixtures  = JSON.parse(await fs.readFile(path.resolve("data/seed.fixtures.json"), "utf8"));

  const championsV = zRecordParse(Champion, champions);
  const playersV   = zRecordParse(Player,   players);
  const teamsV     = zRecordParse(Team,     teams);
  const fixturesV  = (fixtures as any[]).map(f => MatchFixture.parse(f));
  const metaV      = MetaParams.parse(meta);

  const teamIds = Object.keys(teamsV);
  const standings: Record<string, Standing> = {};
  const finances:  Record<string, FinanceState> = {};
  for (const t of teamIds) {
    standings[t] = { teamId: t, wins: 0, losses: 0, gamesWon: 0, gamesLost: 0, form: [] };
    finances[t]  = { cash: 500_000, revenueYTD: 0, expensesYTD: 0 };
  }

  return SaveSnapshot.parse({
    version: 1,
    patch: "14.20",
    meta: metaV,
    champions: championsV,
    players: playersV,
    teams: teamsV,
    fixtures: fixturesV,
    standings,
    finances,
    week: 1
  });
}

function zRecordParse<T>(schema: any, rec: Record<string, unknown>): Record<string, T> {
  const out: Record<string, T> = {};
  for (const [k, v] of Object.entries(rec)) out[k] = schema.parse(v);
  return out;
}
