// Modèles "officiels" du core (importés par l'UI)

export type Role = "TOP" | "JNG" | "MID" | "ADC" | "SUP";
export type StaffRole = "Coach" | "Analyst" | "Scout" | "Physio";

export type Team = {
  id: string;
  name: string;
  short: string;
  rep: number;               // 0..100
  cash: number;              // solde
  sponsorPerDay: number;     // sponsor / jour
  payrollPerDay: number;     // masse salariale / jour
  logo?: string;
};

export type Player = {
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
  contractEnd: string; // ISO
  morale: number;      // 0..100
  fitness: number;     // 0..100
  form: number;        // -3..+3
};

export type Staff = {
  id: string;
  teamId: string;
  name: string;
  role: StaffRole;
  skill: number;        // 1..100
  wagePerDay: number;
};

export type DayName = "Wed" | "Thu" | "Fri" | "Sat" | "Sun";
export type Series = {
  week: number;
  dayIndex: number;                // 0..4
  dayName: DayName;
  slot: 0 | 1;                     // BO #1 ou #2
  bo: 3;
  home: string;
  away: string;
  timeLocalKST?: string;           // "17:00" | "20:00"
  round: number;                   // 1..18
};
export type Week = { week: number; days: Series[] };

export type StandingsRow = { teamId: string; wins: number; losses: number };

export type Meta = {
  version: number;
  league: "LCK";
  season: "Spring 2025";
  timezone: "Asia/Seoul";
  currentWeek: number;
  rngSeed: number;
};

export type GameDB = {
  meta: Meta;
  teams: Team[];
  players: Player[];
  staff: Staff[];
  schedule: Week[];
  standings: StandingsRow[];
  results: Array<{
    week: number; dayIndex: number; slot: 0 | 1;
    home: string; away: string;
    winner?: "home" | "away"; score?: [number, number];
  }>;
};

export type SaveFile<T = GameDB> = {
  version: number;
  savedAt: string;
  summary: { manager: string; league: string; team: string; week: number };
  state: T;
};
