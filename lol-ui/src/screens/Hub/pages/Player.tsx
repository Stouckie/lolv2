import { useMemo } from "react";
import "../../../styles/player.css";

// ajuste si ton alias diffère (sinon: "lol-core/dist/src/data/lck")
import { LCK_PLAYERS_2025 } from "@core/data/lck";

type LckPlayer = any;

type Props = { playerId: string; onBack?: () => void };

const ROLE_ORDER = ["TOP", "JGL", "MID", "ADC", "SUP"] as const;

const GROUPS: Record<string, { title: string; keys: string[] }[]> = {
  TOP: [
    { title: "Micro", keys: ["mechanics", "positioning", "laning"] },
    { title: "Macro", keys: ["macro", "decisionMaking"] },
    { title: "Fight", keys: ["teamfight", "clutch", "consistency", "discipline"] },
  ],
  JGL: [
    { title: "Jungle", keys: ["pathing", "objectiveControl"] },
    { title: "Vision/Macro", keys: ["vision", "macro", "decisionMaking"] },
    { title: "Fight", keys: ["teamfight", "positioning", "consistency", "clutch"] },
  ],
  MID: [
    { title: "Micro", keys: ["mechanics", "positioning", "laning"] },
    { title: "Macro/Map", keys: ["macro", "decisionMaking", "roaming", "vision"] },
    { title: "Fight", keys: ["teamfight", "clutch", "consistency", "discipline"] },
  ],
  ADC: [
    { title: "Micro", keys: ["mechanics", "positioning", "laning"] },
    { title: "Macro", keys: ["macro", "decisionMaking"] },
    { title: "Fight", keys: ["teamfight", "clutch", "consistency", "discipline"] },
  ],
  SUP: [
    { title: "Utility/Vision", keys: ["vision", "peelUtility"] },
    { title: "Macro/Map", keys: ["macro", "decisionMaking", "roaming"] },
    { title: "Fight/Protect", keys: ["positioning", "teamfight", "consistency", "discipline", "clutch"] },
  ],
};

const LABELS: Record<string, string> = {
  laning: "Laning",
  mechanics: "Mechanics",
  positioning: "Positioning",
  macro: "Macro",
  decisionMaking: "Decision Making",
  teamfight: "Teamfight",
  clutch: "Clutch",
  consistency: "Consistency",
  discipline: "Discipline",
  pathing: "Pathing",
  objectiveControl: "Objectives",
  vision: "Vision",
  roaming: "Roaming",
  peelUtility: "Peel / Utility",
};

const clamp100 = (v: number | undefined) =>
  Math.max(0, Math.min(100, Number.isFinite(v as number) ? (v as number) : 0));
const money = (n?: number | null, sym = "$") =>
  n == null || !Number.isFinite(n)
    ? "—"
    : Math.abs(n) >= 1e9
    ? (n / 1e9).toFixed(1) + " B" + sym
    : Math.abs(n) >= 1e6
    ? (n / 1e6).toFixed(1) + " M" + sym
    : Math.abs(n) >= 1e3
    ? (n / 1e3).toFixed(1) + " K" + sym
    : n.toFixed(0) + " " + sym;
const iso = (s?: string | null) => (!s ? "—" : new Date(s).toISOString().slice(0, 10));
const plural = (n: number, one: string, many: string) => `${n} ${n <= 1 ? one : many}`;
const scoreClass = (v: number) => (v >= 85 ? "score-4" : v >= 75 ? "score-3" : v >= 60 ? "score-2" : "score-1");

