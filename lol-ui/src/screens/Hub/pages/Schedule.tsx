import { useMemo, useState } from "react";
import "./schedule.css";
import type { TeamCard } from "../../NewGame/Step3Team";
import { type Week, type Series, LCK_DAY_NAMES, mapTeams } from "../../../lib/lckSchedule";
import { LCK_TEAMS } from "../../../data/lck";

type TeamExtra = { id?: string; logo?: string; name?: string };
type Props = { league: "LCK"; team: TeamCard & TeamExtra };

/* --------- helpers debug --------- */
function safeParse(raw: string | null) {
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}
function findScheduleIn(obj: any): Week[] | null {
  if (!obj || typeof obj !== "object") return null;
  if (Array.isArray(obj?.state?.schedule)) return obj.state.schedule as Week[];
  if (Array.isArray(obj?.schedule)) return obj.schedule as Week[];
  return null;
}

export default function SchedulePage({ league, team }: Props) {
  const teamsMap = useMemo(() => mapTeams(LCK_TEAMS), []);
  const [week, setWeek] = useState(1);

  const schedule = useMemo<Week[] | null>(() => {
    console.groupCollapsed("%c[SchedulePage] Load schedule", "color:#7ea2ff");
    const allKeys = Object.keys(localStorage || {});
    console.log("localStorage keys:", allKeys);

    // Ordre de priorité des clés connues
    const priorityKeys = ["lolm2:slot-1", "slot-1", "lolm2:save:auto"];

    // 1) Essaye les clés prioritaires
    for (const k of priorityKeys) {
      const parsed = safeParse(localStorage.getItem(k));
      const sched = findScheduleIn(parsed);
      console.log(`try key='${k}' →`, parsed ? (sched ? "FOUND schedule" : "no schedule") : "no value");
      if (sched) {
        console.log(`→ using key '${k}', weeks=`, sched.length);
        if (sched[0]) console.log("week[0].days length =", sched[0].days.length);
        console.groupEnd();
        return sched;
      }
    }

    // 2) Sinon, on scanne toutes les clés
    for (const k of allKeys) {
      const parsed = safeParse(localStorage.getItem(k));
      const sched = findScheduleIn(parsed);
      if (sched) {
        console.log(`FOUND schedule at key='${k}', weeks=`, sched.length);
        console.groupEnd();
        return sched;
      }
    }

    console.warn("No schedule found in any key.");
    console.groupEnd();
    return null;
  }, []);

  const weeksCount = schedule?.length ?? 0;
  const safeWeek = Math.min(Math.max(week, 1), Math.max(weeksCount, 1));
  const currentWeek = schedule?.[safeWeek - 1] ?? null;

  return (
    <section className="sched-root">
      <div className="sched-head">
        <h3>Calendrier — {league}</h3>

        <div className="sched-controls">
          <button className="btn" onClick={() => setWeek(w => Math.max(1, w - 1))} disabled={safeWeek <= 1}>
            ◀ Semaine {Math.max(1, safeWeek - 1)}
          </button>
          <select
            className="sel"
            value={safeWeek}
            onChange={(e) => setWeek(parseInt(e.target.value, 10))}
            disabled={!weeksCount}
          >
            {Array.from({ length: weeksCount || 1 }, (_, i) => (
              <option key={i + 1} value={i + 1}>Semaine {i + 1}</option>
            ))}
          </select>
          <button className="btn" onClick={() => setWeek(w => Math.min(weeksCount || 1, w + 1))} disabled={safeWeek >= (weeksCount || 1)}>
            Semaine {Math.min(weeksCount || 1, safeWeek + 1)} ▶
          </button>
        </div>
      </div>

      {!schedule && (
        <div className="panel empty">
          <p className="muted">Aucun calendrier trouvé. Ouvre la console (F12) → onglet <b>Console</b> pour voir les logs “SchedulePage”.</p>
          <p className="muted small">Astuce: lance une nouvelle partie pour (re)générer le split LCK.</p>
        </div>
      )}

      {schedule && currentWeek && (
        <WeekView
          week={currentWeek}
          myTeamId={(team as any)?.id}
          teamsMap={teamsMap}
        />
      )}
    </section>
  );
}

/* ----------------- Week View ----------------- */
function WeekView({ week, myTeamId, teamsMap }: {
  week: Week;
  myTeamId?: string;
  teamsMap: Record<string, { id: string; name: string; short?: string; logo?: string }>;
}) {
  const days = useMemo(() => {
    const arr = [...week.days].sort((a, b) =>
      a.dayIndex === b.dayIndex ? a.slot - b.slot : a.dayIndex - b.dayIndex
    );
    const groups: Record<number, Series[]> = {};
    for (const s of arr) {
      if (!groups[s.dayIndex]) groups[s.dayIndex] = [];
      groups[s.dayIndex].push(s);
    }
    console.log("[WeekView] week", week.week, "days breakdown:", Object.fromEntries(
      Object.entries(groups).map(([k,v])=>[k,v.length])
    ));
    return groups;
  }, [week]);

  return (
    <div className="days-grid">
      {LCK_DAY_NAMES.map((dn, di) => (
        <div key={dn} className="day-card">
          <div className="day-head">
            <span className="dname">{dayNameFR(dn)}</span>
            <span className="dsub">Semaine {week.week}</span>
          </div>

          <div className="series-list">
            {(days[di] ?? []).map((s) => {
              const H = teamsMap[s.home] ?? { id: s.home, name: s.home };
              const A = teamsMap[s.away] ?? { id: s.away, name: s.away };
              const my = (id?: string) => (id && myTeamId && id === myTeamId ? " my" : "");
              return (
                <div key={`${s.dayIndex}-${s.slot}-${s.home}-${s.away}`} className="series">
                  <div className={`team${my(H.id)}`}>
                    <img src={H.logo || "/logos/lck/default.png"} alt={H.name} />
                    <span className="name">{H.name}</span>
                  </div>
                  <div className="mid">
                    <span className="bo">BO{s.bo}</span>
                    <span className="sep">•</span>
                    <span className="time">{s.timeLocalKST ?? "—:—"} KST</span>
                  </div>
                  <div className={`team${my(A.id)}`}>
                    <img src={A.logo || "/logos/lck/default.png"} alt={A.name} />
                    <span className="name">{A.name}</span>
                  </div>
                </div>
              );
            })}

            {(days[di]?.length ?? 0) === 0 && (
              <div className="muted small">Aucune série ce jour.</div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ----------------- Utils ----------------- */
function dayNameFR(dn: "Wed" | "Thu" | "Fri" | "Sat" | "Sun") {
  switch (dn) {
    case "Wed": return "Mercredi";
    case "Thu": return "Jeudi";
    case "Fri": return "Vendredi";
    case "Sat": return "Samedi";
    case "Sun": return "Dimanche";
  }
}
