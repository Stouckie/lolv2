import type { GameDB, Series, Week } from "@/utils/types";

type AnyRecord = Record<string, any>;
type SeriesLike = Partial<Series> & AnyRecord;
type WeekLike = { week?: number; index?: number; days?: SeriesLike[]; series?: SeriesLike[] } & AnyRecord;

type StandingsRow = GameDB["standings"][number];
type TeamRecord = GameDB["teams"][number];
type PlayerRecord = GameDB["players"][number];
type StaffRecord = GameDB["staff"][number];

const FALLBACK_META: GameDB["meta"] = {
  version: 1,
  league: "LCK",
  timezone: "Asia/Seoul",
  season: 1,
  currentWeek: 1,
  currentDayIndex: 0,
  rngSeed: Date.now(),
  updatedAt: new Date().toISOString(),
};

function looksLikeSeries(value: unknown): value is SeriesLike {
  if (!value || typeof value !== "object") return false;
  const v = value as AnyRecord;
  return typeof v.home === "string" || typeof v.away === "string";
}

function hasWeekField(list: SeriesLike[]): boolean {
  return list.some(item => typeof item.week === "number" || typeof item.index === "number");
}

function normalizeSeries(input: SeriesLike, fallbackWeek: number, fallbackDay: number): Series {
  const score = Array.isArray(input.score) && input.score.length === 2
    ? [Number(input.score[0]) || 0, Number(input.score[1]) || 0] as [number, number]
    : null;

  return {
    week: Number(input.week ?? input.index ?? fallbackWeek) || fallbackWeek,
    dayIndex: Number(input.dayIndex ?? input.index ?? fallbackDay) || fallbackDay,
    dayName: (input.dayName as Series["dayName"]) ?? "Wed",
    slot: (input.slot === 1 ? 1 : 0),
    bo: 3,
    home: String(input.home ?? ""),
    away: String(input.away ?? ""),
    timeLocalKST: typeof input.timeLocalKST === "string" ? input.timeLocalKST : undefined,
    startTime: typeof input.startTime === "string" ? input.startTime : undefined,
    round: Number(input.round ?? input.week ?? fallbackWeek) || fallbackWeek,
    played: Boolean(input.played) || score !== null,
    score,
  };
}

function normalizeWeek(input: WeekLike, fallbackWeek: number): Week {
  const weekNumber = Number(input.week ?? input.index ?? fallbackWeek) || fallbackWeek;
  const source = Array.isArray(input.days)
    ? input.days
    : Array.isArray(input.series)
      ? input.series
      : [];
  const normalized = source.map((series, idx) => normalizeSeries(series, weekNumber, Number(series.dayIndex ?? idx) || idx));
  return { week: weekNumber, days: normalized, series: normalized } as Week;
}

function groupFlatSeriesByWeek(list: SeriesLike[]): WeekLike[] {
  const perWeek = new Map<number, SeriesLike[]>();
  for (const entry of list) {
    const w = Number(entry.week ?? entry.index ?? 1) || 1;
    if (!perWeek.has(w)) perWeek.set(w, []);
    perWeek.get(w)!.push(entry);
  }
  return Array.from(perWeek.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([week, series]) => ({ week, series }));
}

function normalizeWeeksArray(value: unknown): WeekLike[] {
  if (!Array.isArray(value) || value.length === 0) return [];
  const first = value[0];
  if (looksLikeSeries(first)) {
    return groupFlatSeriesByWeek(value as SeriesLike[]);
  }
  if (first && typeof first === "object" && ((first as AnyRecord).days || (first as AnyRecord).series || (first as AnyRecord).week || (first as AnyRecord).index)) {
    return (value as SeriesLike[]).map((week, idx) => ({
      week: Number((week as AnyRecord).week ?? (week as AnyRecord).index ?? idx + 1),
      days: Array.isArray((week as AnyRecord).days) ? (week as AnyRecord).days as SeriesLike[] : undefined,
      series: Array.isArray((week as AnyRecord).series) ? (week as AnyRecord).series as SeriesLike[] : Array.isArray((week as AnyRecord).days) ? (week as AnyRecord).days as SeriesLike[] : undefined,
    }));
  }
  if (Array.isArray(first)) {
    return (value as SeriesLike[][]).map((series, index) => ({ week: index + 1, series }));
  }
  return [];
}

