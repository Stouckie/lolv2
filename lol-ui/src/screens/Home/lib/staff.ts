import type { RNG } from "./rng";
import { seededFrom, pick, randInt, randNorm, clamp } from "./rng";
/* ========= Rôles couverts =========
   Management :   General Manager, Team Manager
   Coaching  :    Head Coach, Assistant Coach, Strategic Coach, Academy Coach, Head of Youth Development
   Analyse   :    Analyst, Data Analyst, Scout
   Perf/Santé:    Performance Coach, Sports Psychologist, Physiotherapist, Team Doctor
*/

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

export type Nationality = "KR";

export type StaffMember = {
  id: string;
  teamId: string;
  name: string;
  nationality: Nationality;    // toujours "KR" ici
  age: number;
  role: StaffRole;
  contractYears: number;       // 1..3
  salaryEUR: number;

  // Attributs principaux (0..100)
  leadership: number;          // management
  tactics: number;             // coaching/stratégie
  draft: number;               // lecture de meta/draft
  analytics: number;           // data/vidéo
  scouting: number;            // repérage de talents
  development: number;         // progression joueurs/academy
  motivation: number;          // mental / psychologie
  physio: number;              // santé / blessures / récupération
  communications: number;      // FR/EN/KR etc. (ici abstrait)
  discipline: number;          // rigueur, respect des process
};

// ===== Noms coréens simples (placeholder) =====
const KR_GIVEN = [
  "Minjun","Seojun","Ha-joon","Ji-ho","Joon-woo","Seung-min","Ji-hoon","Do-yoon","Si-woo","Jae-won",
  "Seo-yeon","Ji-woo","Ha-yun","Seo-jun","Ye-jun","Yun-seo","Soo-min","Hyeon-seo","Ji-yoon","Min-seo",
];

const KR_LAST = [
  "Kim","Lee","Park","Choi","Jung","Kang","Cho","Yoon","Jang","Lim","Han","Oh","Seo","Shin","Kwon","Hwang","Ahn","Song","Hong","Yu"
];

const ROLES_ALL: StaffRole[] = [
  "General Manager","Team Manager",
  "Head Coach","Assistant Coach","Strategic Coach",
  "Analyst","Data Analyst","Scout",
  "Performance Coach","Sports Psychologist","Physiotherapist","Team Doctor",
  "Head of Youth Development","Academy Coach",
];

/* ====== Biais d’attributs par rôle (moyennes ciblées) ====== */
const ROLE_BIAS: Record<StaffRole, Partial<Record<keyof StaffMember, number>>> = {
  "General Manager": {
    leadership: 78, communications: 68, discipline: 72, scouting: 62, analytics: 55,
  },
  "Team Manager": {
    leadership: 65, communications: 70, discipline: 75, motivation: 60,
  },
  "Head Coach": {
    leadership: 72, tactics: 78, draft: 76, analytics: 66, motivation: 68, discipline: 70,
  },
  "Assistant Coach": {
    leadership: 58, tactics: 72, draft: 70, analytics: 64, motivation: 62,
  },
  "Strategic Coach": {
    tactics: 80, draft: 82, analytics: 72, leadership: 55, communications: 58,
  },
  "Analyst": {
    analytics: 82, tactics: 66, draft: 62, communications: 58, discipline: 60,
  },
  "Data Analyst": {
    analytics: 85, tactics: 60, draft: 60, communications: 55, discipline: 62,
  },
  "Scout": {
    scouting: 80, development: 68, communications: 58, leadership: 50,
  },
  "Performance Coach": {
    physio: 75, motivation: 72, discipline: 70, communications: 60,
  },
  "Sports Psychologist": {
    motivation: 82, communications: 72, leadership: 60, discipline: 58,
  },
  "Physiotherapist": {
    physio: 85, discipline: 70, communications: 58,
  },
  "Team Doctor": {
    physio: 88, discipline: 72, communications: 60,
  },
  "Head of Youth Development": {
    development: 82, scouting: 72, leadership: 60, discipline: 62,
  },
  "Academy Coach": {
    development: 78, tactics: 62, motivation: 64, discipline: 60,
  },
};