export default function PlayerPage({ playerId, onBack }: Props) {
  const player = useMemo<LckPlayer | undefined>(() => {
    const arr = (LCK_PLAYERS_2025 as LckPlayer[]) ?? [];
    return arr.find((p) => String(p?.id) === String(playerId)) ?? arr.find((p) => p?.ign === playerId);
  }, [playerId]);

  if (!player) {
    return (
      <section className="panel player-root">
        <div className="player-miss">
          <b>Joueur introuvable</b>
          <span className="muted">{playerId}</span>
          {onBack && (
            <button className="btn ghost" onClick={onBack}>
              ← Retour
            </button>
          )}
        </div>
      </section>
    );
  }

  const role = String(player.rolePrimary || player.role || "MID").toUpperCase();
  const groups = GROUPS[ROLE_ORDER.includes(role as any) ? role : "MID"];

  const ovr = clamp100(player.ovr);
  const vEst = player.valueUSD_Est ?? player.valueUSD ?? null;
  const vMin = player.valueUSD_Min ?? null;
  const vMax = player.valueUSD_Max ?? null;
  const conf = player.valueConfidence != null ? Math.round(player.valueConfidence * 100) : null;
  const monthsLeft = Number.isFinite(player.monthsLeft) ? player.monthsLeft : null;

  const metricKeys = Array.from(new Set(groups.flatMap((g) => g.keys)));
  const top3 = metricKeys
    .map((k) => ({ k, v: Number(player[k] ?? -1) }))
    .filter((x) => x.v >= 0)
    .sort((a, b) => b.v - a.v)
    .slice(0, 3);

  return (
    <div className="player-shell">
      <div className="player-container">
        {/* ===== HEADER : badge OVR rond à gauche, valeur à droite, meta centrée ===== */}
        <header className="ph">
          <div className="ph-left">
            <div className={`ovr-circle ${scoreClass(ovr)}`}>{Math.round(ovr)}</div>
            <div className="ph-meta">
              <h1 className="pname">{player.ign}</h1>
              <div className="meta-row">
                <span className="badge">{player.rolePrimary}</span>
                {player.teamId && <span className="badge">{player.teamId}</span>}
                {player.status && <span className="chip">{player.status}</span>}
                {player.ageYears && <span className="chip">{player.ageYears} ans</span>}
              </div>
              <div className="meta-row">
                <span className="chip">Contrat: {iso(player.contractEnd)}</span>
                <span className="chip">
                  {monthsLeft != null ? plural(monthsLeft, "mois restant", "mois restants") : "—"}
                </span>
                {player.marketStatus && <span className="chip">{player.marketStatus}</span>}
              </div>
              <div className="meta-row">
                {player.playStylePrimary && <span className="chip">{player.playStylePrimary}</span>}
                {player.playStyleSecondary && <span className="chip">{player.playStyleSecondary}</span>}
              </div>

              {!!top3.length && (
                <div className="scout">
                  <span className="muted">Scout summary:&nbsp;</span>
                  {top3.map((s, i) => (
                    <span key={i} className="scout-pill">
                      {(LABELS[s.k] ?? s.k) + " " + Math.round(s.v)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="ph-right">
            <div className="value-box">
              <div className="value-main">{money(vEst, "$")}</div>
              <div className="value-sub">
                {(vMin || vMax) ? `${money(vMin, "$")} – ${money(vMax, "$")}` : "—"}
                {conf != null ? ` · conf. ${conf}%` : ""}
              </div>
            </div>
            {onBack && (
              <button className="btn ghost" onClick={onBack} title="Retour à l’effectif">
                ← Retour
              </button>
            )}
          </div>
        </header>

        {/* ===== GRID ===== */}
        <div className="grid">
          {/* Rôle */}
          <section className="panel role">
            <div className="panel-head">Rôle &amp; Statut</div>
            <div className="lanes">
              {ROLE_ORDER.map((r) => (
                <div key={r} className={`lane ${r === role ? "active" : ""}`}>
                  {r}
                </div>
              ))}
            </div>
            <div className="chips">
              <span className="badge">Rôle: {role}</span>
              {player.roleSecondary && <span className="badge">Secondaire: {String(player.roleSecondary)}</span>}
              {player.status && <span className="badge">{player.status}</span>}
            </div>
          </section>

          {/* 3 colonnes de métriques */}
          {groups.map((g) => (
            <section key={g.title} className="panel metrics">
              <div className="panel-head">{g.title}</div>
              <ul className="mlist">
                {g.keys.map((k) => {
                  const v = clamp100(player[k]);
                  return (
                    <li key={k} className="mrow">
                      <span className="mlabel">{LABELS[k] ?? k}</span>
                      <div className="bar">
                        <div className={`fill ${scoreClass(v)}`} style={{ width: `${v}%` }} />
                      </div>
                      <span className={`val ${scoreClass(v)}`}>{Math.round(v)}</span>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}

          {/* Marché */}
          <section className="panel market">
            <div className="panel-head">Marché &amp; Contrat</div>
            <dl className="kv">
              <div>
                <dt>Statut marché</dt>
                <dd>{player.marketStatus ?? "—"}</dd>
              </div>
              <div>
                <dt>Fin de contrat</dt>
                <dd>{iso(player.contractEnd)}</dd>
              </div>
              <div>
                <dt>Restant</dt>
                <dd>{monthsLeft != null ? plural(monthsLeft, "mois", "mois") : "—"}</dd>
              </div>
              <div>
                <dt>Salaire (bracket)</dt>
                <dd>{player.salaryBracket ?? "—"}</dd>
              </div>
              <div>
                <dt>Salaire (est.)</dt>
                <dd>{player.salaryEstimateUSD ? money(player.salaryEstimateUSD, "$") : "—"}</dd>
              </div>
            </dl>

            <div className="panel-sub">Valeur (estimation)</div>
            <dl className="kv">
              <div>
                <dt>Est.</dt>
                <dd>{money(vEst, "$")}</dd>
              </div>
              <div>
                <dt>Range</dt>
                <dd>
                  {money(vMin, "$")} – {money(vMax, "$")}
                </dd>
              </div>
              <div>
                <dt>Confiance</dt>
                <dd>{conf != null ? `${conf}%` : "—"}</dd>
              </div>
            </dl>

            {!!player?.sources?.length && (
              <>
                <div className="panel-sub">Sources</div>
                <ul className="sources">
                  {player.sources.map((s: string, i: number) => (
                    <li key={i}>• {s}</li>
                  ))}
                </ul>
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