function mapShapeToWeeks(shape: AnyRecord): WeekLike[] {
  const output: WeekLike[] = [];
  for (const [key, value] of Object.entries(shape)) {
    const numeric = Number(key);
    if (!Number.isFinite(numeric)) continue;
    if (Array.isArray(value)) {
      output.push({ week: numeric, series: value as SeriesLike[] });
    } else if (value && typeof value === "object" && Array.isArray((value as AnyRecord).days)) {
      output.push({ week: numeric, days: (value as AnyRecord).days as SeriesLike[] });
    }
  }
  return output.sort((a, b) => (Number(a.week ?? a.index) - Number(b.week ?? b.index)));
}

function locateSchedule(raw: AnyRecord | null | undefined): Week[] {
  if (!raw) return [];
  const direct = normalizeWeeksArray(raw.schedule);
  if (direct.length) return direct.map((week, idx) => normalizeWeek(week, week.week ?? idx + 1));

  const candidates: unknown[] = [
    raw.calendar?.weeks,
    raw.calendar?.schedule,
    raw.season?.weeks,
    raw.season?.schedule,
    raw.weeks,
    raw.scheduleWeeks,
  ];

  for (const candidate of candidates) {
    const normalized = normalizeWeeksArray(candidate);
    if (normalized.length) return normalized.map((week, idx) => normalizeWeek(week, week.week ?? idx + 1));
  }

  const mappedSources = [raw.scheduleByWeek, raw.matchesByWeek, raw.calendar?.byWeek, raw.season?.byWeek]
    .filter(Boolean)
    .flatMap(value => mapShapeToWeeks(value as AnyRecord));
  if (mappedSources.length) return mappedSources.map((week, idx) => normalizeWeek(week, week.week ?? idx + 1));

  for (const value of Object.values(raw)) {
    if (Array.isArray(value) && value.length && looksLikeSeries(value[0]) && hasWeekField(value as SeriesLike[])) {
      const normalized = groupFlatSeriesByWeek(value as SeriesLike[]);
      return normalized.map((week, idx) => normalizeWeek(week, week.week ?? idx + 1));
    }
  }

  return [];
}

function normalizeStandings(input: unknown): StandingsRow[] {
  if (!Array.isArray(input)) return [];
  return (input as AnyRecord[])
    .map(row => ({
      teamId: String(row?.teamId ?? ""),
      wins: Number(row?.wins ?? 0) || 0,
      losses: Number(row?.losses ?? 0) || 0,
      gamesWon: Number(row?.gamesWon ?? row?.wins ?? 0) || 0,
      gamesLost: Number(row?.gamesLost ?? row?.losses ?? 0) || 0,
    }))
    .filter(row => row.teamId);
}

function normalizeResults(input: unknown): GameDB["results"] {
  if (!Array.isArray(input)) return [];
  return (input as AnyRecord[]).map(item => ({
    week: Number(item?.week ?? 0) || 0,
    dayIndex: Number(item?.dayIndex ?? 0) || 0,
    slot: item?.slot === 1 ? 1 : 0,
    home: String(item?.home ?? ""),
    away: String(item?.away ?? ""),
    winner: item?.winner === "home" || item?.winner === "away" ? item.winner : undefined,
    score: Array.isArray(item?.score) && item.score.length === 2
      ? [Number(item.score[0]) || 0, Number(item.score[1]) || 0] as [number, number]
      : null,
    completedAt: typeof item?.completedAt === "string" ? item.completedAt : undefined,
  }));
}

