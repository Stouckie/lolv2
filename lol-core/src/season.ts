import type { League, TeamComp, MatchResult } from "./sim/types";
import { simulateMatch } from "./match";
import { weeklyFinanceUpdate } from "./finances";

export function tickWeek(lg: League, seed=0){
  const week = lg.week;
  const matches = lg.schedule.filter(m => m.week === week);
  const results: MatchResult[] = [];

  for (const m of matches) {
    // Compose compo actuelle (simple : prend le meilleur champion de rÃ´le en fonction du joueur)
    const blueComp = autoComp(lg, m.blueTeamId);
    const redComp  = autoComp(lg, m.redTeamId);

    const res = simulateMatch(blueComp, redComp, lg.champions, { meta: lg.meta, rngSeed: `${seed}-${week}-${m.blueTeamId}-${m.redTeamId}` });
    results.push(res);

    const winTeam = res.winner === "BLUE" ? m.blueTeamId : m.redTeamId;
    const loseTeam= res.winner === "BLUE" ? m.redTeamId  : m.blueTeamId;
    lg.standings[winTeam].wins += 1;
    lg.standings[loseTeam].losses += 1;
    lg.standings[winTeam].form.push(1); lg.standings[loseTeam].form.push(0);
  }

  // finances hebdo basiques
  for (const [teamId, team] of Object.entries(lg.teams)) {
    const line = {
      salaryPlayers: sumSalaries(team.roster, lg),
      salaryStaff:   Object.values(team.staff).reduce((a,s)=>a+(s?.salary||0),0),
      sponsor: 40000, scrimCost: 5000, facilityOpex: 3000,
    };
    weeklyFinanceUpdate(lg.finances[teamId], line);
  }

  lg.week += 1;
  return results;
}

function sumSalaries(roster: League["teams"][string]["roster"], lg: League){
  return (["top","jungle","mid","adc","sup"] as const).reduce((acc,role)=>{
    const pid = roster[role]; if (!pid) return acc;
    return acc + (lg.players[pid]?.salary || 0);
  },0);
}

function autoComp(lg:League, teamId:string): TeamComp {
  const t = lg.teams[teamId];
  const pick = (role: "top"|"jungle"|"mid"|"adc"|"sup")=>{
    const pid = t.roster[role]; if (!pid) throw new Error(`Missing ${role} in ${teamId}`);
    // Pick le champion oÃ¹ le rating joueur est max parmi ceux de ce rÃ´le
    const ratings = lg.players[pid].ratings;
    let bestId = ""; let best = -1;
    for (const [champId, r] of Object.entries(ratings)) {
      if (lg.champions[champId]?.roles.includes(role.toUpperCase() as any) && r>best) { best=r; bestId=champId; }
    }
    // fallback: premier de la pool
    if (!bestId) bestId = Object.keys(lg.champions).find(id => lg.champions[id].roles.includes(role.toUpperCase() as any))!;
    return bestId;
  };
  return { top:pick("top"), jungle:pick("jungle"), mid:pick("mid"), adc:pick("adc"), sup:pick("sup") };
}
