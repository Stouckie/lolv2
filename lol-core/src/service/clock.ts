import type { GameDB, Series } from "../types";

export const CAL_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
export type CalDay = (typeof CAL_DAYS)[number];

export function advanceOneDay(db: GameDB) {
  const meta = db.meta;
  if (meta.currentDayIndex == null) meta.currentDayIndex = 0;
  if (meta.currentWeek == null) meta.currentWeek = 1;

  meta.currentDayIndex = (meta.currentDayIndex + 1) % CAL_DAYS.length;
  if (meta.currentDayIndex === 0) meta.currentWeek += 1;
}

export function getTodaySeries(db: GameDB): Series[] {
  const meta = db.meta;
  const week = db.schedule.find(x => x.week === meta.currentWeek);
  if (!week) return [];
  const dayIndex = meta.currentDayIndex ?? 0;
  const days = week.days ?? week.series ?? [];
  return days.filter(series => series.dayIndex === dayIndex);
}

export function hasUnplayedToday(db: GameDB) {
  return getTodaySeries(db).some(series => !series.played && series.score == null);
}