function normalizeTeams(input: unknown): TeamRecord[] {
  if (!Array.isArray(input)) return [];
  return (input as AnyRecord[])
    .map(team => ({
      id: String(team?.id ?? ""),
      name: String(team?.name ?? ""),
      short: String(team?.short ?? team?.name ?? ""),
      rep: Number(team?.rep ?? 50) || 0,
      cash: Number(team?.cash ?? 0) || 0,
      sponsorPerDay: Number(team?.sponsorPerDay ?? 0) || 0,
      payrollPerDay: Number(team?.payrollPerDay ?? 0) || 0,
      logo: typeof team?.logo === "string" ? team.logo : undefined,
    }))
    .filter(team => team.id);
}

function normalizePlayers(input: unknown): PlayerRecord[] {
  if (!Array.isArray(input)) return [];
  return (input as AnyRecord[])
    .map(player => ({
      id: String(player?.id ?? ""),
      teamId: String(player?.teamId ?? ""),
      name: String(player?.name ?? ""),
      role: player?.role ?? "MID",
      age: Number(player?.age ?? 20) || 20,
      nat: String(player?.nat ?? "KR"),
      ovr: Number(player?.ovr ?? 50) || 50,
      pot: Number(player?.pot ?? 50) || 50,
      lane: Number(player?.lane ?? 50) || 50,
      mech: Number(player?.mech ?? 50) || 50,
      macro: Number(player?.macro ?? 50) || 50,
      champPool: Number(player?.champPool ?? 50) || 50,
      style: ["aggressive", "control", "skirmish", "late"].includes(player?.style) ? player.style : "control",
      wagePerDay: Number(player?.wagePerDay ?? 0) || 0,
      contractEnd: typeof player?.contractEnd === "string" ? player.contractEnd : new Date().toISOString(),
      morale: Number(player?.morale ?? 50) || 50,
      fitness: Number(player?.fitness ?? 100) || 100,
      form: Number(player?.form ?? 0) || 0,
    }))
    .filter(player => player.id);
}

function normalizeStaff(input: unknown): StaffRecord[] {
  if (!Array.isArray(input)) return [];
  return (input as AnyRecord[])
    .map(member => ({
      id: String(member?.id ?? ""),
      teamId: String(member?.teamId ?? ""),
      name: String(member?.name ?? ""),
      role: member?.role ?? "Coach",
      skill: Number(member?.skill ?? 50) || 50,
      wagePerDay: Number(member?.wagePerDay ?? 0) || 0,
    }))
    .filter(member => member.id);
}

export function normalizeGameDB(raw: unknown): GameDB {
  const base: AnyRecord = raw && typeof raw === "object" ? { ...raw } : {};
  const metaSource: AnyRecord = typeof base.meta === "object" && base.meta ? { ...base.meta } : {};
  const rngSeed = Number(metaSource.rngSeed);

  base.meta = {
    ...FALLBACK_META,
    version: Number(metaSource.version ?? FALLBACK_META.version) || FALLBACK_META.version,
    league: (metaSource.league as GameDB["meta"]["league"]) ?? FALLBACK_META.league,
    timezone: (metaSource.timezone as GameDB["meta"]["timezone"]) ?? FALLBACK_META.timezone,
    season: Number(metaSource.season ?? FALLBACK_META.season) || FALLBACK_META.season,
    currentWeek: Number(metaSource.currentWeek ?? FALLBACK_META.currentWeek) || FALLBACK_META.currentWeek,
    currentDayIndex: Number(metaSource.currentDayIndex ?? FALLBACK_META.currentDayIndex) || FALLBACK_META.currentDayIndex,
    rngSeed: Number.isFinite(rngSeed) ? rngSeed : FALLBACK_META.rngSeed,
    updatedAt: typeof metaSource.updatedAt === "string" ? metaSource.updatedAt : FALLBACK_META.updatedAt,
  } satisfies GameDB["meta"];

  const schedule = locateSchedule(base);
  base.schedule = schedule.length ? schedule : [normalizeWeek({ week: 1, series: [] }, 1)];

  base.standings = normalizeStandings(base.standings);
  base.results = normalizeResults(base.results);
  base.teams = normalizeTeams(base.teams);
  base.players = normalizePlayers(base.players);
  base.staff = normalizeStaff(base.staff);

  return base as GameDB;
}
