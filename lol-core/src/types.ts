export type Role = "TOP" | "JNG" | "MID" | "ADC" | "SUP";
export type StaffRole = "Coach" | "Analyst" | "Scout" | "Physio";
export type DayName = "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun";

export interface Team {
  id: string;
  name: string;
  short: string;
  rep: number; // 0..100 reputation
  cash: number; // current cash balance
  sponsorPerDay: number; // sponsor income per day
  payrollPerDay: number; // wage costs per day
  logo?: string;
}

export interface Player {
  id: string;
  teamId: string;
  name: string;
  role: Role;
  age: number;
  nat: string;
  ovr: number;
  pot: number;
  lane: number;
  mech: number;
  macro: number;
  champPool: number;
  style: "aggressive" | "control" | "skirmish" | "late";
  wagePerDay: number;
  contractEnd: string; // ISO date
  morale: number; // 0..100
  fitness: number; // 0..100
  form: number; // -3..+3
}

export interface Staff {
  id: string;
  teamId: string;
  name: string;
  role: StaffRole;
  skill: number;
  wagePerDay: number;
}

export interface Series {
  week: number;
  dayIndex: number; // 0..6
  dayName: DayName;
  slot: 0 | 1;
  bo: 3;
  home: string;
  away: string;
  timeLocalKST?: string;
  startTime?: string;
  round: number;
  played?: boolean;
  score: [number, number] | null;
}

export interface Week {
  week: number;
  days?: Series[];
  series?: Series[];
}

export interface StandingsRow {
  teamId: string;
  wins: number;
  losses: number;
  gamesWon: number;
  gamesLost: number;
}

export interface Meta {
  version: number;
  league: "LCK";
  timezone: "Asia/Seoul";
  season: number;
  currentWeek: number;
  currentDayIndex: number;
  rngSeed: number;
  updatedAt: string;

  // ▼ nouveau bloc
  calendar?: CalendarMeta;
}


export interface CalendarMeta {
  startISO: string;      // ex. "2025-01-15T00:00:00+09:00"
  timezone?: string;     // ex. "Asia/Seoul"
}

export interface SeriesResult {
  week: number;
  dayIndex: number;
  slot: 0 | 1;
  home: string;
  away: string;
  winner?: "home" | "away";
  score: [number, number] | null;
  completedAt?: string;
}

export interface GameDB {
  meta: Meta;
  teams: Team[];
  players: Player[];
  staff: Staff[];
  schedule: Week[];
  standings: StandingsRow[];
  results: SeriesResult[];
}


