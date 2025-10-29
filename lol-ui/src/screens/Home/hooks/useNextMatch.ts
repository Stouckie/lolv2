// Trouve le prochain match à partir de (currentWeek, currentDayIndex),
// en priorisant ton équipe si précisée.
import { addDaysISO, fmtLongFR, getSeasonStartISO } from "../lib/date";
import { getWeek, getWeekSeriesArray } from "../lib/schedule";

type SeriesLike = {
  dayIndex?: number;
  dayName?: string;
  slot?: number;
  bo?: number;
  home: string;
  away: string;
  timeLocalKST?: string;
  startTime?: string;
  played?: boolean;
  score?: [number, number] | null;
};

type NextMatch = {
  week: number;           // 1-based
  dayIndex: number;       // 0..6
  dateLabel: string;      // "mar. 21 janv. 2025"
  time: string;           // "18:00" KST ou "—"
  bo: number;
  homeId: string; awayId: string;
  homeName: string; awayName: string;
  homeLogo: string; awayLogo: string;
};

function safeTeam(db: any, id: string) {
  const t = (db?.teams || []).find(
    (x: any) => x.id === id || x.slug === id
  );
  return {
    name: t?.name ?? id,
    logo: t?.logo ?? `/logos/lck/${id}.png`,
  };
}

export function useNextMatch(db: any, teamId?: string): NextMatch | null {
  if (!db?.meta) return null;

  const startISO = getSeasonStartISO(db);
  const startWeek = db.meta.currentWeek ?? 1;        // 1-based
  const startDay  = db.meta.currentDayIndex ?? 0;    // 0..6

  // cherche dans une fenêtre suffisante (ex. 180 jours)
  for (let hop = 0; hop < 180; hop++) {
    const weekNum = startWeek + Math.floor((startDay + hop) / 7); // 1-based
    const dayIdx  = (startDay + hop) % 7;

    const w = getWeek(db, weekNum);
    const arr: SeriesLike[] = getWeekSeriesArray(w);
    if (!arr.length) continue;

    // Deux schémas possibles : par dayName OU par dayIndex
    let candidates: SeriesLike[] = [];
    const names = Array.from(new Set(arr.map(s => s.dayName).filter(Boolean))) as string[];
    if (names.length) {
      const todayName = names[dayIdx % names.length];
      candidates = arr.filter(s => (s.dayName ?? "") === todayName && !s.played);
    } else {
      const distinct = Array.from(new Set(arr.map(s => s.dayIndex ?? 0))).sort((a,b)=>a-b);
      if (!distinct.length) continue;
      const idx = distinct[dayIdx % distinct.length];
      candidates = arr.filter(s => (s.dayIndex ?? -1) === idx && !s.played);
    }
    if (!candidates.length) continue;

    // Priorise un match de l’équipe, sinon le premier du jour
    const pick = teamId
      ? (candidates.find(s => s.home === teamId || s.away === teamId) ?? candidates[0])
      : candidates[0];

    const offsetDays = (weekNum - 1) * 7 + dayIdx; // cumul des semaines + jour
    const dateLabel  = fmtLongFR(addDaysISO(startISO, offsetDays));
    const home = safeTeam(db, pick.home);
    const away = safeTeam(db, pick.away);

    return {
      week: weekNum,
      dayIndex: dayIdx,
      dateLabel,
      time: pick.timeLocalKST ?? pick.startTime ?? "—",
      bo: pick.bo ?? 1,
      homeId: pick.home,
      awayId: pick.away,
      homeName: home.name,
      awayName: away.name,
      homeLogo: home.logo,
      awayLogo: away.logo,
    };
  }

  return null;
}
