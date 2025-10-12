import { useMemo, useState } from "react";
import "./squad.css";

type Player = {
  id: string; teamId: string; name: string;
  role: "TOP"|"JNG"|"MID"|"ADC"|"SUP";
  age: number; nat: string;
  ovr: number; pot: number;
  lane: number; mech: number; macro: number; champPool: number;
  style: "aggressive"|"control"|"skirmish"|"late";
  wagePerDay: number; contractEnd: string;
  morale: number; fitness: number; form: number;
};

type Save = {
  team: { id: string; name: string };
  players: Player[];
};

function loadState(): Save | null {
  try { return JSON.parse(localStorage.getItem("lolm2:save:auto") || "null"); }
  catch { return null; }
}

const ROLE_ORDER: Array<Player["role"]> = ["TOP","JNG","MID","ADC","SUP"];
const ROLE_LABEL: Record<Player["role"], string> = { TOP:"Top", JNG:"Jungle", MID:"Mid", ADC:"Carry AD", SUP:"Support" };

export default function SquadPage() {
  const save = loadState();
  const myTeamId = save?.team?.id;

  const byRole = useMemo(() => {
    const groups: Record<Player["role"], Player[]> = { TOP:[], JNG:[], MID:[], ADC:[], SUP:[] };
    (save?.players ?? []).forEach(p => { if (p.teamId === myTeamId) groups[p.role].push(p); });
    for (const r of ROLE_ORDER) groups[r].sort((a,b)=> b.ovr - a.ovr || b.pot - a.pot);
    return groups;
  }, [save, myTeamId]);

  const starters = useMemo(() => {
    const s: Partial<Record<Player["role"], string>> = {};
    for (const r of ROLE_ORDER) if (byRole[r][0]) s[r] = byRole[r][0].id;
    return s;
  }, [byRole]);

  const [sel, setSel] = useState<Partial<Record<Player["role"], string>>>(starters);

  if (!save) return <div className="panel empty"><p>Pas de sauvegarde trouvée.</p></div>;

  return (
    <section className="squad-root">
      <div className="squad-head">
        <h3>Effectif — {save.team?.name}</h3>
        <div className="muted">Titulaires proposés : meilleurs OVR par rôle (modifiable plus tard)</div>
      </div>

      <div className="roles-grid">
        {ROLE_ORDER.map(role => (
          <div key={role} className="role-card">
            <div className="role-head">
              <span className="rname">{ROLE_LABEL[role]}</span>
              <span className="rsub">Joueurs: {byRole[role].length}</span>
            </div>

            <div className="plist">
              {byRole[role].map((p, i) => (
                <div key={p.id} className={`prow ${sel[role] === p.id ? "starter" : ""}`}>
                  <div className="prow-left">
                    <input
                      type="radio"
                      name={`starter-${role}`}
                      checked={sel[role] === p.id}
                      onChange={() => setSel(s => ({ ...s, [role]: p.id }))}
                      title="Titulaire"
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
                    <span className="wage muted">{p.wagePerDay.toLocaleString()} ₩/j</span>
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
