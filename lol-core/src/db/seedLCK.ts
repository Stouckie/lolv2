import type { GameDB, Team, Player, Meta, StandingsRow } from "../types";
import { LCK_TEAMS_SEED } from "../seeds/lckTeams";
import { generateAllPlayers } from "../seeds/playersGen";
import { generateLCKSplit } from "../lib/lckSchedule";

function buildLckDB(seed: number): GameDB {
  const generatedAt = new Date().toISOString();

  const teams: Team[] = LCK_TEAMS_SEED.map(team => ({ ...team }));

  const players: Player[] = generateAllPlayers(
    teams.map(team => ({ id: team.id, rep: team.rep })),
    seed
  ) as unknown as Player[];

  const payrollPerTeam: Record<string, number> = {};
  for (const team of teams) payrollPerTeam[team.id] = 0;
  for (const player of players) payrollPerTeam[player.teamId] = (payrollPerTeam[player.teamId] ?? 0) + player.wagePerDay;
  for (const team of teams) team.payrollPerDay = Math.round(payrollPerTeam[team.id] ?? 0);

  const schedule = generateLCKSplit(teams.map(team => team.id));

  const teamIds = new Set<string>();
  schedule.forEach(week => {
    const series = week.days ?? week.series ?? [];
    series.forEach(match => {
      teamIds.add(match.home);
      teamIds.add(match.away);
    });
  });

  const standings: StandingsRow[] = Array.from(teamIds).map(teamId => ({
    teamId,
    wins: 0,
    losses: 0,
    gamesWon: 0,
    gamesLost: 0,
  }));

  const meta: Meta = {
    version: 1,
    league: "LCK",
    season: 1,
    timezone: "Asia/Seoul",
    currentWeek: 1,
    currentDayIndex: 0,
    rngSeed: seed,
    updatedAt: generatedAt,
  };

  return {
    meta,
    teams,
    players,
    staff: [],
    schedule,
    standings,
    results: [],
  };
}

export function createNewGameSave(args: {
  managerName: string;
  league: "LCK";
  teamName: string;
}): GameDB {
  const seed = Date.now();
  const db = buildLckDB(seed);

  db.meta.currentWeek = 1;
  db.meta.currentDayIndex = 0;

  // NEW — date de début de saison (KST)
  db.meta.calendar = {
    ...(db.meta.calendar ?? {}),
    startISO: "2025-01-15T00:00:00+09:00",
    timezone: "Asia/Seoul",
  };

  db.meta.updatedAt = new Date().toISOString();
  return db;
}


