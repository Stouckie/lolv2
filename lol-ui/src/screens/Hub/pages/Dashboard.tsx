import { useMemo } from "react";
import "./dashboard.css";
import type { Step1Payload } from "../../Home/../NewGame/Step1";
import type { TeamCard } from "../../Home/../NewGame/Step3Team";

import { readDB } from "@/utils/saveIO";
import NextMatchCard from "../../Home/components/NextMatchCard";

type TeamExtra = {
  logo?: string; id?: string; sponsor?: string; budget?: number; payroll?: number;
  stars?: number; synergy?: number;
  roster?: {
    starters?: Partial<Record<
      "TOP" | "JNG" | "MID" | "ADC" | "SUP",
      { name: string; rating?: number; morale?: number; form?: number }
    >>;
  };
};

type FormRes = "W" | "D" | "L";
type FormSeq = FormRes[];
type TableRow = { pos: number; name: string; pts: number; form: FormSeq };
type RecentItem = { vs: string; res: FormRes | "—"; score: string };

export default function Dashboard({
  profile: _profile,
  league,
  team
}: { profile: Step1Payload; league: "LCK"; team: TeamCard & TeamExtra }) {

  const logo = team.logo ?? `/logos/lck/${team.id || "default"}.png`;
  const teamName = team?.name || "Équipe";
  const sponsor = team.sponsor ?? "À définir";
  const treasury = team.budget ?? 0;
  const payroll = team.payroll ?? 0;
  const stars = "★".repeat(Math.min(team.stars ?? 0, 5)).padEnd(5, "☆");

  const starters = useMemo(() => {
    const roster = team.roster?.starters;
    const order: Array<"TOP" | "JNG" | "MID" | "ADC" | "SUP"> = ["TOP", "JNG", "MID", "ADC", "SUP"];
    if (!roster) return order.map(r => ({ role: r, name: "—", rating: "—", morale: "—", form: "—" }));
    return order.map(r => ({
      role: r, name: roster[r]?.name ?? "—",
      rating: roster[r]?.rating ?? "—", morale: roster[r]?.morale ?? "—", form: roster[r]?.form ?? "—"
    }));
  }, [team]);

  const table: TableRow[] = [];
  const recent: RecentItem[] = [];

  const spark = useMemo(() => {
    const pts = Array.from({length: 24}, (_,i)=> Math.max(0, Math.sin(i/3)+i/8) );
    const w=360,h=160,p=10,max=Math.max(...pts,1),step=(w-p*2)/(pts.length-1||1);
    const path=pts.map((v,i)=>`${i?'L':'M'} ${p+i*step},${h-p-(v/max)*(h-p*2)}`).join(" ");
    const area=`${path} L ${w-p},${h-p} L ${p},${h-p} Z`;
    return {w,h,p,path,area};
  }, []);

  // --- Prochaine rencontre branchée au calendrier (onglets)
  const { db } = readDB();

  // NextMatchCard envoie week déjà 0-based, day 0..6 -> ne PAS refaire -1
  const openCalendarAt = (week0: number, day: number) => {
    window.dispatchEvent(new CustomEvent("open-schedule", {
      detail: { week: Math.max(0, week0), day: Math.max(0, Math.min(6, day)) }
    }));
  };

  return (
    <section className="dash">
      {/* Ligne 1 */}
      <div className="grid-3">
        {/* Prochaine rencontre */}
        <NextMatchCard
          db={db}
          teamId={team?.id}
          onOpenCalendarAt={openCalendarAt}
          // onPlayToday={...} // tu pourras brancher un handler si tu veux le bouton "Jouer"
        />

        <div className="panel">
          <div className="head"><h3>Infos équipe</h3></div>
          <ul className="stats">
            <li><span>Sponsor</span><strong>{sponsor}</strong></li>
            <li><span>Trésorerie</span><strong>{formatMoney(treasury)}</strong></li>
            <li><span>Masse salariale (estimée)</span><strong>{formatMoney(payroll)}</strong></li>
            <li><span>Réputation</span><strong>{stars}</strong></li>
            <li><span>Synergie</span><strong>{team.synergy ?? "—"}%</strong></li>
          </ul>
        </div>

        <div className="panel">
          <div className="head">
            <h3>Finances et salaires</h3>
            <span className="link">Détails ›</span>
          </div>
          <svg className="spark" width={spark.w} height={spark.h} viewBox={`0 0 ${spark.w} ${spark.h}`}>
            <path d={spark.area} className="spark-area" />
            <path d={spark.path} className="spark-line" />
          </svg>
          <div className="money-line">
            <div><span className="muted">Solde</span><strong>{formatMoney(treasury)}</strong></div>
            <div><span className="muted">Salaire/mois</span><strong>{formatMoney(payroll)}</strong></div>
          </div>
        </div>
      </div>

      {/* Ligne 2 */}
      <div className="grid-3">
        <div className="panel">
          <div className="head"><h3>Classement</h3></div>
          {table.length === 0 ? (
            <div className="muted">Classement en attente du début de saison.</div>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>CLT</th><th>ÉQUIPE</th><th>PTS</th><th>Forme</th></tr></thead>
                <tbody>
                  {table.map(r=>(
                    <tr key={r.pos}>
                      <td>{r.pos}</td>
                      <td>{r.name}</td>
                      <td>{r.pts}</td>
                      <td><FormDots seq={r.form} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="panel">
          <div className="head"><h3>Stats joueurs</h3></div>
          <ul className="player-stats">
            {starters.map(s=>(
              <li key={s.role}>
                <span className="role">{s.role}</span>
                <span className="name">{s.name}</span>
                <span className="metric">{s.rating}</span>
                <span className="metric">{s.form}</span>
                <span className="metric">{s.morale}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="panel">
          <div className="head"><h3>Calendrier (récemment)</h3><span className="link">Voir calendrier ›</span></div>
          {/* rien pour l’instant */}
          <div className="muted">Aucun match disputé pour l’instant.</div>
        </div>
      </div>
    </section>
  );
}

/* subcomponents */
function FormDots({ seq }:{ seq: FormSeq }) {
  return <div className="form-dots">{seq.map((r,i)=><span key={i} className={`dot ${r==="W"?"w":r==="D"?"d":"l"}`} />)}</div>;
}

/* utils */
function formatMoney(n: number) {
  try { return new Intl.NumberFormat("fr-FR",{style:"currency",currency:"EUR",maximumFractionDigits:0}).format(n); }
  catch { return `${n.toLocaleString()} €`; }
}
