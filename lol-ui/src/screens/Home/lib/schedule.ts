// Helpers calendrier (tout ce qui polluait Hub.tsx)

type SeriesLike = {
  dayIndex?: number; dayName?: string; slot?: number;
  played?: boolean; score?: [number, number] | null;
  home: string; away: string;
};
type WeekLike = { week?: number; index?: number; days?: SeriesLike[]; series?: SeriesLike[] };
type GameDB = { schedule?: any; [k: string]: any };
type Clock = { week: number; dayIndex: number };

const looksLikeSeries = (x: any) => x && typeof x === "object" && (x.home || x.away);
const hasWeekField = (arr: any[]) => arr.some(s => typeof s?.week === "number" || typeof s?.week === "string");

function groupFlatSeriesByWeek(list: any[]): WeekLike[] {
  const map = new Map<number, SeriesLike[]>();
  for (const s of list) {
    const wk = Number(s.week ?? s.index ?? 1);
    if (!map.has(wk)) map.set(wk, []);
    map.get(wk)!.push(s);
  }
  return [...map.entries()]
    .sort((a,b) => a[0]-b[0])
    .map(([week, series]) => ({ week, series }));
}

function normalizeWeeksArray(arr: any[]): WeekLike[] {
  if (!Array.isArray(arr) || !arr.length) return [];
  const first = arr[0];
  if (looksLikeSeries(first)) return groupFlatSeriesByWeek(arr);
  if (first && typeof first === "object" && (first.days || first.series || first.week || first.index)) {
    return arr.map((w: any, i: number) => ({
      week: Number(w.week ?? w.index ?? i + 1),
      days: Array.isArray(w.days) ? w.days : undefined,
      series: Array.isArray(w.series) ? w.series : Array.isArray(w.days) ? w.days : undefined,
    }));
  }
  if (Array.isArray(first)) return (arr as SeriesLike[][]).map((series, i) => ({ week: i+1, series }));
  return [];
}

function mapToWeeks(mapObj: any): WeekLike[] {
  if (!mapObj || typeof mapObj !== "object") return [];
  const weeks: WeekLike[] = [];
  for (const [k, v] of Object.entries(mapObj)) {
    const wk = Number(k);
    if (!Number.isFinite(wk)) continue;
    if (Array.isArray(v)) weeks.push({ week: wk, series: v as SeriesLike[] });
    else if (v && typeof v === "object" && (v as any).days) weeks.push({ week: wk, days: (v as any).days });
  }
  return weeks.sort((a,b) => Number(a.week ?? a.index) - Number(b.week ?? b.index));
}

export function locateSchedule(db: GameDB | null | undefined): WeekLike[] {
  if (!db) return [];
  if (Array.isArray(db.schedule)) return db.schedule;

  const arrays = [
    db.calendar?.weeks, db.calendar?.schedule,
    db.season?.weeks,   db.season?.schedule,
    db.weeks,           db.scheduleWeeks,
  ].filter(Boolean);
  for (const a of arrays) if (Array.isArray(a)) return normalizeWeeksArray(a);

  const maps = [db.scheduleByWeek, db.matchesByWeek, db.calendar?.byWeek, db.season?.byWeek].filter(Boolean);
  for (const m of maps) {
    const weeks = mapToWeeks(m);
    if (weeks.length) return weeks;
  }

  for (const val of Object.values(db)) {
    if (Array.isArray(val) && val.length && looksLikeSeries(val[0]) && hasWeekField(val)) {
      return groupFlatSeriesByWeek(val);
    }
  }
  return [];
}

export const weeks = (db: GameDB | null | undefined) => locateSchedule(db);

export function getWeek(db: GameDB | null | undefined, num: number): WeekLike | null {
  return weeks(db).find(w => (w.week ?? w.index) === num) ?? null;
}

export function getWeekSeriesArray(w: WeekLike | null | undefined): SeriesLike[] {
  if (!w) return [];
  if (Array.isArray(w.days)) return w.days;
  if (Array.isArray(w.series)) return w.series;
  return [];
}

export function resolveTodayCalendarSelector(
  db: GameDB | null | undefined,
  clock: Clock
): { kind: "dayName"; value: string } | { kind: "dayIndex"; value: number } {
  const w = getWeek(db, clock.week);
  if (!w) return { kind: "dayIndex", value: clock.dayIndex };
  const arr = getWeekSeriesArray(w);

  const names = Array.from(new Set(arr.map(s => s.dayName).filter(Boolean))) as string[];
  if (names.length) return { kind: "dayName", value: names[clock.dayIndex % names.length] };

  const distinct = Array.from(new Set(arr.map(s => s.dayIndex ?? 0))).sort((a,b)=>a-b);
  if (distinct.length) return { kind: "dayIndex", value: distinct[clock.dayIndex % distinct.length] };

  return { kind: "dayIndex", value: clock.dayIndex };
}
