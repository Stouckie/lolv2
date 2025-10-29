import { useEffect, useMemo, useState } from "react";
import "../../../styles/Schedule.css";
import type { TeamCard } from "../../Home/../NewGame/Step3Team";
import { useGameStore } from "@/state/gameStore";
import { weeks as getWeeks, getWeek, getWeekSeriesArray } from "../../Home/lib/schedule";

export default function SchedulePage({ league, team }: { league: "LCK"; team: TeamCard }) {
  const db = useGameStore(state => state.db);

  // paramètres passés par Hub (event "open-schedule")
  const params = new URLSearchParams(window.location.search);
  const qWeek = params.get("week");
  const qDay = params.get("day"); // 0..6

  const allWeeks = useMemo(() => (db ? getWeeks(db) : []), [db]);
  const weeksCount = Math.max(allWeeks.length, 1);

  const [weekIndex, setWeekIndex] = useState(() => {
    const n = Number(qWeek);
    return Number.isFinite(n) && n >= 0 ? Math.min(n, weeksCount - 1) : 0;
  });

  const weekNum = (allWeeks[weekIndex]?.week ?? allWeeks[weekIndex]?.index ?? weekIndex + 1) as number;
  const week = db ? getWeek(db, weekNum) : null;

  // construit les 7 colonnes (Lun..Dim) avec leurs matchs
  const days = useMemo(() => {
    const arr = week ? getWeekSeriesArray(week) : [];
    const buckets: Record<number, any[]> = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
    for (const s of arr) buckets[(s.dayIndex ?? 0) % 7].push(s);
    for (const k of Object.keys(buckets)) buckets[+k].sort((a, b) => (a.slot ?? 0) - (b.slot ?? 0));
    return buckets;
  }, [weekIndex, db, week]);

  // 1) Suivre automatiquement la semaine courante de la save
  useEffect(() => {
    if (!db) return;
    const metaWeek0 = Math.max(0, (db.meta?.currentWeek ?? 1) - 1); // 0-based
    const desired = Math.min(Math.max(0, metaWeek0), weeksCount - 1);
    setWeekIndex(desired);
  }, [db?.meta?.currentWeek, weeksCount]);

  // 2) Mettre à jour l’URL avec (semaine, jour) courants
  useEffect(() => {
    if (!db) return;
    const params = new URLSearchParams(window.location.search);
    params.set("week", String(Math.max(0, (db.meta?.currentWeek ?? 1) - 1)));
    params.set("day", String(Math.max(0, Math.min(6, db.meta?.currentDayIndex ?? 0))));
    window.history.replaceState({}, "", `${window.location.pathname}?${params.toString()}`);
  }, [db?.meta?.currentWeek, db?.meta?.currentDayIndex]);

  // 3) Focus visuel sur le jour courant (même sans qWeek/qDay initiaux)
  useEffect(() => {
    if (!db) return;
    const id = `day-${db.meta?.currentWeek ?? 1}-${db.meta?.currentDayIndex ?? 0}`;
    setTimeout(() => {
      const el = document.getElementById(id);
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("focus");
      setTimeout(() => el.classList.remove("focus"), 1200);
    }, 0);
  }, [db?.meta?.currentWeek, db?.meta?.currentDayIndex, weekIndex]);

  // focus initial si qWeek/qDay fournis
  useEffect(() => {
    if (qWeek !== null && qDay !== null) {
      const id = `day-${Number(qWeek) + 1}-${Number(qDay)}`;
      setTimeout(() => {
        const el = document.getElementById(id);
        if (!el) return;
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("focus");
        setTimeout(() => el.classList.remove("focus"), 1200);
      }, 0);
    }
  }, []); // une fois

  const names = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

  if (!db) return null;

  return (
    <section className="schedule">
      <div className="schedule-toolbar">
        <div className="left">
          <button className="btn" onClick={() => setWeekIndex(w => Math.max(0, w - 1))}>◀</button>
          <div className="pill">Semaine {weekNum}</div>
          <button className="btn" onClick={() => setWeekIndex(w => Math.min(weeksCount - 1, w + 1))}>▶</button>
        </div>
        <div className="right">
          <div className="pill">{weekIndex + 1} / {weeksCount}</div>
        </div>
      </div>

      <div className="week-grid">
        {Array.from({ length: 7 }, (_, di) => (
          <div className="day" id={`day-${weekNum}-${di}`} key={di}>
            <div className="day-head">{names[di]}</div>

            {days[di].length === 0 ? (
              <div className="muted small">—</div>
            ) : (
              days[di].map((s: any, i: number) => (
                <div className={`match-card ${s.played ? "played" : "pending"}`} key={i}>
                  <div className="row">
                    <span className="pill">BO{s.bo ?? 1}</span>
                    <span className="pill">{s.timeLocalKST ?? s.startTime ?? "—"} KST</span>
                    {!s.played && <span className="pill">à jouer</span>}
                    {s.played && s.score && (
                      <span className="pill strong">{s.score[0]}–{s.score[1]}</span>
                    )}
                  </div>
                  <div className="teams">
                    <span className="t">{nameOf(db, s.home)}</span>
                    <span className="vs">vs</span>
                    <span className="t">{nameOf(db, s.away)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function nameOf(db: any, id: string) {
  return (db?.teams || []).find((t: any) => t.id === id || t.slug === id)?.name ?? id;
}
