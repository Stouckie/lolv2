import { useEffect, useMemo, useState } from "react";
import type { Step1Payload } from "../Home/../NewGame/Step1";
import type { TeamCard } from "../Home/../NewGame/Step3Team";

import "../../styles/hub.css";
import StaffPage from "./pages/Staff";

import Dashboard from "./pages/Dashboard";
import Schedule from "./pages/Schedule";
import Squad from "./pages/Squad";
import PlayerPage from "./pages/Player"; // fiche FM-like
import TacticsPage from "./pages/Tactics";
import SaveBar from "../../ui/SaveBar";
import LogoImg from "../../ui/LogoImg";
import { useGameStore } from "@/state/gameStore";
import type { GameDB } from "@/utils/types";

// composants & helpers
import TopActions from "../Home/components/TopActions";
import { getWeek, getWeekSeriesArray, resolveTodayCalendarSelector } from "../Home/lib/schedule";
import { simulateBo3, applyResultToStandings } from "../Home/lib/sim";

/* =============== Types =============== */

type Tab =
  | "home" | "inbox" | "squad" | "tactics" | "data" | "training"
  | "schedule" | "competitions" | "recruitment" | "transfers" | "club" | "finance" | "u18"
  | "staff" | "player";

type Props = { profile: Step1Payload; league: "LCK"; team: TeamCard };
type Clock = { week: number; dayIndex: number };

/* =============== Utils =============== */

function ensureMeta(db: GameDB) {
  const meta = (db.meta ??= {} as NonNullable<GameDB["meta"]>);
  meta.version ??= 1;
  meta.league ??= "LCK";
  meta.timezone ??= "Asia/Seoul";
  meta.season ??= 1;
  meta.currentWeek ??= 1;
  meta.currentDayIndex ??= 0;
  meta.rngSeed ??= Date.now();
  meta.updatedAt ??= new Date().toISOString();
}

/* =============== Component =============== */

