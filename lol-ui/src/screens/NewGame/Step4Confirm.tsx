import type { Step1Payload } from "./Step1";
import type { TeamCard } from "./Step3Team";

export default function Step4Confirm({
  profile,
  league,
  team,
  onBack,
  onLaunch,
}: {
  profile: Step1Payload;
  league: "LCK";
  team: TeamCard;
  onBack: () => void;
  onLaunch: () => void;
}) {
  return (
    <div className="newgame-root">
      <div className="bg-orb orb-1" />
      <div className="bg-orb orb-2" />
      <div className="bg-grid" />

      <div className="newgame-card">
        <header className="newgame-header">
          <h2>Confirmation — Lancer la saison</h2>
          <p className="muted">Vérifie les infos, tu ne pourras plus changer les règles pendant la saison.</p>
        </header>

        <div className="confirm-grid">
          <div className="kpi">
            <div className="kpi-label">Manager</div>
            <div className="kpi-value">
              {profile.name} <span className="muted">({profile.nationality})</span>
            </div>
          </div>

          <div className="kpi">
            <div className="kpi-label">Ligue</div>
            <div className="kpi-value">{league}</div>
          </div>

          <div className="kpi">
            <div className="kpi-label">Équipe</div>
            <div className="kpi-value">
              <img src={`/logos/lck/${team.id}.png`} alt={team.name} className="team-logo" />
              <span style={{ marginLeft: 8 }}>{team.name}</span>
            </div>
          </div>

          <div className="kpi">
            <div className="kpi-label">Budget indicatif</div>
            <div className="kpi-value">
              {team.budgetEUR.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })}
            </div>
          </div>

          <div className="kpi">
            <div className="kpi-label">Objectif</div>
            <div className="kpi-value">{team.objective}</div>
          </div>

          <div className="kpi">
            <div className="kpi-label">Options</div>
            <div className="kpi-value">
              Autosave: {profile.autosave ? "ON" : "OFF"} • Ironman: {profile.ironman ? "ON" : "OFF"}
            </div>
          </div>
        </div>

        <div className="muted" style={{ marginTop: 10 }}>
          Format LCK : BO3 double round-robin (10 équipes) • Marché des transferts : ouvert uniquement pendant les mercatos officiels • Patchs évolutifs toutes les 2–3 semaines
        </div>

        <div className="actions">
          <button className="btn" onClick={onBack}>Retour</button>
          <button className="btn primary" onClick={onLaunch}>Lancer la saison</button>
        </div>
      </div>
    </div>
  );
}
