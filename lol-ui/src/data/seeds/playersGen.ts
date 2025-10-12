// src/data/seeds/playersGen.ts
export type Role = "TOP" | "JNG" | "MID" | "ADC" | "SUP";

export type PlayerSeed = {
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
  morale: number; // 0..100
  fitness: number; // 0..100
  form: number;    // -3..+3
};

type TeamRep = { id: string; rep: number };

const ROLES: Role[] = ["TOP", "JNG", "MID", "ADC", "SUP"];

/* ------- RNG déterministe simple (mulberry32) ------- */
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hashStr(s: string) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/* ------- helpers ------- */
function clamp(v: number, a: number, b: number) { return Math.max(a, Math.min(b, v)); }
function round(v: number) { return Math.round(v); }
const NAT = "KR";
const STYLE: Array<PlayerSeed["style"]> = ["aggressive", "control", "skirmish", "late"];

// Noms fictifs simples; remplace plus tard par une vraie base
const FIRST = ["Min", "Jun", "Seong", "Jae", "Hyeon", "Ji", "Byun", "Han", "Kim", "Park", "Lee"];
const LAST  = ["Kim", "Park", "Lee", "Choi", "Jung", "Kang", "Cho", "Yoon", "Han", "Kwon", "Ryu"];
function fakeName(rnd: () => number) {
  const f = FIRST[Math.floor(rnd() * FIRST.length)];
  const l = LAST[Math.floor(rnd() * LAST.length)];
  return `${f}${rnd() < 0.4 ? "-" : " "}${l}`;
}

function wageFromOvr(ovr: number): number {
  // salaire journalier approximatif en fonction de l'ovr
  // 60 → 200 ; 70 → 600 ; 80 → 1_500 ; 90 → 3_500
  const base = Math.pow(1.18, ovr - 60) * 200;
  return Math.round(base / 50) * 50;
}

/** Génère 7 joueurs pour une team (5 titulaires + 2 remplaçants) */
export function generateTeamPlayers(team: TeamRep, seed: number): PlayerSeed[] {
  const rnd = mulberry32(seed ^ hashStr(team.id));
  const base = 60 + (team.rep - 60) * 0.6; // base skill lié à la réputation
  const players: PlayerSeed[] = [];

  // 5 titulaires
  for (let i = 0; i < ROLES.length; i++) {
    const role = ROLES[i];
    const ovr = clamp(round(base + rnd() * 10 + (i === 2 ? 2 : 0)), 65, 92); // petit boost MID
    const pot = clamp(ovr + 4 + Math.floor(rnd() * 6), ovr, 96);
    const lane = clamp(round(ovr + (rnd() * 6 - 3)), 50, 99);
    const mech = clamp(round(ovr + (rnd() * 8 - 2)), 50, 99);
    const macro = clamp(round(ovr + (rnd() * 6 - 3)), 50, 99);
    const champPool = clamp(round(50 + rnd() * 40), 30, 100);
    const style = STYLE[Math.floor(rnd() * STYLE.length)];
    const wagePerDay = wageFromOvr(ovr);
    const age = clamp(round(19 + rnd() * 8), 18, 30);
    const morale = clamp(round(65 + rnd() * 25), 40, 100);
    const fitness = clamp(round(90 + rnd() * 10), 70, 100);
    const form = clamp(round((rnd() - 0.5) * 4), -3, 3);

    players.push({
      id: `p_${team.id}_${role.toLowerCase()}`,
      teamId: team.id,
      name: fakeName(rnd),
      role,
      age,
      nat: NAT,
      ovr, pot, lane, mech, macro, champPool, style,
      wagePerDay,
      contractEnd: "2026-11-30",
      morale, fitness, form,
    });
  }

  // 2 remplaçants (rôles aléatoires)
  for (let j = 0; j < 2; j++) {
    const role = ROLES[Math.floor(rnd() * ROLES.length)];
    const ovr = clamp(round(base - 3 + rnd() * 8), 60, 88);
    const pot = clamp(ovr + 6 + Math.floor(rnd() * 8), ovr, 95);
    const lane = clamp(round(ovr + (rnd() * 6 - 3)), 50, 95);
    const mech = clamp(round(ovr + (rnd() * 8 - 4)), 45, 95);
    const macro = clamp(round(ovr + (rnd() * 6 - 3)), 45, 95);
    const champPool = clamp(round(40 + rnd() * 40), 20, 90);
    const style = STYLE[Math.floor(rnd() * STYLE.length)];
    const wagePerDay = wageFromOvr(ovr);
    const age = clamp(round(18 + rnd() * 7), 17, 28);
    const morale = clamp(round(60 + rnd() * 30), 35, 100);
    const fitness = clamp(round(88 + rnd() * 10), 65, 100);
    const form = clamp(round((rnd() - 0.5) * 4), -3, 3);

    players.push({
      id: `p_${team.id}_b${j+1}`,
      teamId: team.id,
      name: fakeName(rnd),
      role,
      age,
      nat: NAT,
      ovr, pot, lane, mech, macro, champPool, style,
      wagePerDay,
      contractEnd: "2026-06-30",
      morale, fitness, form,
    });
  }

  return players;
}

/** Génère tous les rosters à partir d'une liste de teams (id, rep) + seed */
export function generateAllPlayers(teams: TeamRep[], seed: number): PlayerSeed[] {
  return teams.flatMap(t => generateTeamPlayers(t, seed));
}