export default function Hub({ profile, league, team }: Props) {
  const [tab, setTab] = useState<Tab>("home");
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);

  const [clock, setClock] = useState<Clock>({ week: 1, dayIndex: 0 });

  const db = useGameStore(state => state.db);
  const status = useGameStore(state => state.status);
  const load = useGameStore(state => state.load);
  const setDb = useGameStore(state => state.setDb);
  const persist = useGameStore(state => state.persist);
  const setContext = useGameStore(state => state.setContext);

  useEffect(() => {
    if (!db && status === "idle") {
      void load();
    }
  }, [db, status, load]);

  useEffect(() => {
    setContext({
      profile: profile ? {
        name: profile.name,
        nationality: profile.nationality,
        autosave: profile.autosave,
        ironman: profile.ironman,
      } : undefined,
      league,
      team: team ? {
        id: team.id,
        name: team.name,
        budgetEUR: team.budgetEUR,
        objective: team.objective,
        stars: team.stars,
        logo: team.logo,
      } : undefined,
    });
  }, [profile, league, team, setContext]);

  useEffect(() => {
    if (!db?.meta) return;
    setClock({
      week: db.meta.currentWeek ?? 1,
      dayIndex: db.meta.currentDayIndex ?? 0,
    });
  }, [db?.meta?.currentWeek, db?.meta?.currentDayIndex]);

  const t = team as TeamCard & { id?: string; logo?: string };
  const logo = t.logo ?? `/logos/lck/${t.id || "default"}.png`;
  const teamName = team?.name || "Équipe";

  // écouteur global : ouvrir l’onglet calendrier depuis Dashboard (ou ailleurs)
  useEffect(() => {
    const handler = (e: any) => {
      setTab("schedule");
      const { week, day } = e.detail || {};
      const params = new URLSearchParams(window.location.search);
      if (week != null) params.set("week", String(week)); // 0-based
      if (day  != null) params.set("day",  String(day));  // 0..6
      window.history.replaceState({}, "", `${window.location.pathname}?${params.toString()}`);
    };
    window.addEventListener("open-schedule", handler as EventListener);
    return () => window.removeEventListener("open-schedule", handler as EventListener);
  }, []);

  // combien de matchs aujourd’hui (dans le jour calendrier courant)
  const todayRemaining = useMemo(() => {
    if (!db) return 0;
    const w = getWeek(db, clock.week);
    const arr = getWeekSeriesArray(w);
    if (!arr.length) return 0;
    const sel = resolveTodayCalendarSelector(db, clock);
    const list = sel.kind === "dayName"
      ? arr.filter((s: any) => (s.dayName ?? "") === sel.value && !s.played && s.score == null)
      : arr.filter((s: any) => (s.dayIndex ?? -1) === sel.value && !s.played && s.score == null);
    return list.length;
  }, [db, clock]);

  /* -------- actions -------- */

  function commitDb(mutator: (draft: GameDB) => void) {
    if (!db) return;
    const draft = db;
    mutator(draft);
    const nextMeta = draft.meta ? { ...draft.meta } : draft.meta;
    const nextDb: GameDB = { ...draft, meta: nextMeta };
    setDb(nextDb);
    void persist({ file: nextDb });
  }

  function persistMeta(mutate: (m: any) => void) {
    if (!db) return;
    commitDb(draft => {
      ensureMeta(draft);
      mutate(draft.meta as NonNullable<GameDB["meta"]>);
      if (draft.meta) {
        draft.meta.updatedAt = new Date().toISOString();
      }
    });
  }

  function advanceOneDayInSave() {
    persistMeta(meta => {
      meta.currentDayIndex = (meta.currentDayIndex ?? 0) + 1;
      if (meta.currentDayIndex >= 7) {
        meta.currentDayIndex = 0;
        meta.currentWeek = (meta.currentWeek ?? 1) + 1;
      }
    });
    setClock(c => {
      const d = c.dayIndex + 1;
      return { week: d >= 7 ? c.week + 1 : c.week, dayIndex: d >= 7 ? 0 : d };
    });
  }

  function playNextMatchOfToday() {
    if (!db) return;
    const w = getWeek(db, clock.week);
    const arr = getWeekSeriesArray(w);
    const sel = resolveTodayCalendarSelector(db, clock);
    const target = sel.kind === "dayName"
      ? arr.find((s: any) => (s.dayName ?? "") === sel.value && !s.played && s.score == null)
      : arr.find((s: any) => (s.dayIndex ?? -1) === sel.value && !s.played && s.score == null);
    if (!target) return;
    const score = simulateBo3();
    target.played = true; target.score = score;
    commitDb(draft => {
      applyResultToStandings(draft, { home: target.home, away: target.away, score });
      if (draft.meta) {
        draft.meta.updatedAt = new Date().toISOString();
      }
    });
  }

  function playAllMatchesOfToday() {
    if (!db) return;
    const w = getWeek(db, clock.week);
    const arr = getWeekSeriesArray(w);
    const sel = resolveTodayCalendarSelector(db, clock);
    const list = sel.kind === "dayName"
      ? arr.filter((s: any) => (s.dayName ?? "") === sel.value && !s.played && s.score == null)
      : arr.filter((s: any) => (s.dayIndex ?? -1) === sel.value && !s.played && s.score == null);
    if (!list.length) return;
    commitDb(draft => {
      for (const m of list) {
        const score = simulateBo3();
        m.played = true; m.score = score;
        applyResultToStandings(draft, { home: m.home, away: m.away, score });
      }
      if (draft.meta) {
        draft.meta.updatedAt = new Date().toISOString();
      }
    });
  }

  // ✅ FIX : avancer au prochain jour AVEC match en mettant à jour (week, dayIndex)
  function advanceToNextMatchDay() {
    if (!db) return;

    let fm = clock.dayIndex + 1;
    let hops = 0;

    let targetWeek = clock.week;
    let targetDay  = clock.dayIndex;

    while (hops < 365) {
      const weekDelta = Math.floor(fm / 7);
      const dayIdx    = fm % 7;

      const w2   = getWeek(db, clock.week + weekDelta);
      const arr2 = getWeekSeriesArray(w2);

      let count = 0;
      if (arr2.length) {
        const names = Array.from(new Set(arr2.map((s: any) => s.dayName).filter(Boolean))) as string[];
        if (names.length) {
          const todayName = names[dayIdx % names.length];
          count = arr2.filter((s: any) => (s.dayName ?? "") === todayName && !s.played && s.score == null).length;
        } else {
          const distinct = Array.from(new Set(arr2.map((s: any) => s.dayIndex ?? 0))).sort((a,b)=>a-b);
          if (distinct.length) {
            const idx = distinct[dayIdx % distinct.length];
            count = arr2.filter((s: any) => (s.dayIndex ?? -1) === idx && !s.played && s.score == null).length;
          }
        }
      }

      if (count > 0) {
        targetWeek = clock.week + weekDelta;
        targetDay  = dayIdx;
        break;
      }

      fm++; hops++;
    }

    setClock({ week: targetWeek, dayIndex: targetDay });
    persistMeta(m => { m.currentWeek = targetWeek; m.currentDayIndex = targetDay; });
  }

  if (!db) return null;

  return (
    <div className="hub-shell">
      <aside className="hub-sidebar">
        <div className="brand">
          <LogoImg id={(t as any)?.id} src={logo} alt={teamName} size={28} />
          <div>
            <div className="brand-name">{teamName}</div>
            <div className="brand-sub">{league}</div>
          </div>
        </div>

        <nav className="side-nav" aria-label="Navigation Hub">
          {([
            ["home","🏠","Page d’accueil"],
            ["inbox","📨","Boîte de réception"],
            ["squad","👥","Effectif"],
            ["tactics","🧩","Tactiques"],
            ["data","📊","Centre de données"],
            ["training","🏋️","Entraînement"],
            ["staff","🧑‍🏫","Staff"],
            ["schedule","🗓️","Calendrier"],
            ["competitions","🏆","Compétitions"],
            ["recruitment","🧲","Recrutement"],
            ["transfers","🔁","Transferts"],
            ["club","🏛️","Infos club"],
            ["finance","💶","Finances"],
            ["u18","🎓","U18"],
          ] as [Tab,string,string][]).map(([key,icon,label]) => (
            <button key={key} className={`side-item ${tab===key?"active":""}`} onClick={()=>setTab(key)}>
              <span className="i">{icon}</span><span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-foot">
          <div className="meta"><span>Patch 14.20</span><span>Solo</span></div>
          <button
            className="btn-accent"
            onClick={() =>
              window.dispatchEvent(
                new CustomEvent("open-schedule", {
                  detail: {
                    week: Math.max(0, (clock.week ?? 1) - 1),           // 0-based
                    day:  Math.max(0, Math.min(6, clock.dayIndex ?? 0)) // 0..6
                  }
                })
              )
            }
          >
            Rencontres
          </button>
        </div>
      </aside>

      <main className="hub-main">
        <header className="hub-topbar">
          <div className="crumbs">
            <span>Hub</span>
            <span className="sep">•</span>
            <strong>
              {tab === "home"      ? "Page d’accueil" :
               tab === "schedule"  ? "Calendrier"     :
               tab === "squad"     ? "Effectif"       :
               tab === "tactics"   ? "Tactiques"      :
               tab === "staff"     ? "Staff"          :
               tab === "player"    ? "Fiche joueur"   :
               tab}
            </strong>
          </div>

          <TopActions
            db={db}
            clock={clock}
            todayRemaining={todayRemaining}
            onContinue={advanceOneDayInSave}
            onPlayNext={playNextMatchOfToday}
            onSimulateToday={playAllMatchesOfToday}
            onNextMatchDay={advanceToNextMatchDay}
            rightExtra={
              <details className="menu">
                <summary className="btn-accent" aria-label="Sauvegarde">☰ Sauvegarde</summary>
                <div className="menu-popover">
                  <SaveBar context={{ profile, league, team: t }} />
                </div>
              </details>
            }
          />
        </header>

        {tab === "home" && <Dashboard profile={profile} league={league} team={t} />}
        {tab === "schedule" && <Schedule league={league} team={t} />}

        {tab === "squad" && (
          <section className="panel">
            <Squad
              league={league}
              team={t}
              onOpenPlayer={(id: string) => { setSelectedPlayerId(id); setTab("player"); }}
            />
          </section>
        )}

        {tab === "tactics" && (
          <section className="panel">
            <TacticsPage league={league} team={t} />
          </section>
        )}

        {tab === "staff" && (
          <section className="panel">
            <StaffPage league={league} team={t} />
          </section>
        )}

        {tab === "player" && selectedPlayerId && (
          <PlayerPage playerId={selectedPlayerId} onBack={() => setTab("squad")} />
        )}

        {tab !== "home" && tab !== "schedule" && tab !== "squad" && tab !== "player" && tab !== "tactics" && tab !== "staff" && (
          <section className="panel placeholder">
            <h3>{tabLabel(tab)}</h3>
            <p className="muted">Page à venir.</p>
          </section>
        )}
      </main>
    </div>
  );
}

/* ===== helpers UI ===== */

function tabLabel(t: Tab) {
  return (
    {
      home: "Page d’accueil",
      inbox: "Boîte de réception",
      squad: "Effectif",
      tactics: "Tactiques",
      staff: "Staff",
      data: "Centre de données",
      training: "Entraînement",
      schedule: "Calendrier",
      competitions: "Compétitions",
      recruitment: "Recrutement",
      transfers: "Transferts",
      club: "Infos club",
      finance: "Finances",
      u18: "U18",
      player: "Fiche joueur",
    } as Record<string, string>
  )[t];
}