// ===== Helpers =====

function xid(rng: RNG): string {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  return Array.from({length:6}, ()=> alphabet[Math.floor(rng.next()*alphabet.length)]).join("");
}

/* ====== Génération d’un membre ====== */

function biasOf(role: StaffRole, key: keyof StaffMember) {
  const v = ROLE_BIAS[role]?.[key];
  return typeof v === "number" ? v : undefined;
}

function attr(rng: RNG, mean: number, spread = 10) {
  return clamp(randNorm(rng, mean, spread), 20, 95);
}

function nameKR(rng: RNG) {
  const last = pick(rng, KR_LAST);
  const first = pick(rng, KR_GIVEN);
  return `${last} ${first}`;
}

function randomSalaryEUR(role: StaffRole, qualityAvg: number): number {
  // échelle bête pour commencer
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
  const mult = 0.8 + (qualityAvg / 100) * 0.8; // ~0.8..1.6
  const noise = 0.85 + Math.random() * 0.3;
  return Math.round(base[role] * mult * noise);
}

export function makeStaff(rng: RNG, teamId: string, role: StaffRole): StaffMember {
  const id = `staff_${teamId}_${role.replace(/\s+/g, "_").toLowerCase()}_${xid(rng)}`;
  const name = nameKR(rng);
  const age = clamp(randInt(rng, 24, 58), 24, 64);
  const contractYears = clamp(randInt(rng, 1, 3), 1, 4);

  // Attributs (partent des biais, puis bruit)
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
  const salaryEUR = randomSalaryEUR(role, qualityAvg);

  const m: StaffMember = {
    id,
    teamId,
    name,
    nationality: "KR",
    age,
    role,
    contractYears,
    salaryEUR,
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
  return m;
}

/** Génère un staff coréen “logique” pour une équipe: tous les rôles principaux. */
export function generateKoreanTeamStaff(db: any, teamId: string) {
  db.staff ??= [];
  const roles: StaffRole[] = ROLES_ALL;
  const seedBase = db?.meta?.rngSeed ?? Date.now();

  for (const role of roles) {
    // évite doublons
    const exists = db.staff.some((s: StaffMember) => s.teamId === teamId && s.role === role);
    if (exists) continue;

    const rng = seededFrom(seedBase, teamId, role);
    db.staff.push(makeStaff(rng, teamId, role));
  }
}

/** Génère/complète les rôles manquants pour toutes les équipes d’une ligue (par défaut LCK). */
export function ensureLeagueStaffAllRoles(db: any) {
  db.staff ??= [];
  const leagueId = db?.meta?.league ?? "LCK";
  const teams = (db?.teams || []).filter((t: any) => (t.league ?? leagueId) === leagueId);

  for (const t of teams) {
    for (const role of ROLES_ALL) {
      const exists = db.staff.some((s: StaffMember) => s.teamId === (t.id ?? t.slug ?? t.name) && s.role === role);
      if (exists) continue;
      const rng = seededFrom(db?.meta?.rngSeed ?? Date.now(), t.id ?? t.slug ?? t.name, role);
      db.staff.push(makeStaff(rng, t.id ?? t.slug ?? t.name, role));
    }
  }
}

/** Génère/complète tous les rôles pour une équipe précise. */
export function ensureKoreanTeamStaffAllRoles(db: any, teamId: string) {
  db.staff ??= [];
  for (const role of ROLES_ALL) {
    const exists = db.staff.some((s: StaffMember) => s.teamId === teamId && s.role === role);
    if (!exists) {
      const rng = seededFrom(db?.meta?.rngSeed ?? Date.now(), teamId, role);
      db.staff.push(makeStaff(rng, teamId, role));
    }
  }
}
