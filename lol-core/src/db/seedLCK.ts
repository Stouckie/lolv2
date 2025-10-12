// NOTE: placé à la racine de src/ → imports en "./seeds" et "./lib"
import type { GameDB, SaveFile, Team, Player, Meta, Week, StandingsRow } from "./models";
import { LCK_TEAMS_SEED } from "./seeds/lckTeams";
import { generateAllPlayers } from "./seeds/playersGen";
import { generateLCKSplit } from "./lib/lckSchedule";

export function buildLckDB(seed: number): GameDB {
  // 1) Équipes
  const teams: Team[] = LCK_TEAMS_SEED.map(t => ({ ...t }));

  // 2) Joueurs
  const players: Player[] = generateAllPlayers(
    teams.map(t => ({ id: t.id, rep: t.rep })),
    seed
  ) as unknown as Player[];

  // 3) Masse salariale recalculée
  const perTeamPayroll: Record<string, number> = {};
  for (const t of teams) perTeamPayroll[t.id] = 0;
  for (const p of players) perTeamPayroll[p.teamId] += p.wagePerDay;
  for (const t of teams) t.payrollPerDay = Math.round(perTeamPayroll[t.id] ?? 0);

  // 4) Calendrier
  const schedule: Week[] = generateLCKSplit(teams.map(t => ({ id: t.id, name: t.name })));

  // 5) Standings init (0-0)
  const teamIds = new Set<string>();
  schedule.forEach(w => w.days.forEach(s => { teamIds.add(s.home); teamIds.add(s.away); }));
  const standings: StandingsRow[] = [...teamIds].map(id => ({ teamId: id, wins: 0, losses: 0 }));

  // 6) Meta
  const meta: Meta = {
    version: 1,
    league: "LCK",
    season: "Spring 2025",
    timezone: "Asia/Seoul",
    currentWeek: 1,
    rngSeed: seed,
  };

  return { meta, teams, players, staff: [], schedule, standings, results: [] };
}

export function createNewGameSave(args: {
  managerName: string;
  league: "LCK";
  teamName: string;
}): SaveFile<GameDB> {
  const seed = Date.now();
  const db = buildLckDB(seed);
  return {
    version: 1,
    savedAt: new Date().toISOString(),
    summary: { manager: args.managerName, league: args.league, team: args.teamName, week: db.meta.currentWeek },
    state: db,
  };
}
