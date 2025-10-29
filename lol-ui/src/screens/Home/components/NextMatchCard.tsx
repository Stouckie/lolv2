import React from "react";
import { useNextMatch } from "../hooks/useNextMatch";

type Props = {
  db: any;
  teamId?: string;
  onOpenCalendarAt: (week: number, dayInWeek: number) => void; // week 0-based attendu
  onPlayToday?: () => void; // optionnel
};

export default function NextMatchCard({ db, teamId, onOpenCalendarAt, onPlayToday }: Props) {
  const next = useNextMatch(db, teamId);

  return (
    <div className="panel">
      <div className="section-title">Prochaine rencontre</div>

      {!next ? (
        <div className="muted">Aucun match à venir trouvé.</div>
      ) : (
        <div className="next-match">
          <div className="row">
            <span className="pill">{next.dateLabel}</span>
            <span className="pill">BO{next.bo}</span>
            <span className="pill">{next.time} KST</span>
          </div>

          <div className="row teams">
            <TeamBadge name={next.homeName} logo={next.homeLogo} />
            <span className="vs">vs</span>
            <TeamBadge name={next.awayName} logo={next.awayLogo} />
          </div>

          <div className="row actions">
            <button
              className="btn-accent"
              onClick={() => onOpenCalendarAt(Math.max(0, next.week - 1), next.dayIndex)}
            >
              Voir dans le calendrier
            </button>

            {onPlayToday && (
              <button className="btn" onClick={onPlayToday}>Jouer aujourd’hui</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function TeamBadge({ name, logo }: { name: string; logo: string }) {
  return (
    <div className="nm-badge">
      <img src={logo} alt={name} />
      <span>{name}</span>
    </div>
  );
}
