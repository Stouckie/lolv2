// Recherche staff — UI cartes + filtres + agents libres
// Bouton Accueil → priorité: revenir en arrière si on vient du Hub, sinon aller sur /hub

import { useEffect, useMemo, useState } from "react";
import type { StaffMember, StaffRole } from "@core/db";
import { ensureAllTeamsStaffAllRoles, ROLES_ALL, makeStaff } from "@core/db";
import { seededFrom } from "@core/lib/rng";
import { useNavigate } from "react-router-dom";
import "../../styles/staff-search.css";

type League = "LCK";
type Team = { id: string; name: string; slug?: string; league?: League };

type DBShape = {
  staff?: StaffMember[];
  teams?: Team[];
  meta?: { rngSeed?: number; league?: League; homeUrl?: string };
};

const LCK_TEAMS_FALLBACK: Team[] = [
  { id: "T1",  name: "T1",                  slug: "t1",     league: "LCK" },
  { id: "GEN", name: "Gen.G",               slug: "gen-g",  league: "LCK" },
  { id: "KT",  name: "KT Rolster",          slug: "kt",     league: "LCK" },
  { id: "HLE", name: "Hanwha Life Esports", slug: "hanwha", league: "LCK" },
  { id: "DK",  name: "Dplus KIA",           slug: "dk",     league: "LCK" },
  { id: "DRX", name: "DRX",                 slug: "drx",    league: "LCK" },
  { id: "KDF", name: "Kwangdong Freecs",    slug: "kdf",    league: "LCK" },
  { id: "NS",  name: "Nongshim RedForce",   slug: "ns",     league: "LCK" },
  { id: "BRO", name: "OKSavingsBank BRION", slug: "bro",    league: "LCK" },
  { id: "LSB", name: "Liiv SANDBOX",        slug: "lsb",    league: "LCK" },
];

function resolveDB(dbProp?: DBShape): DBShape {
  if (dbProp && typeof dbProp === "object") return dbProp;
  if (typeof window !== "undefined" && (window as any).__LOL_DB) {
    return (window as any).__LOL_DB as DBShape;
  }
  return { staff: [], teams: [], meta: {} };
}

/** Accueil par défaut = /hub (si DB chargée), sinon fallback /web */
function computeHomeTarget(db: DBShape): string {
  // si on a une DB avec des équipes, le Hub est possible
  if (db?.teams && db.teams.length) return "/hub";
  // sinon, autorise override via meta / globals / env, puis /web
  const metaHome = db?.meta && typeof (db.meta as any).homeUrl === "string" ? (db.meta as any).homeUrl as string : "";
  if (metaHome) return metaHome;
  const globalHome = typeof window !== "undefined" && typeof (window as any).__LOL_WEB_HOME === "string"
    ? ((window as any).__LOL_WEB_HOME as string) : "";
  if (globalHome) return globalHome;
  let envHome = "";
  try {
    // @ts-ignore
    envHome = ((import.meta as any)?.env?.VITE_WEB_HOME as string) || "";
  } catch {}
  if (envHome) return envHome;
  return "/web";
}

function isStaffMember(x: any): x is StaffMember {
  return x && typeof x === "object" && typeof x.role === "string" && typeof x.teamId === "string";
}

function fmtSalaryEUR(v?: number) {
  if (typeof v !== "number") return "—";
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v);
}

