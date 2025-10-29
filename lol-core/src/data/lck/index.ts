// lol-core/src/data/lck/index.ts
import raw from "./LCK_players_2025.json";

export type Role = "TOP" | "JGL" | "MID" | "ADC" | "SUP";

// Typage minimal pour ne pas te bloquer au build (tout le reste reste libre via [k: string]: any)
export interface LckPlayer {
  id: string;
  teamId: string;
  status: "Starter" | "Sub" | "FA" | "PendingFA" | "UnderContract";
  rolePrimary: Role;
  ign: string;
  [k: string]: any; // notes, playstyles, contracts, valueUSD_*, sources, etc.
}

export interface LckPlayersPayload {
  meta?: any;
  players: LckPlayer[];
}

const payload = raw as LckPlayersPayload;

export const LCK_PLAYERS_2025 = payload.players;
export const LCK_PLAYERS_META_2025 = payload.meta ?? {};
