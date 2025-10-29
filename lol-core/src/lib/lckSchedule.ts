import type { Week, Series, DayName } from "../types";

export const LCK_DAY_NAMES: DayName[] = ["Wed", "Thu", "Fri", "Sat", "Sun"];
const SLOTS = ["17:00", "20:00"] as const;

function roundRobin(teamIds: string[]): [string, string][][] {
  const arr = teamIds.length % 2 === 0 ? teamIds.slice() : [...teamIds, "__BYE__"];
  const rounds: [string, string][][] = [];

  for (let r = 0; r < arr.length - 1; r++) {
    const pairs: [string, string][] = [];
    for (let i = 0; i < arr.length / 2; i++) {
      const a = arr[i];
      const b = arr[arr.length - 1 - i];
      if (a !== "__BYE__" && b !== "__BYE__") pairs.push([a, b]);
    }
    rounds.push(pairs);

    const [fixed, ...rest] = arr;
    rest.unshift(rest.pop()!);
    arr.splice(0, arr.length, fixed, ...rest);
  }

  return rounds;
}

export function generateLCKSplit(teamIds: string[]): Week[] {
  const allRounds = roundRobin(teamIds);
  const allSeries: { home: string; away: string; round: number }[] = [];
  allRounds.forEach((pairs, rIdx) => {
    pairs.forEach(([home, away]) => allSeries.push({ home, away, round: rIdx + 1 }));
  });

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
          played: false,
          score: null,
        });
      }
    }
    weeks.push({ week: w, days, series: days });
  }
  return weeks;
}

