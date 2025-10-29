import { memo, useEffect, useMemo, useState } from "react";
import "../../../styles/staff.css";

// ⬇️ core: types + générateur staff-only
import type { StaffMember, StaffRole } from "@core/db";
import { ensureTeamStaffAllRoles } from "@core/db";

type League = "LCK";
type Team = { id: string; name: string; slug?: string; league?: League };

type DBShape = {
  staff?: StaffMember[];
  teams?: Team[];
  meta?: { rngSeed?: number; league?: League };
};

/* =========================================================
   Helpers
========================================================= */

function isStaffMember(x: any): x is StaffMember {
  return x && typeof x === "object" && typeof x.role === "string" && typeof x.teamId === "string";
}

function byTeamId(list: StaffMember[], teamId: string): StaffMember[] {
  return list.filter((s) => s.teamId === teamId);
}

function fmtSalaryEUR(v?: number) {
  if (typeof v !== "number") return "—";
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v);
}

/** Score 0..100 pondéré par rôle */
function impactScore(m: StaffMember): number {
  const a = m;
  switch (m.role) {
    case "General Manager":
      return Math.round(0.35 * a.leadership + 0.25 * a.communications + 0.2 * a.scouting + 0.2 * a.discipline);
    case "Team Manager":
      return Math.round(0.3 * a.discipline + 0.3 * a.communications + 0.2 * a.leadership + 0.2 * a.motivation);
    case "Head Coach":
      return Math.round(0.3 * a.tactics + 0.2 * a.draft + 0.15 * a.analytics + 0.15 * a.leadership + 0.1 * a.communications + 0.1 * a.discipline);
    case "Assistant Coach":
      return Math.round(0.35 * a.development + 0.2 * a.communications + 0.15 * a.leadership + 0.15 * a.tactics + 0.15 * a.discipline);
    case "Strategic Coach":
      return Math.round(0.4 * a.draft + 0.35 * a.tactics + 0.15 * a.analytics + 0.1 * a.communications);
    case "Analyst":
      return Math.round(0.5 * a.analytics + 0.2 * a.tactics + 0.2 * a.draft + 0.1 * a.communications);
    case "Data Analyst":
      return Math.round(0.55 * a.analytics + 0.15 * a.tactics + 0.15 * a.draft + 0.15 * a.discipline);
    case "Scout":
      return Math.round(0.55 * a.scouting + 0.2 * a.communications + 0.15 * a.draft + 0.1 * a.development);
    case "Performance Coach":
      return Math.round(0.55 * a.physio + 0.2 * a.discipline + 0.15 * a.communications + 0.1 * a.motivation);
    case "Sports Psychologist":
      return Math.round(0.55 * a.motivation + 0.25 * a.communications + 0.2 * a.leadership);
    case "Physiotherapist":
    case "Team Doctor":
      return Math.round(0.65 * a.physio + 0.2 * a.discipline + 0.15 * a.communications);
    case "Head of Youth Development":
      return Math.round(0.55 * a.development + 0.25 * a.scouting + 0.1 * a.leadership + 0.1 * a.discipline);
    case "Academy Coach":
      return Math.round(0.55 * a.development + 0.2 * a.tactics + 0.15 * a.motivation + 0.1 * a.discipline);
    default: {
      const attrs = [a.leadership, a.tactics, a.draft, a.analytics, a.scouting, a.development, a.motivation, a.physio, a.communications, a.discipline];
      return Math.round(attrs.reduce((x, y) => x + y, 0) / attrs.length);
    }
  }
}

function impactTier(v: number) {
  if (v >= 85) return "s4";
  if (v >= 75) return "s3";
  if (v >= 60) return "s2";
  return "s1";
}

function sortByRole(a: StaffMember, b: StaffMember) {
  const order: StaffRole[] = [
    "General Manager",
    "Team Manager",
    "Head Coach",
    "Assistant Coach",
    "Strategic Coach",
    "Analyst",
    "Data Analyst",
    "Scout",
    "Performance Coach",
    "Sports Psychologist",
    "Physiotherapist",
    "Team Doctor",
    "Head of Youth Development",
    "Academy Coach",
  ];
  return order.indexOf(a.role) - order.indexOf(b.role);
}

/* Essaie props puis globale window.__LOL_DB */
function resolveDB(dbProp?: DBShape): DBShape {
  if (dbProp && typeof dbProp === "object") return dbProp;
  // @ts-ignore
  if (typeof window !== "undefined" && window.__LOL_DB && typeof window.__LOL_DB === "object") {
    // @ts-ignore
    return window.__LOL_DB as DBShape;
  }
  return { staff: [], meta: {} };
}

/* =========================================================
   Component
========================================================= */

