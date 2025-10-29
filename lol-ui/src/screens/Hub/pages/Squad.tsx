import { useMemo, useState } from "react";
import "../../../styles/squad.css";

// 🔧 Ajuste cet import si besoin (ex: "lol-core/dist/src/data/lck")
import { LCK_PLAYERS_2025 } from "@core/data/lck";

type Role = "TOP" | "JGL" | "MID" | "ADC" | "SUP";

type PlayerRow = {
  id: string; teamId: string; name: string;
  role: Role;
  age: number;
  ovr: number; pot: number;
  lane: number; mech: number; macro: number; champPool: number;
  wagePerDay?: number; contractEnd?: string;
  morale: number; fitness: number; form: number;
};

type Save = { team: { id: string; name: string }; players: PlayerRow[] };

function loadState(): Save | null {
  try { return JSON.parse(localStorage.getItem("lolm2:save:auto") || "null"); }
  catch { return null; }
}

/* ---------- helpers matching ---------- */

const ROLE_ORDER: Role[] = ["TOP","JGL","MID","ADC","SUP"];
const ROLE_LABEL: Record<Role, string> = { TOP:"Top", JGL:"Jungle", MID:"Mid", ADC:"Carry AD", SUP:"Support" };

const norm = (s: unknown) =>
  String(s ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");

const TEAM_SYNONYMS: Record<string, string[]> = {
  // Ajoute ici si d'autres équipes coincent
  "t1": ["t1", "skt", "sktt1", "sktelecomt1", "sktelecom", "sk-telecomt1"],
  "gen": ["gen", "gen.g", "genesis", "genesisgaming", "gen g", "geng"],
  "kt": ["kt", "ktrolster", "kt-rolster", "ktrol"],
  "hleo": ["hleo", "hanwha", "hanwhalife", "hanwha-life"],
  "drx": ["drx"],
  "kdf": ["kdf", "kwangdong", "kwangdongfreecs", "freecs"],
  "brion": ["brion", "okbrion", "bro", "freditbrion"],
  "ns": ["ns", "nongshim", "nongshimredforce", "redforce"],
  "lsb": ["lsb", "lbr", "liiv", "liivsandbox", "sandbox"],
  "dk": ["dk", "dplus", "dpluskia", "damwon", "damwonkia", "dwg"],
};

function expandAliases(teamId: string, teamName?: string): string[] {
  const ids = new Set<string>();
  const baseId = norm(teamId);
  const baseName = norm(teamName);
  if (baseId) ids.add(baseId);
  if (baseName) ids.add(baseName);

  const push = (arr?: string[]) => (arr ?? []).forEach(x => ids.add(norm(x)));

  if (TEAM_SYNONYMS[baseId]) push(TEAM_SYNONYMS[baseId]);
  // Exemple: si l’ID est "t1" mais le nom est "T1", on a déjà; si nom est "SK Telecom T1", alias couvre.
  return Array.from(ids);
}

/* ---------- component ---------- */

export default function SquadPage({
  league,
  team,
  onOpenPlayer,
}: {
  league: "LCK";
  team: { id: string; name: string };
  onOpenPlayer?: (id: string) => void;
}) {
  const save = loadState();

  // ---- Source #1: sauvegarde locale (si elle existe)
  const savedPlayers = save?.players ?? [];

  // ---- Source #2: dataset core (fallback)
  const {
    players: corePlayers,
    triedKeys,
    datasetTeamIds,
  } = useMemo(() => {
    const all = (LCK_PLAYERS_2025 as any[]) ?? [];
    // Liste des teamIds présents dans le dataset (pour debug si vide)
    const datasetTeamIds = Array.from(new Set(all.map(p => String(p.teamId)).filter(Boolean))).sort();

    const keys = expandAliases(team?.id, team?.name);
    const keysSet = new Set(keys);

    const eq = (pTid: string) => keysSet.has(norm(pTid));

    // 1) match strict (normalisé)
    let arr = all.filter(p => eq(p.teamId));

    // 2) si vide → includes() (par ex. "sktelecomt1" inclut "t1")
    if (arr.length === 0) {
      arr = all.filter(p => {
        const t = norm(p.teamId);
        return keys.some(k => t.includes(k));
      });
    }

    // 3) si encore vide → essaie avec le nom d’équipe du joueur s’il existe (teamName)
    if (arr.length === 0) {
      arr = all.filter(p => {
        const tn = norm((p as any).teamName);
        return tn && keys.some(k => tn.includes(k));
      });
    }

    return { players: arr, triedKeys: keys, datasetTeamIds };
  }, [team?.id, team?.name]);

  // ---- Choix final de la source
  const playersSource: PlayerRow[] = useMemo(() => {
    const src = savedPlayers.length ? savedPlayers : corePlayers;

    return src.map((p: any) => {
      const roleRaw = String(p.rolePrimary || p.role || "MID").toUpperCase();
      const role: Role = (roleRaw === "JNG" ? "JGL" : roleRaw) as Role;
      const ovr = Math.round(p.ovr ?? 0);
      return {
        id: String(p.id),
        teamId: String(p.teamId),
        name: String(p.ign ?? p.name ?? "Unknown"),
        role,
        age: Number(p.ageYears ?? p.age ?? 0),
        ovr,
        pot: Number.isFinite(p.potential) ? Math.round(p.potential) : ovr, // fallback simple
        lane: Math.round(p.laning ?? p.lane ?? 0),
        mech: Math.round(p.mechanics ?? p.mech ?? 0),
        macro: Math.round(p.macro ?? 0),
        champPool: Math.round(p.versatility ?? p.consistency ?? 0),
        wagePerDay: p.salaryEstimateUSD ? Math.round(p.salaryEstimateUSD / 365) : undefined,
        contractEnd: p.contractEnd ?? undefined,
        morale: 75,
        fitness: 90,
        form: 0,
      };
    });
  }, [savedPlayers, corePlayers]);

  // Groupement par rôle + ordre
  const byRole = useMemo(() => {
    const groups: Record<Role, PlayerRow[]> = { TOP:[], JGL:[], MID:[], ADC:[], SUP:[] };
    playersSource.forEach(p => { groups[p.role]?.push(p); });
    for (const r of ROLE_ORDER) groups[r].sort((a,b)=> b.ovr - a.ovr || b.pot - a.pot);
    return groups;
  }, [playersSource]);

  // Titulaires proposés = meilleur OVR par rôle
  const startersInit = useMemo(() => {
    const s: Partial<Record<Role, string>> = {};
    for (const r of ROLE_ORDER) if (byRole[r][0]) s[r] = byRole[r][0].id;
    return s;
  }, [byRole]);

  const [sel, setSel] = useState<Partial<Record<Role, string>>>(startersInit);

  if (!playersSource.length) {
    // Panneau d’aide quand on n’a rien matché
    const sample = datasetTeamIds.slice(0, 16).join(", ");
    return (
      <section className="panel empty">
        <h3>Effectif — {team?.name}</h3>
        <p className="muted">
          Aucun joueur trouvé pour <b>{team?.id}</b>.
          <br/>Clés tentées: <code>{triedKeys.join(", ")}</code>
          <br/>IDs détectés dans le dataset: <code>{sample}{datasetTeamIds.length>16?"…":""}</code>
        </p>
      </section>
    );
  }

  return (
    <section className="squad-root">
      <div className="squad-head">
        <h3>Effectif — {team?.name}</h3>
        <div className="muted">Titulaires proposés : meilleurs OVR par rôle (modifiable)</div>
      </div>

      <div className="roles-grid">
        {ROLE_ORDER.map(role => (
          <div key={role} className="role-card">
            <div className="role-head">
              <span className="rname">{ROLE_LABEL[role]}</span>
              <span className="rsub">Joueurs: {byRole[role].length}</span>
            </div>

            <div className="plist">
              {byRole[role].map((p) => (
                <div
                  key={p.id}
                  className={`prow ${sel[role] === p.id ? "starter" : ""} clickable`}
                  onClick={() => onOpenPlayer?.(p.id)}
                  title="Voir la fiche joueur"
                >
                  <div className="prow-left">
                    <input
                      type="radio"
                      name={`starter-${role}`}
                      checked={sel[role] === p.id}
                      onChange={() => setSel(s => ({ ...s, [role]: p.id }))}
                      title="Titulaire"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="pname">{p.name}</div>
                    <div className="ptag muted">OVR {p.ovr} • POT {p.pot}</div>
                  </div>
                  <div className="prow-mid">
                    <span title="Lane">{p.lane}</span>
                    <span title="Mécanique">{p.mech}</span>
                    <span title="Macro">{p.macro}</span>
                    <span title="Pool">{p.champPool}</span>
                  </div>
                  <div className="prow-right">
                    <span className={`pill ${p.morale>=75?"g":p.morale>=50?"y":"r"}`} title="Morale">{p.morale}</span>
                    <span className={`pill ${p.fitness>=90?"g":p.fitness>=70?"y":"r"}`} title="Fitness">{p.fitness}</span>
                    <span className="pill" title="Forme">{p.form >= 0 ? `+${p.form}` : p.form}</span>
                    {p.wagePerDay && <span className="wage muted">{p.wagePerDay.toLocaleString()} ₩/j</span>}
                  </div>
                </div>
              ))}
              {byRole[role].length === 0 && <div className="muted small">Aucun joueur pour ce rôle.</div>}
            </div>
          </div>
        ))}
      </div>

      <div className="squad-actions">
        <button className="btn" disabled title="Bientôt">Enregistrer la compo</button>
        <button className="btn" disabled title="Bientôt">Reposer les remplaçants</button>
      </div>
    </section>
  );
}
