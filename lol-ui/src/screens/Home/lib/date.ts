// Helpers calendrier & formatage FR (KST)

export const KST = "Asia/Seoul";

// Renvoie la date de début de saison (ISO string) depuis la save, avec fallback
export function getSeasonStartISO(db: any): string {
  return (
    db?.meta?.calendar?.startISO ||
    db?.meta?.seasonStartISO ||
    "2025-01-15T00:00:00+09:00" // défaut raisonnable
  );
}

// Ajoute N jours à une ISO string et renvoie un Date
export function addDaysISO(iso: string, days: number): Date {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d;
}

// Format long FR pour l’affichage (ex: "mar. 21 janv. 2025")
export function fmtLongFR(d: Date): string {
  const fmt = new Intl.DateTimeFormat("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: KST,
  });
  // On nettoie le point final après l’abréviation du mois si présent (optionnel)
  return fmt.format(d).replaceAll(".", ".").replace("..", ".");
}

// Libellé de la date courante en fonction de (currentWeek, currentDayIndex)
// ⚠️ Ici on cumule les semaines pour éviter de "revenir" dans le temps
export function currentDateLabel(db: any): string {
  const startISO = getSeasonStartISO(db);
  const week = (db?.meta?.currentWeek ?? 1);      // 1-based
  const day  = (db?.meta?.currentDayIndex ?? 0);  // 0..6
  const offset = (week - 1) * 7 + day;            // cumul semaines + jour
  return fmtLongFR(addDaysISO(startISO, offset));
}

// Plage de la semaine (ex: "15 janv – 21 janv 2025")
export function weekRangeLabelFR(startISO: string, weekIdx: number): string {
  const start = addDaysISO(startISO, weekIdx * 7);
  const end   = addDaysISO(startISO, weekIdx * 7 + 6);

  const dFmt = new Intl.DateTimeFormat("fr-FR", {
    day: "numeric", month: "short", timeZone: KST,
  });
  const yFmt = new Intl.DateTimeFormat("fr-FR", { year: "numeric", timeZone: KST });

  const a = dFmt.format(start).replace(".", "");
  const b = dFmt.format(end).replace(".", "");
  return `${a} – ${b} ${yFmt.format(start)}`;
}
