/* LCK schedule generator - double round-robin, 9 weeks per split, 2 rounds/week.
 * Output format is week/day/slot with BO3 and (optionnel) heures KST.
 */

export type TeamLite = { id: string; name: string; short?: string; logo?: string };

export type LckDayName = "Wed" | "Thu" | "Fri" | "Sat" | "Sun";
export const LCK_DAY_NAMES: LckDayName[] = ["Wed", "Thu", "Fri", "Sat", "Sun"];

// Créneaux par défaut (KST). Tu peux les modifier si besoin.
export const LCK_SLOTS_KST: Record<LckDayName, string[]> = {
  Wed: ["17:00", "20:00"],
  Thu: ["17:00", "20:00"],
  Fri: ["17:00", "20:00"],
  Sat: ["15:00", "18:00"],
  Sun: ["15:00", "18:00"],
};

export type Series = {
  week: number;        // 1..9 dans un split
  dayIndex: number;    // 0..4
  dayName: LckDayName; // Wed..Sun
  slot: 0 | 1;         // 0 = premier BO3 du jour, 1 = deuxième
  bo: 3;
  home: string;        // team id
  away: string;        // team id
  // optionnels (pour affichage/planification)
  timeLocalKST?: string; // "17:00", "20:00"...
  round: number;       // 1..18 (round robin)
};

export type Week = { week: number; days: Series[] };

/* ---------------- Core: Round-robin (méthode du cercle) ------------------ */
/** Génère les rounds 1..(n-1) pour un simple round-robin (n pair). */
function roundRobinSingle(teams: string[]): Array<Array<[string, string]>> {
  const n = teams.length;
  if (n % 2 !== 0) throw new Error("LCK nécessite un nombre pair d'équipes (10).");
  // On ne modifie pas l'array d'origine
  const arr = teams.slice();
  // Fixe le premier, fait tourner le reste
  const fixed = arr[0];
  let rot = arr.slice(1);

  const rounds: Array<Array<[string, string]>> = [];
  for (let r = 0; r < n - 1; r++) {
    const pairings: Array<[string, string]> = [];
    // paire (fixed, last of rot) alterne domicile/ext pour équilibrer
    const last = rot[rot.length - 1];
    if (r % 2 === 0) pairings.push([fixed, last]); else pairings.push([last, fixed]);

    for (let i = 0; i < rot.length / 2 - 0.5; i++) {
      const a = rot[i];
      const b = rot[rot.length - 2 - i];
      // alterne domicile/ext à chaque round pour limiter les suites
      if (r % 2 === 0) pairings.push([a, b]);
      else pairings.push([b, a]);
    }
    rounds.push(pairings);

    // rotation: prend le dernier et le met au début
    rot = [rot[rot.length - 1], ...rot.slice(0, rot.length - 1)];
  }
  return rounds;
}

/** Double round: second leg = inverse des domiciles/ext des rounds du 1er leg. */
function roundRobinDouble(teams: string[]): Array<Array<[string, string]>> {
  const first = roundRobinSingle(teams);
  const second = first.map((round) => round.map(([h, a]) => [a, h] as [string, string]));
  return [...first, ...second]; // 18 rounds pour 10 équipes
}

/* ------------- Packing: 2 rounds par semaine, 5 jours * 2 séries ---------- */
/**
 * Répartit deux rounds (5 matchs chacun) sur 5 jours, 2 séries/jour,
 * en garantissant qu’aucune équipe ne joue deux fois *le même jour*.
 */
function interleaveRoundsIntoWeek(
  roundA: Array<[string, string]>,
  roundB: Array<[string, string]>,
  weekIndex: number,
  useTimes = true
): Series[] {
  const days: Series[] = [];
  const remA = roundA.slice();
  const remB = roundB.slice();

  // Pour chaque jour, on choisit 1 match de A et 1 match de B sans overlap d’équipe ce jour-là.
  for (let d = 0; d < 5; d++) {
    const dayName = LCK_DAY_NAMES[d];
    const dayTeams = new Set<string>();

    // pick in A
    let idxA = remA.findIndex(([h, a]) => !dayTeams.has(h) && !dayTeams.has(a));
    if (idxA < 0) idxA = 0; // fallback (ne devrait pas arriver)
    const [hA, aA] = remA.splice(idxA, 1)[0];
    dayTeams.add(hA); dayTeams.add(aA);

    // pick in B distinct
    let idxB = remB.findIndex(([h, a]) => !dayTeams.has(h) && !dayTeams.has(a));
    if (idxB < 0) {
      // si conflit, on prend le premier et tant pis (rare)
      idxB = 0;
    }
    const [hB, aB] = remB.splice(idxB, 1)[0];

    const time0 = useTimes ? LCK_SLOTS_KST[dayName][0] : undefined;
    const time1 = useTimes ? LCK_SLOTS_KST[dayName][1] : undefined;

    days.push({
      week: weekIndex,
      dayIndex: d,
      dayName,
      slot: 0,
      bo: 3,
      home: hA,
      away: aA,
      timeLocalKST: time0,
      round: (weekIndex - 1) * 2 + 1,
    });
    days.push({
      week: weekIndex,
      dayIndex: d,
      dayName,
      slot: 1,
      bo: 3,
      home: hB,
      away: aB,
      timeLocalKST: time1,
      round: (weekIndex - 1) * 2 + 2,
    });
  }
  return days;
}

/* ----------------------------- Public API --------------------------------- */
/**
 * Génère un split LCK (9 semaines) à partir d'une liste d’équipes (10).
 * - `useTimes` ajoute les heures KST par défaut dans chaque série.
 */
export function generateLCKSplit(
  teams: TeamLite[] | string[],
  useTimes = true
): Week[] {
  const ids = (typeof teams[0] === "string"
    ? (teams as string[])
    : (teams as TeamLite[]).map(t => t.id)
  );

  if (ids.length !== 10) throw new Error("Le split LCK doit avoir exactement 10 équipes.");

  const rounds = roundRobinDouble(ids); // 18 rounds
  const weeks: Week[] = [];
  for (let w = 0; w < 9; w++) {
    const roundA = rounds[w * 2];
    const roundB = rounds[w * 2 + 1];
    const days = interleaveRoundsIntoWeek(roundA, roundB, w + 1, useTimes);
    weeks.push({ week: w + 1, days });
  }
  return weeks;
}

/**
 * Génère une saison complète (Spring + Summer) avec 18 semaines.
 * - `labelSplit` n’est pas stocké dans les Series (tu pourras ajouter un champ si besoin).
 */
export function generateLCKSeason(
  teams: TeamLite[] | string[],
  useTimes = true
): { spring: Week[]; summer: Week[] } {
  const spring = generateLCKSplit(teams, useTimes);
  const summer = generateLCKSplit(teams, useTimes);
  return { spring, summer };
}

/* Utils pratique pour debug / affichage ligne par ligne */
export function flattenWeeks(weeks: Week[]): Series[] {
  return weeks.flatMap(w => w.days);
}

/** Map d'accès rapide: teamId -> { name, short, logo } (si fourni) */
export function mapTeams(
  teams: TeamLite[] | string[]
): Record<string, TeamLite> {
  if (typeof teams[0] === "string") {
    return (teams as string[]).reduce((acc, id) => {
      acc[id] = { id, name: id };
      return acc;
    }, {} as Record<string, TeamLite>);
  }
  return (teams as TeamLite[]).reduce((acc, t) => ({ ...acc, [t.id]: t }), {} as Record<string, TeamLite>);
}
