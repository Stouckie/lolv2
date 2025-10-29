// lol-core/src/db/models.ts
export type Role = "TOP" | "JGL" | "MID" | "ADC" | "SUP";

export type Series = {
  week?: number;
  dayIndex?: number;
  dayName?: string;
  slot?: 0 | 1;
  bo?: number;
  home: string;
  away: string;
  timeLocalKST?: string;
  startTime?: string;
  round?: number;
  played?: boolean;
  score?: [number, number] | null;
};

export type Week = {
  week: number;
  days?: Series[];
  series?: Series[];
};

export interface Meta {
  version: number;
  league: "LCK";
  timezone?: string;
  season: number;
  currentWeek: number;
  currentDayIndex: number;
  rngSeed?: number;
  updatedAt?: string;
}

export interface Standing {
  teamId: string;
  wins: number;
  losses: number;
  gamesWon?: number;
  gamesLost?: number;
}

export interface GameDB {
  meta: Meta;
  schedule?: Week[];
  calendar?: { weeks?: Week[]; schedule?: Week[]; byWeek?: Record<string, any> };
  season?: { weeks?: Week[]; schedule?: Week[]; byWeek?: Record<string, any> };
  weeks?: Week[];
  scheduleWeeks?: Week[];
  scheduleByWeek?: Record<string, any>;
  matchesByWeek?: Record<string, any>;
  standings: Standing[];
  players?: any[];
  [k: string]: any;
}
