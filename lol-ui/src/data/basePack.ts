// src/data/basePack.ts
import { LCK_TEAMS_SEED, type TeamSeed } from "./seeds/lckTeams";
import { generateAllPlayers, type PlayerSeed } from "./seeds/playersGen";
import { generateLCKSplit, type Week } from "../lib/lckSchedule";


export type BasePack = {
  teams: TeamSeed[];
  players: PlayerSeed[];
  staff: any[];       // placeholder; on remplira plus tard
  schedule: Week[];   // pour la page Calendrier actuelle
};

export function buildBasePack(seed: number = Date.now()): BasePack {
  const teams = LCK_TEAMS_SEED.map(t => ({ ...t })); // clone
  const players = generateAllPlayers(
    teams.map(t => ({ id: t.id, rep: t.rep })),
    seed
  );

  // Recalcule payroll depuis joueurs
  const perTeamPayroll: Record<string, number> = {};
  for (const t of teams) perTeamPayroll[t.id] = 0;
  for (const p of players) perTeamPayroll[p.teamId] += p.wagePerDay;
  for (const t of teams) t.payrollPerDay = Math.round(perTeamPayroll[t.id] ?? 0);

  // Calendrier LCK (double round robin)
  const schedule = generateLCKSplit(teams.map(t => ({ id: t.id, name: t.name })));

  return { teams, players, staff: [], schedule };
}
