import { useEffect, useState } from "react";
import type { Step1Payload } from "./Step1";
import type { TeamCard } from "./Step3Team";
import { createNewGameSave } from "@core";
import { writeSave, type GameSaveFile } from "@/adapters/persist/localStorage";
import { normalizeGameDB } from "@/utils/gameNormalization";
// en haut du fichier
import { LCK_PLAYERS_2025 } from "@core";


const STEPS = [
  "Chargement des données",
  "Génération des rosters",
  "Création du calendrier",
  "Initialisation de la sauvegarde",
] as const;

export default function Step5Generate({
  profile,
  league,
  team,
  onDone,
}: {
  profile: Step1Payload;
  league: "LCK";
  team: TeamCard;
  onDone: () => void;
}) {
  const [activeStep, setActiveStep] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const total = STEPS.length;
    let step = 0;
    let acc = 0;
    const timer = setInterval(() => {
      acc = Math.min(acc + Math.random() * 9 + 4, 100);
      setProgress(Math.round(acc));
      if (acc >= ((step + 1) / total) * 100 && step < total - 1) {
        step += 1;
        setActiveStep(step);
      }
      if (acc >= 100) {
        clearInterval(timer);
        setTimeout(onDone, 500);
      }
    }, 180);
    return () => clearInterval(timer);
  }, [onDone]);

  useEffect(() => {
    if (progress !== 100) return;

    const rawDb = createNewGameSave({
      managerName: profile.name,
      league,
      teamName: team.name,
    });

    const db = normalizeGameDB(rawDb);
    // après: const db = normalizeGameDB(rawDb);
(db as any).players = LCK_PLAYERS_2025;   // injecte tous les joueurs dans la DB
db.meta.updatedAt = new Date().toISOString();

    const now = Date.now();

    const save: GameSaveFile = {
      version: 1,
      savedAt: now,
      updatedAt: now,
      summary: {
        manager: profile.name,
        league,
        team: team.name,
        teamId: team.id,
        season: db.meta.season,
        currentWeek: db.meta.currentWeek,
        currentDayIndex: db.meta.currentDayIndex,
      },
      state: {
        profile,
        league,
        team,
      },
      file: db,
    };

    writeSave(save);
  }, [progress, profile, league, team]);

  return (
    <div className="newgame-root">
      <div className="newgame-card">
        <header className="newgame-header">
          <h2>Création de ta carrière</h2>
          <p className="muted">
            {profile.name} – {league} – {team.name}
          </p>
        </header>
        <div className="progress">
          <div className="progress-bar" style={{ width: `${progress}%` }} />
        </div>
        <ul className="steps">
          {STEPS.map((label, idx) => (
            <li key={label} className={idx < activeStep ? "done" : idx === activeStep ? "active" : ""}>{label}</li>
          ))}
        </ul>
        <div className="actions" style={{ justifyContent: "flex-end" }}>
          <button className="btn" onClick={onDone} disabled={progress < 100}>Entrer dans le Hub</button>
        </div>
      </div>
    </div>
  );
}