export default function StaffPage({
  league,
  team,
  db,
  onOpenSearch,
}: {
  league: League;
  team: Team;
  db?: DBShape;
  onOpenSearch?: () => void;
}) {
  const teamKey = String(team?.id ?? team?.slug ?? team?.name ?? "");
  const [staffList, setStaffList] = useState<StaffMember[]>([]);

  // 1) Auto-fill RNG staff-only si l’équipe n’en a pas encore
  useEffect(() => {
    const d = resolveDB(db);
    if (!d.meta) d.meta = {};
    if (!d.meta.rngSeed) d.meta.rngSeed = Date.now();

    if (!teamKey) return;

    const hasForTeam = (d.staff || []).some((s) => s.teamId === teamKey);
    if (!hasForTeam) {
      ensureTeamStaffAllRoles(d as any, teamKey, d.meta.rngSeed);
      if (typeof window !== "undefined") (window as any).__LOL_DB = d; // persiste globalement si utile
    }

    setStaffList(byTeamId((d.staff || []).filter(isStaffMember), teamKey));
  }, [db, teamKey]);

  // 2) Tri pour l’affichage
  const sorted = useMemo(() => [...staffList].sort(sortByRole), [staffList]);

  return (
    <div className="staff-shell">
      <section className="panel kpi">
        <div className="panel-head with-action">
          <span>Staff du club</span>
          <button
            className="btn primary"
            onClick={() => {
              if (onOpenSearch) return onOpenSearch();
              try {
                if (typeof window !== "undefined" && window.location) {
                  window.location.href = "/staff/search";
                  return;
                }
              } catch {}
              alert("Recherche staff (à brancher)");
            }}
          >
            🔎 Recherche staff
          </button>
        </div>

        {sorted.length === 0 ? (
          <div className="muted" style={{ padding: "12px 0" }}>
            Aucun membre trouvé pour cette équipe.
          </div>
        ) : (
          <div className="staff-grid">
            {sorted.map((m) => (
              <StaffCard key={m.id} data={m} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

/* =========================================================
   Card
========================================================= */

const StaffCard = memo(function StaffCard({ data }: { data: StaffMember }) {
  const s = data;
  const score = impactScore(s);
  const tier = impactTier(score);
  const attrs = topAttrsForRole(s);

  return (
    <div className="staff-card">
      <div className="line1">
        <div className="role">{s.role}</div>
        <div className="impact">
          <span className={`badge ${tier}`}>{score}</span>
        </div>
      </div>

      <div className="name-row">
        <div className="name">{s.name}</div>
        <div className="muted">{s.nationality ?? "—"} · {s.age} ans</div>
      </div>

      <div className="attrs">
        {attrs.map(([label, value]) => (
          <div key={label} className="attr-row">
            <span className="attr-label">{label}</span>
            <progress max={100} value={value} />
            <span className="attr-val">{value}</span>
          </div>
        ))}
      </div>

      <div className="contract">
        <span className="muted">Contrat:</span>
        <span>{s.contractYears} an{s.contractYears > 1 ? "s" : ""}</span>
        <span> · {fmtSalaryEUR(s.salaryEUR)}</span>
      </div>
    </div>
  );
});

StaffCard.displayName = "StaffCard";

function topAttrsForRole(s: StaffMember): Array<[string, number]> {
  switch (s.role) {
    case "General Manager":
      return [["Leadership", s.leadership], ["Comm.", s.communications], ["Discipline", s.discipline], ["Scouting", s.scouting]];
    case "Team Manager":
      return [["Discipline", s.discipline], ["Comm.", s.communications], ["Leadership", s.leadership]];
    case "Head Coach":
      return [["Tactics", s.tactics], ["Draft", s.draft], ["Leadership", s.leadership], ["Comm.", s.communications]];
    case "Assistant Coach":
      return [["Development", s.development], ["Comm.", s.communications], ["Discipline", s.discipline]];
    case "Strategic Coach":
      return [["Draft", s.draft], ["Tactics", s.tactics], ["Analytics", s.analytics]];
    case "Analyst":
      return [["Analytics", s.analytics], ["Tactics", s.tactics], ["Draft", s.draft]];
    case "Data Analyst":
      return [["Analytics", s.analytics], ["Discipline", s.discipline], ["Tactics", s.tactics]];
    case "Scout":
      return [["Scouting", s.scouting], ["Draft", s.draft], ["Comm.", s.communications]];
    case "Performance Coach":
      return [["Physio", s.physio], ["Discipline", s.discipline], ["Comm.", s.communications]];
    case "Sports Psychologist":
      return [["Motivation", s.motivation], ["Comm.", s.communications], ["Leadership", s.leadership]];
    case "Physiotherapist":
    case "Team Doctor":
      return [["Physio", s.physio], ["Discipline", s.discipline], ["Comm.", s.communications]];
    case "Head of Youth Development":
      return [["Development", s.development], ["Scouting", s.scouting], ["Discipline", s.discipline]];
    case "Academy Coach":
      return [["Development", s.development], ["Tactics", s.tactics], ["Motivation", s.motivation]];
    default:
      return [["Overall", impactScore(s)]];
  }
}