function impactScore(m: StaffMember): number {
  const a = m;
  switch (m.role) {
    case "General Manager":      return Math.round(0.35*a.leadership + 0.25*a.communications + 0.20*a.scouting + 0.20*a.discipline);
    case "Team Manager":         return Math.round(0.30*a.discipline + 0.30*a.communications + 0.20*a.leadership + 0.20*a.motivation);
    case "Head Coach":           return Math.round(0.30*a.tactics + 0.20*a.draft + 0.15*a.analytics + 0.15*a.leadership + 0.10*a.communications + 0.10*a.discipline);
    case "Assistant Coach":      return Math.round(0.35*a.development + 0.20*a.communications + 0.15*a.leadership + 0.15*a.tactics + 0.15*a.discipline);
    case "Strategic Coach":      return Math.round(0.40*a.draft + 0.35*a.tactics + 0.15*a.analytics + 0.10*a.communications);
    case "Analyst":              return Math.round(0.50*a.analytics + 0.20*a.tactics + 0.20*a.draft + 0.10*a.communications);
    case "Data Analyst":         return Math.round(0.55*a.analytics + 0.15*a.tactics + 0.15*a.draft + 0.15*a.discipline);
    case "Scout":                return Math.round(0.55*a.scouting + 0.20*a.communications + 0.15*a.draft + 0.10*a.development);
    case "Performance Coach":    return Math.round(0.55*a.physio + 0.20*a.discipline + 0.15*a.communications + 0.10*a.motivation);
    case "Sports Psychologist":  return Math.round(0.55*a.motivation + 0.25*a.communications + 0.20*a.leadership);
    case "Physiotherapist":
    case "Team Doctor":          return Math.round(0.65*a.physio + 0.20*a.discipline + 0.15*a.communications);
    case "Head of Youth Development": return Math.round(0.55*a.development + 0.25*a.scouting + 0.10*a.leadership + 0.10*a.discipline);
    case "Academy Coach":        return Math.round(0.55*a.development + 0.20*a.tactics + 0.15*a.motivation + 0.10*a.discipline);
    default: {
      const attrs = [a.leadership,a.tactics,a.draft,a.analytics,a.scouting,a.development,a.motivation,a.physio,a.communications,a.discipline];
      return Math.round(attrs.reduce((x,y)=>x+y,0)/attrs.length);
    }
  }
}

function teamById(db: DBShape, id?: string) {
  if (!id) return undefined;
  return (db.teams || []).find((t) => t.id === id || t.slug === id || t.name === id);
}

function teamLogoUrl(teamId?: string) {
  if (!teamId) return undefined;
  return `/logos/${teamId}.png`;
}

function initials(name: string) {
  const parts = name.split(" ").filter(Boolean);
  const [a, b] = [parts[0]?.[0], parts[1]?.[0]];
  return (a ? a.toUpperCase() : "") + (b ? b.toUpperCase() : "");
}

function ensureFreeAgents(db: DBShape, rngSeed: number, perRole = 3) {
  db.staff ??= [];
  const alreadyHasFree =
    db.staff.some(s => !teamById(db, s.teamId)) || db.staff.some(s => s.teamId === "" || s.teamId === "FA");
  if (alreadyHasFree) return;

  for (const role of ROLES_ALL) {
    for (let i = 0; i < perRole; i++) {
      const rng = seededFrom(rngSeed, "FA", role, i);
      const m = makeStaff(rng as any, "", role);
      db.staff.push(m);
    }
  }
}

function StaffCard({ db, m }: { db: DBShape; m: StaffMember }) {
  const score = impactScore(m);
  const team = teamById(db, m.teamId);
  const logo = team ? teamLogoUrl(team.id) : undefined;
  const free = !team;

  return (
    <div className="card">
      <div className="left">
        {logo ? (
          <img className="logo" src={logo} alt={team?.name || m.teamId}
               onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")} />
        ) : (
          <div className="avatar">{initials(m.name)}</div>
        )}
      </div>

      <div className="mid">
        <div className="toprow">
          <span className="name">{m.name}</span>
          <span className="role">{m.role}</span>
          {free ? <span className="pill free">Libre</span> : <span className="pill team">{team?.name}</span>}
        </div>
        <div className="meta">
          <span>{m.nationality ?? "—"} · {m.age} ans</span>
          <span className="dot">•</span>
          <span>Contrat: {m.contractYears} an{m.contractYears > 1 ? "s" : ""}</span>
          <span className="dot">•</span>
          <span>{fmtSalaryEUR(m.salaryEUR)}</span>
        </div>
      </div>

      <div className="right">
        <div className={`score ${score >= 85 ? "s4" : score >= 75 ? "s3" : score >= 60 ? "s2" : "s1"}`}>{score}</div>
      </div>
    </div>
  );
}

