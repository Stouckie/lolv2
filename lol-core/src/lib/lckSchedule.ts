import type { DayName, Week, Series } from "../models";

/** Mer→Dim comme en LCK, 2 BO/jour : 17:00 et 20:00 KST */
export const LCK_DAY_NAMES: DayName[] = ["Wed","Thu","Fri","Sat","Sun"];
const SLOTS = ["17:00","20:00"] as const;

/** Pairings round-robin (méthode du cercle) pour N équipes (N pair) */
function roundRobin(teams: string[]): string[][][] {
  const n = teams.length;
  if (n % 2 !== 0) teams = [...teams, "__BYE__"];
  const arr = teams.slice();
  const rounds: string[][][] = [];
  for (let r = 0; r < arr.length - 1; r++) {
    const pairs: string[][] = [];
    for (let i = 0; i < arr.length / 2; i++) {
      const a = arr[i], b = arr[arr.length - 1 - i];
      if (a !== "__BYE__" && b !== "__BYE__") pairs.push([a,b]);
    }
    rounds.push(pairs);
    // rotation
    const fixed = arr[0];
    const rest = arr.slice(1);
    rest.unshift(rest.pop()!);
    arr.splice(0, arr.length, fixed, ...rest);
  }
  return rounds; // length = n - 1
}

/** Génère 18 rounds (double RR), et packe en 9 semaines * 10 BO (2/jour * 5 jours) */
export function generateLCKSplit(teams: { id: string; name: string }[], _seed = 1): Week[] {
  const ids = teams.map(t => t.id);
  const rr1 = roundRobin(ids);              // 9 rounds * 5 matches
  const rr2 = rr1.map(pairs => pairs.map(([h,a]) => [a,h] as [string,string]));
  const allRounds: [string,string][][] = [...rr1, ...rr2];

  // flattens à 90 séries (10 équipes -> 5 matches/round * 18 rounds)
  const allSeries: {home:string;away:string;round:number}[] = [];
  allRounds.forEach((pairs, rIdx) => {
    pairs.forEach(p => allSeries.push({ home: p[0], away: p[1], round: rIdx + 1 }));
  });

  // 9 semaines * 10 BO (Mer..Dim, 2 slots/jour)
  const weeks: Week[] = [];
  let cursor = 0;
  for (let w = 1; w <= 9; w++) {
    const days: Series[] = [];
    for (let d = 0; d < 5; d++) {
      for (let s = 0 as 0 | 1; s <= 1; s = (s + 1) as 0 | 1) {
        const m = allSeries[cursor++];
        if (!m) break;
        days.push({
          week: w,
          dayIndex: d,
          dayName: LCK_DAY_NAMES[d],
          slot: s,
          bo: 3,
          home: m.home,
          away: m.away,
          timeLocalKST: SLOTS[s],
          round: m.round,
        });
      }
    }
    weeks.push({ week: w, days });
  }
  return weeks;
}
