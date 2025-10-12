export default function Step2League({
  onBack,
  onChoose,
}: {
  onBack: () => void;
  onChoose: (league: "LCK") => void; // seule la LCK est jouable pour l’instant
}) {
  return (
    <div className="newgame-root">
      <div className="bg-orb orb-1" />
      <div className="bg-orb orb-2" />
      <div className="bg-grid" />

      <div className="newgame-card">
        <header className="newgame-header">
          <h2>Nouvelle partie — Choix de la ligue</h2>
          <p className="muted">Les autres ligues sont visibles mais indisponibles pour l’instant.</p>
        </header>

        <div className="league-grid">
          <button className="league-card active" onClick={() => onChoose("LCK")}>
            <div className="league-title">LCK</div>
            <div className="league-sub">Corée • 10 équipes • BO3</div>
          </button>

          <div className="league-card disabled">
            <div className="league-title">LEC</div>
            <div className="league-sub">EU • Bientôt</div>
          </div>
          <div className="league-card disabled">
            <div className="league-title">LPL</div>
            <div className="league-sub">CN • Bientôt</div>
          </div>
          <div className="league-card disabled">
            <div className="league-title">LCS</div>
            <div className="league-sub">NA • Bientôt</div>
          </div>
        </div>

        <div className="actions">
          <button className="btn" onClick={onBack}>Retour</button>
        </div>
      </div>
    </div>
  );
}
