import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../../../styles/finance.css";

/**
 * Finance V1 — lit window.__LOL_DB et déduit si besoin.
 * Emplacement: screens/Hub/pages/Finance.tsx
 */

type AnyObj = Record<string, any>;
type Team = { id: string; name: string; league?: string; budgetEUR?: number };
type Player = { id: string; name?: string; teamId?: string; salaryEUR?: number };
type Staff  = { id: string; name?: string; role?: string; teamId?: string; salaryEUR?: number };

function eur(n: number | undefined, opts: Intl.NumberFormatOptions = {}) {
  const v = typeof n === "number" && isFinite(n) ? n : 0;
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "EUR", maximumFractionDigits: 0, ...opts }).format(v);
}
function pct(n: number) { return `${Math.round(n)}%`; }
function clamp(n: number, a: number, b: number) { return Math.max(a, Math.min(b, n)); }

function pickTeam(db: AnyObj): Team | undefined {
  const ctxTeam: Team | undefined =
    (db?.context?.team as Team) ||
    (db?.__CTX?.team as Team) ||
    (typeof window !== "undefined" ? (window as any).__LOL_CTX?.team : undefined);

  if (ctxTeam?.id) return ctxTeam;

  const byGlobalId = (typeof window !== "undefined" ? (window as any).__LOL_TEAM_ID : undefined);
  if (byGlobalId) return (db?.teams || []).find((t: Team) => t.id === byGlobalId);

  if (db?.user?.teamId) return (db?.teams || []).find((t: Team) => t.id === db.user.teamId);

  return (db?.teams || [])[0];
}

