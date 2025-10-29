// core/src/db/staff.ts
// Génération RNG **uniquement du staff** (aucun joueur)

import type { RNG } from "../lib/rng";
import { seededFrom, pick, randInt, randNorm, clamp } from "../lib/rng";

/* ========= Types ========= */

export type StaffRole =
  | "General Manager"
  | "Team Manager"
  | "Head Coach"
  | "Assistant Coach"
  | "Strategic Coach"
  | "Analyst"
  | "Data Analyst"
  | "Scout"
  | "Performance Coach"
  | "Sports Psychologist"
  | "Physiotherapist"
  | "Team Doctor"
  | "Head of Youth Development"
  | "Academy Coach";

export type StaffMember = {
  id: string;
  teamId: string;
  name: string;
  nationality: "KR" | string;
  age: number;
  role: StaffRole;
  contractYears: number; // 1..3
  salaryEUR: number;

  // 0..100
  leadership: number;
  tactics: number;
  draft: number;
  analytics: number;
  scouting: number;
  development: number;
  motivation: number;
  physio: number;
  communications: number;
  discipline: number;
};

export type TeamLite = { id?: string; slug?: string; name?: string; league?: string };

/* ========= Rôles & biais ========= */

export const ROLES_ALL: StaffRole[] = [
  "General Manager","Team Manager",
  "Head Coach","Assistant Coach","Strategic Coach",
  "Analyst","Data Analyst","Scout",
  "Performance Coach","Sports Psychologist","Physiotherapist","Team Doctor",
  "Head of Youth Development","Academy Coach",
];

const ROLE_BIAS: Record<StaffRole, Partial<Record<keyof StaffMember, number>>> = {
  "General Manager": { leadership:78, communications:68, discipline:72, scouting:62, analytics:55 },
  "Team Manager": { leadership:65, communications:70, discipline:75, motivation:60 },
  "Head Coach": { leadership:72, tactics:78, draft:76, analytics:66, motivation:68, discipline:70 },
  "Assistant Coach": { leadership:58, tactics:72, draft:70, analytics:64, motivation:62 },
  "Strategic Coach": { tactics:80, draft:82, analytics:72, leadership:55, communications:58 },
  "Analyst": { analytics:82, tactics:66, draft:62, communications:58, discipline:60 },
  "Data Analyst": { analytics:85, tactics:60, draft:60, communications:55, discipline:62 },
  "Scout": { scouting:80, development:68, communications:58, leadership:50 },
  "Performance Coach": { physio:75, motivation:72, discipline:70, communications:60 },
  "Sports Psychologist": { motivation:82, communications:72, leadership:60, discipline:58 },
  "Physiotherapist": { physio:85, discipline:70, communications:58 },
  "Team Doctor": { physio:88, discipline:72, communications:60 },
  "Head of Youth Development": { development:82, scouting:72, leadership:60, discipline:62 },
  "Academy Coach": { development:78, tactics:62, motivation:64, discipline:60 },
};

/* ========= Helpers ========= */

const KR_GIVEN = [
  "Minjun","Seojun","Ha-joon","Ji-ho","Joon-woo","Seung-min","Ji-hoon","Do-yoon","Si-woo","Jae-won",
  "Seo-yeon","Ji-woo","Ha-yun","Seo-jun","Ye-jun","Yun-seo","Soo-min","Hyeon-seo","Ji-yoon","Min-seo",
];
const KR_LAST = ["Kim","Lee","Park","Choi","Jung","Kang","Cho","Yoon","Jang","Lim","Han","Oh","Seo","Shin","Kwon","Hwang","Ahn","Song","Hong","Yu"];

