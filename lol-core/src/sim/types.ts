import type { Role } from "../types";

export type Archetype = "Assassin" | "Bruiser" | "Mage" | "Tank" | "Marksman" | "Enchanter";
export type TeamSide = "BLUE" | "RED";

export interface Champion {
  id: string;
  name: string;
  roles: Role[];
  archetype: Archetype;
  base: {
    dps: number;
    burst: number;
    sustain: number;
    control: number;
    mobility: number;
    toughness: number;
  };
  scaling: { early: number; mid: number; late: number };
  tags?: string[];
}

export interface Player {
  id: string;
  name: string;
  role: Role;
  age: number;
  salary: number;
  potential: number;
  ratings: Record<string, number>;
  personality?: {
    discipline?: number;
    ego?: number;
    teamplay?: number;
    consistency?: number;
  };
  comfortTags?: string[];
  currentTeamId?: string;
}

export type StaffRole =
  | "HeadCoach"
  | "Analyst"
  | "Scout"
  | "Trainer"
  | "Psychologist"
  | "GM";

export type PerkTrigger =
  | "DRAFT_PICK_SCORE"
  | "DRAFT_BAN_SCORE"
  | "DRAFT_LOOKAHEAD"
  | "PREP_COUNTER_ACCURACY"
  | "PREP_META_READ"
  | "TRAINING_GAIN"
  | "SCRIM_GAIN"
  | "FATIGUE_RECOVERY"
  | "INJURY_RISK"
  | "SCOUT_DISCOVERY_RATE"
  | "SCOUT_INFO_QUALITY"
  | "CONTRACT_NEGOTIATION"
  | "BUYOUT_DISCOUNT";

export interface StaffPerk {
  id: string;
  trigger: PerkTrigger;
  value: number;
  cap?: number;
  tags?: string[];
}

export interface StaffMember {
  id: string;
  name: string;
  role: StaffRole;
  level: 1 | 2 | 3 | 4 | 5;
  salary: number;
  xp: number;
  perks: StaffPerk[];
}

export interface Facilities {
  trainingCenterLv: 0 | 1 | 2 | 3;
  analyticsLabLv: 0 | 1 | 2 | 3;
  scoutingNetworkLv: 0 | 1 | 2 | 3;
}

export interface Team {
  id: string;
  name: string;
  region: string;
  budget: number;
  roster: { top?: string; jungle?: string; mid?: string; adc?: string; sup?: string };
  academy: string[];
  staff: Partial<Record<StaffRole, StaffMember | undefined>>;
  facilities: Facilities;
}

export interface TeamComp {
  top: string;
  jungle: string;
  mid: string;
  adc: string;
  sup: string;
}

export interface MetaParams {
  enchanterBias: number;
  skirmishBias: number;
  objectiveWeight: number;
  wSynergy: number;
  wComfort: number;
  wMeta: number;
}

export interface MatchConfig {
  rngSeed?: number | string;
  meta: MetaParams;
}

export interface MatchResult {
  winner: TeamSide;
  score: { blue: number; red: number };
  mvpChampionId: string;
  log: string[];
}

export interface League {
  patch: string;
  champions: Record<string, Champion>;
  players: Record<string, Player>;
  teams: Record<string, Team>;
  meta: MetaParams;
  schedule: Array<{ week: number; blueTeamId: string; redTeamId: string; bo: number }>;
  standings: Record<string, { wins: number; losses: number; form: number[] }>;
  finances: Record<string, { cash: number; revenueYTD: number; expensesYTD: number }>;
  week: number;
}

export interface DraftContext {
  pool: Record<string, Champion>;
  meta: MetaParams;
  staff: {
    staff: Partial<Record<StaffMember["role"], StaffMember>>;
    facilities: Facilities;
  };
  comfort?: Record<string, number>;
  opponentHints?: string[];
}

export interface DraftOutcome {
  blue: TeamComp;
  red: TeamComp;
  bans: { blue: string[]; red: string[] };
}