export default function FinanceScreen() {
  const navigate = useNavigate();
  const [db, setDb] = useState<AnyObj>({});

  useEffect(() => {
    const d = (typeof window !== "undefined" ? (window as any).__LOL_DB : undefined) || {};
    setDb(d);
  }, []);

  const team: Team | undefined = useMemo(() => pickTeam(db), [db]);
  const league = (team?.league || db?.meta?.league || "LCK") as string;

  const {
    payrollPlayers, payrollStaff, sponsorBase, merchBase,
    streaming, casting, opex, cash, budgetSalaryMonthly,
    resultMonth, burnRate, runwayMonths, healthScore,
  } = useMemo(() => {
    const players: Player[] = (db?.players || db?.roster || []);
    const staff:   Staff[]   = (db?.staff   || []);
    const myId = team?.id;

    const payrollPlayers = players.filter(p => !myId || p.teamId === myId)
                                  .reduce((s, p) => s + (p.salaryEUR || 0), 0);

    const payrollStaff   = staff.filter(s => !myId || s.teamId === myId)
                                .reduce((s, m) => s + (m.salaryEUR || 0), 0);

    const budgetAnnual = team?.budgetEUR || 0;
    const budgetSalaryMonthly = Math.round(budgetAnnual / 12);

    // Sponsor par défaut = 70% du budget salaires mensuel (si rien en DB)
    const sponsorBase = Math.round(
      db?.finance?.sponsor?.basePerMonth ??
      (budgetSalaryMonthly > 0 ? budgetSalaryMonthly * 0.7 : 0)
    );

    const merchBase = Math.round(db?.finance?.monthly?.merch ?? 0);
    const streaming = Math.round(db?.finance?.monthly?.streaming ?? 0);
    const casting   = Math.round(db?.finance?.monthly?.casting   ?? 0);

    const opex = Math.round(
      db?.finance?.monthly?.opex ??
      (league === "LCK" ? 30000 : 25000)
    );

    const cash = Math.round(db?.finance?.cash ?? 500_000);

    const income = sponsorBase + merchBase + streaming + casting;
    const costs  = payrollPlayers + payrollStaff + opex;

    const resultMonth  = income - costs;
    const burnRate     = resultMonth < 0 ? -resultMonth : 0;
    const runwayMonths = burnRate > 0 ? Math.floor(cash / burnRate) : 99;

    // Score de santé 0..100 (runway, respect budget, résultat)
    const overBudget = budgetSalaryMonthly > 0 ? ((payrollPlayers + payrollStaff) / budgetSalaryMonthly - 1) : 0;
    let health = 60;
    health += clamp(runwayMonths, 0, 12) * 2;                       // +0..+24
    health -= clamp(overBudget * 100, 0, 30) * 0.8;                 // -0..-24
    health += clamp(resultMonth / Math.max(1, costs) * 100, -10, 10);// +/-10
    const healthScore = Math.round(clamp(health, 0, 100));

    return {
      payrollPlayers, payrollStaff, sponsorBase, merchBase,
      streaming, casting, opex, cash, budgetSalaryMonthly,
      resultMonth, burnRate, runwayMonths, healthScore,
    };
  }, [db, team, league]);

  const wageTotal = payrollPlayers + payrollStaff;
  const wageVsBudget = budgetSalaryMonthly > 0 ? (wageTotal / budgetSalaryMonthly) : 1;
  const budgetState: "ok" | "warn" | "bad" =
    wageVsBudget <= 1 ? "ok" : (wageVsBudget <= 1.1 ? "warn" : "bad");

  const runwayState: "ok" | "warn" | "bad" =
    runwayMonths >= 6 ? "ok" : (runwayMonths >= 3 ? "warn" : "bad");

  const monthsPerSplit = (db?.finance?.season?.monthsPerSplit ?? 3) as number;
  const projectionEOS = cash + resultMonth * monthsPerSplit;

  return (
    <div className="fi">
      <div className="fi-topbar">
        <button className="fi-btn" onClick={() => navigate("/hub")}>🏠 Hub</button>
        <h1>Finances — {team?.name ?? "Équipe"}</h1>
      </div>

      <div className="fi-tiles">
        <div className="fi-tile">
          <div className="fi-k">Trésorerie</div>
          <div className="fi-v">{eur(cash)}</div>
          <div className="fi-s">Liquidités disponibles</div>
        </div>

        <div className={`fi-tile ${resultMonth >= 0 ? "pos" : "neg"}`}>
          <div className="fi-k">Résultat (mois)</div>
          <div className="fi-v">{eur(resultMonth)}</div>
          <div className="fi-s">{resultMonth >= 0 ? "Excédent" : "Déficit"}</div>
        </div>

        <div className={`fi-tile ${budgetState}`}>
          <div className="fi-k">Masse salariale</div>
          <div className="fi-v">{eur(wageTotal)}</div>
          <div className="fi-s">Budget: {eur(budgetSalaryMonthly)} ({wageVsBudget > 0 ? Math.round((wageVsBudget-1)*100) : 0}% écart)</div>
        </div>

        <div className={`fi-tile ${runwayState}`}>
          <div className="fi-k">Runway</div>
          <div className="fi-v">{runwayMonths >= 99 ? "∞" : `${runwayMonths} mois`}</div>
          <div className="fi-s">Au rythme actuel</div>
        </div>

        <div className="fi-tile">
          <div className="fi-k">Santé financière</div>
          <div className="fi-v">{healthScore}/100</div>
          <div className="fi-s">Runway, budget & résultats</div>
        </div>
      </div>

      <div className="fi-grid">
        <section className="fi-card">
          <h2>Revenus (mensuels)</h2>
          <ul className="fi-list">
            <li><span>Sponsor principal</span><b>{eur(sponsorBase)}</b></li>
            <li><span>Streaming joueurs</span><b>{eur(streaming)}</b></li>
            <li><span>Casting / Co-streams</span><b>{eur(casting)}</b></li>
            <li><span>Merch / Media</span><b>{eur(merchBase)}</b></li>
          </ul>
          <div className="fi-sub">Le sponsor initial est calé ~70% de ton budget salaires (modifiable plus tard).</div>
        </section>

        <section className="fi-card">
          <h2>Dépenses (mensuelles)</h2>
          <ul className="fi-list">
            <li><span>Salaires joueurs</span><b>{eur(payrollPlayers)}</b></li>
            <li><span>Salaires staff</span><b>{eur(payrollStaff)}</b></li>
            <li><span>Charges fixes (OpEx)</span><b>{eur(opex)}</b></li>
          </ul>
          <div className="fi-sub">OpEx par ligue (LCK ~30 000 € par défaut).</div>
        </section>

        <section className="fi-card">
          <h2>Projection</h2>
          <div className="fi-proj">
            <div className="fi-proj-row">
              <span>Résultat ce mois</span>
              <b className={resultMonth>=0?"pos":"neg"}>{eur(resultMonth)}</b>
            </div>
            <div className="fi-proj-row">
              <span>Fin de split (≈ {monthsPerSplit} mois)</span>
              <b className={projectionEOS>=0?"pos":"neg"}>{eur(projectionEOS)}</b>
            </div>
          </div>
          <div className="fi-sub">Scénarios détaillés (Conservateur / Central / Optimiste) à venir.</div>
        </section>

        <section className="fi-card">
          <h2>Budget Board</h2>
          <div className="fi-bbar">
            <div className="fi-bbar-track">
              <div
                className={`fi-bbar-fill ${budgetState}`}
                style={{ width: `${clamp((wageTotal / Math.max(1, budgetSalaryMonthly)) * 100, 1, 200)}%` }}
              />
              <div className="fi-bbar-mark" title="Tolérance +10%" style={{ left: "110%" }} />
            </div>
            <div className="fi-bbar-legend">
              <span>Budget: {eur(budgetSalaryMonthly)}</span>
              <span>Actuel: {eur(wageTotal)} ({pct((wageTotal/Math.max(1,budgetSalaryMonthly))*100)})</span>
            </div>
          </div>
          <div className="fi-sub">
            Dépassement &gt; 10% prolongé ⟶ le Board s’inquiète (blocage “soft” de gros transferts).
          </div>
        </section>
      </div>

      <section className="fi-card">
        <h2>Journal financier (récent)</h2>
        <div className="fi-empty">Les mouvements apparaîtront ici (paie, primes, buyouts, co-streams…).</div>
      </section>
    </div>
  );
}