function xid(rng: RNG): string {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  return Array.from({ length: 6 }, () => alphabet[Math.floor(rng.next() * alphabet.length)]).join("");
}
function nameKR(rng: RNG) {
  return `${pick(rng, KR_LAST)} ${pick(rng, KR_GIVEN)}`;
}
function biasOf(role: StaffRole, k: keyof StaffMember) {
  const v = ROLE_BIAS[role]?.[k];
  return typeof v === "number" ? v : undefined;
}
function attr(rng: RNG, mean: number, spread = 10) {
  return clamp(randNorm(rng, mean, spread), 20, 95);
}
function randomSalaryEUR(rng: RNG, role: StaffRole, qualityAvg: number): number {
  const base: Record<StaffRole, number> = {
    "General Manager": 220000,
    "Team Manager": 70000,
    "Head Coach": 180000,
    "Assistant Coach": 90000,
    "Strategic Coach": 120000,
    "Analyst": 80000,
    "Data Analyst": 85000,
    "Scout": 60000,
    "Performance Coach": 90000,
    "Sports Psychologist": 100000,
    "Physiotherapist": 95000,
    "Team Doctor": 160000,
    "Head of Youth Development": 120000,
    "Academy Coach": 70000,
  };
  const mult = 0.8 + (qualityAvg / 100) * 0.8;      // ~0.8..1.6
  const noise = 0.85 + rng.next() * 0.30;           // bruit DÉTERMINISTE (via rng)
  return Math.round(base[role] * mult * noise);
}
function teamKeyOf(t: TeamLite): string {
  return String(t?.id ?? t?.slug ?? t?.name ?? "");
}

/* ========= Génération d’un membre ========= */

export function makeStaff(rng: RNG, teamId: string, role: StaffRole): StaffMember {
  const leadership = attr(rng, biasOf(role, "leadership") ?? 50);
  const tactics = attr(rng, biasOf(role, "tactics") ?? 50);
  const draft = attr(rng, biasOf(role, "draft") ?? 50);
  const analytics = attr(rng, biasOf(role, "analytics") ?? 50);
  const scouting = attr(rng, biasOf(role, "scouting") ?? 50);
  const development = attr(rng, biasOf(role, "development") ?? 50);
  const motivation = attr(rng, biasOf(role, "motivation") ?? 50);
  const physio = attr(rng, biasOf(role, "physio") ?? 50);
  const communications = attr(rng, biasOf(role, "communications") ?? 50);
  const discipline = attr(rng, biasOf(role, "discipline") ?? 50);

  const qualityAvg = Math.round(
    (leadership + tactics + draft + analytics + scouting + development + motivation + physio + communications + discipline) / 10
  );

  return {
    id: `staff_${teamId}_${role.replace(/\s+/g, "_").toLowerCase()}_${xid(rng)}`,
    teamId,
    name: nameKR(rng),
    nationality: "KR",
    age: clamp(randInt(rng, 24, 58), 24, 64),
    role,
    contractYears: clamp(randInt(rng, 1, 3), 1, 4),
    salaryEUR: randomSalaryEUR(rng, role, qualityAvg),

    leadership,
    tactics,
    draft,
    analytics,
    scouting,
    development,
    motivation,
    physio,
    communications,
    discipline,
  };
}

/* ========= API “staff only” ========= */

/** Construit UNIQUEMENT le staff pour une liste d’équipes (aucun joueur). RNG déterministe via rngSeed. */
export function buildStaffForTeams(teams: TeamLite[], rngSeed: number): StaffMember[] {
  const out: StaffMember[] = [];
  for (const t of teams) {
    const tk = teamKeyOf(t);
    if (!tk) continue;
    for (const role of ROLES_ALL) {
      const rng = seededFrom(rngSeed, tk, role);
      out.push(makeStaff(rng, tk, role));
    }
  }
  return out;
}

/** Ajoute les rôles manquants pour une équipe donnée dans db.staff (staff-only). */
export function ensureTeamStaffAllRoles(db: { staff?: StaffMember[] }, teamId: string, rngSeed: number) {
  db.staff ??= [];
  for (const role of ROLES_ALL) {
    const exists = db.staff.some((s) => s.teamId === teamId && s.role === role);
    if (!exists) {
      const rng = seededFrom(rngSeed, teamId, role);
      db.staff.push(makeStaff(rng, teamId, role));
    }
  }
}

/** Ajoute les rôles manquants pour TOUTES les équipes. */
export function ensureAllTeamsStaffAllRoles(db: { staff?: StaffMember[] }, teams: TeamLite[], rngSeed: number) {
  for (const t of teams) {
    const tk = teamKeyOf(t);
    if (!tk) continue;
    ensureTeamStaffAllRoles(db, tk, rngSeed);
  }
}

/** Purge le staff d’une équipe puis le régénère (utile pour “reroll”). */
export function reseedTeamStaff(db: { staff?: StaffMember[] }, teamId: string, rngSeed: number) {
  db.staff ??= [];
  db.staff = db.staff.filter((s) => s.teamId !== teamId);
  ensureTeamStaffAllRoles(db, teamId, rngSeed);
}