export default function StaffSearchScreen({ db: dbProp }: { db?: DBShape }) {
  const navigate = useNavigate();
  const [db, setDb] = useState<DBShape>(() => resolveDB(dbProp));

  useEffect(() => {
    const d = resolveDB(dbProp);
    if (!d.meta) d.meta = {};
    if (!d.meta.rngSeed) d.meta.rngSeed = Date.now();

    if (!Array.isArray(d.teams) || d.teams.length === 0) {
      d.teams = LCK_TEAMS_FALLBACK.slice();
      d.meta.league = "LCK";
    }
    if (!Array.isArray(d.staff) || d.staff.length === 0) {
      ensureAllTeamsStaffAllRoles(d as any, d.teams!, d.meta.rngSeed);
    }
    ensureFreeAgents(d, d.meta.rngSeed, 3);

    if (typeof window !== "undefined") (window as any).__LOL_DB = d;
    setDb({ ...d });
  }, [dbProp]);

  // Filtres
  const [q, setQ] = useState("");
  const [role, setRole] = useState<StaffRole | "">("");
  const [assign, setAssign] = useState<"all" | "assigned" | "free">("all");
  const [minScore, setMinScore] = useState(0);

  const list = useMemo(() => {
    const src = (db.staff || []).filter(isStaffMember);
    const filtered = src.filter((m) => {
      if (q) {
        const s = q.toLowerCase();
        const hit = m.name.toLowerCase().includes(s) || m.role.toLowerCase().includes(s);
        if (!hit) return false;
      }
      if (role && m.role !== role) return false;
      const score = impactScore(m);
      if (score < minScore) return false;

      const hasTeam = Boolean(teamById(db, m.teamId));
      if (assign === "assigned" && !hasTeam) return false;
      if (assign === "free" && hasTeam) return false;
      return true;
    });

    filtered.sort((a, b) => {
      const da = impactScore(a);
      const dbs = impactScore(b);
      if (dbs !== da) return dbs - da;
      return a.name.localeCompare(b.name);
    });

    return filtered;
  }, [db, q, role, assign, minScore]);

  const goHome = () => {
    // si on vient du Hub (ou d'une page interne), retour arrière natif
    const ref = typeof document !== "undefined" ? document.referrer : "";
    if (ref) {
      try {
        const u = new URL(ref);
        if (u.origin === window.location.origin && !/\/staff\/search/i.test(u.pathname)) {
          window.history.back();
          return;
        }
      } catch {}
    }
    // sinon cible calculée (priorité Hub)
    const target = computeHomeTarget(db);
    if (/^https?:\/\//i.test(target)) window.location.assign(target);
    else navigate(target);
  };

  return (
    <div className="sr">
      <div className="sr-topbar">
        <button className="btn-home" onClick={goHome} title="Retour à l'accueil">
          🏠 Accueil
        </button>
        <h1>Recherche staff</h1>
      </div>

      <div className="filters">
        <input className="input" placeholder="Rechercher par nom ou rôle…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="select" value={role} onChange={(e) => setRole((e.target.value || "") as any)}>
          <option value="">Tous rôles</option>
          {ROLES_ALL.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <select className="select" value={assign} onChange={(e) => setAssign(e.target.value as any)}>
          <option value="all">Tous</option>
          <option value="assigned">Avec équipe</option>
          <option value="free">Sans équipe</option>
        </select>
        <label className="range">
          Note min: <b>{minScore}</b>
          <input type="range" min={0} max={100} step={5} value={minScore} onChange={(e) => setMinScore(parseInt(e.target.value, 10))} />
        </label>
      </div>

      <div className="grid">
        {list.map((m) => <StaffCard key={m.id} db={db} m={m} />)}
        {list.length === 0 && <div className="empty">Aucun résultat.</div>}
      </div>
    </div>
  );
}
