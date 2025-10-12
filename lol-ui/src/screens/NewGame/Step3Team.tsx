export type TeamCard = {
  id: string;
  name: string;
  budgetEUR: number;
  objective: string;
  stars: 1 | 2 | 3 | 4 | 5;
};

const LCK_TEAMS: TeamCard[] = [
  { id: "t1", name: "T1", budgetEUR: 9_800_000, objective: "Gagner le titre", stars: 5 },
  { id: "gen", name: "Gen.G", budgetEUR: 9_200_000, objective: "Gagner le titre", stars: 5 },
  { id: "hleo", name: "Hanwha Life", budgetEUR: 6_000_000, objective: "Playoffs", stars: 4 },
  { id: "kt", name: "KT Rolster", budgetEUR: 5_600_000, objective: "Top 4", stars: 4 },
  { id: "dplus", name: "Dplus KIA", budgetEUR: 5_500_000, objective: "Top 4", stars: 4 },
  { id: "kdf", name: "Kwangdong Freecs", budgetEUR: 2_500_000, objective: "Maintien", stars: 2 },
  { id: "drx", name: "DRX", budgetEUR: 2_400_000, objective: "Maintien", stars: 2 },
  { id: "oks", name: "OK Savings", budgetEUR: 2_000_000, objective: "Éviter la relégation", stars: 2 },
  { id: "ns", name: "Nongshim RedForce", budgetEUR: 2_000_000, objective: "Éviter la relégation", stars: 2 },
  { id: "brion", name: "BRION", budgetEUR: 1_900_000, objective: "Éviter la relégation", stars: 1 },
];

function euros(n: number) {
  return n.toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  });
}

function TeamLogo({ id, name }: { id: string; name: string }) {
  // Fallback si le logo n’existe pas : on affiche des initiales
  const src = `/logos/lck/${id}.png`;
  return (
    <img
      src={src}
      alt={name}
      className="team-logo"
      onError={(e) => {
        const el = e.currentTarget;
        // cache l'image et laisse le nom occuper la place
        el.style.display = "none";
      }}
    />
  );
}

export default function Step3Team({
  league,
  onBack,
  onChoose,
}: {
  league: "LCK";
  onBack: () => void;
  onChoose: (team: TeamCard) => void;
}) {
  return (
    <div className="newgame-root">
      <div className="bg-orb orb-1" />
      <div className="bg-orb orb-2" />
      <div className="bg-grid" />

      <div className="newgame-card">
        <header className="newgame-header">
          <h2>Nouvelle partie — Choisis ton équipe ({league})</h2>
          <p className="muted">
            Budgets indicatifs en € — on branchera les valeurs exactes ensuite.
          </p>
        </header>

        <div className="team-grid">
          {LCK_TEAMS.map((t) => (
            <button
              key={t.id}
              className="team-card"
              onClick={() => onChoose(t)}
              aria-label={`Choisir ${t.name}`}
            >
              <div className="team-header">
                <TeamLogo id={t.id} name={t.name} />
                <div className="team-name">{t.name}</div>
              </div>

              <div className="team-meta">
                <span className="pill">{euros(t.budgetEUR)}</span>
                <span className="pill">{t.objective}</span>
              </div>

              <div className="stars">
                {"★★★★★".slice(0, t.stars)}
                <span className="dim">{"★★★★★".slice(t.stars)}</span>
              </div>
            </button>
          ))}
        </div>

        <div className="actions">
          <button className="btn" onClick={onBack}>
            Retour
          </button>
        </div>
      </div>
    </div>
  );
}
