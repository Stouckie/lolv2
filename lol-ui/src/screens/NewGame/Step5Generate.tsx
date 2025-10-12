import { useEffect, useState } from "react";
import type { Step1Payload } from "./Step1";
import type { TeamCard } from "./Step3Team";
import { createNewGameSave } from "@core/seedLCK";
import { writeSave } from "@/adapters/persist/localStorageStore";

const STEPS = [
  "Chargement des données",
  "Génération des rosters",
  "Création du calendrier",
  "Initialisation de la sauvegarde",
] as const;

export default function Step5Generate({
  profile, league, team, onDone,
}: {
  profile: Step1Payload; league: "LCK"; team: TeamCard; onDone: () => void;
}) {
  const [i, setI] = useState(0);
  const [p, setP] = useState(0);

  useEffect(() => {
    const total = STEPS.length;
    let step = 0, acc = 0;
    const t = setInterval(() => {
      acc = Math.min(acc + Math.random() * 9 + 4, 100);
      setP(Math.round(acc));
      if (acc >= ((step + 1) / total) * 100 && step < total - 1) { step++; setI(step); }
      if (acc >= 100) { clearInterval(t); setTimeout(onDone, 500); }
    }, 180);
    return () => clearInterval(t);
  }, [onDone]);

  useEffect(() => {
    if (p !== 100) return;
    const save = createNewGameSave({ managerName: profile.name, league, teamName: team.name });
    writeSave(save);
    console.log("[Step5] Save written ✓", save.summary);
  }, [p, profile.name, league, team.name]);

  return (
    <div className="newgame-root">
      <div className="newgame-card">
        <header className="newgame-header">
          <h2>Création de ta carrière…</h2>
          <p className="muted">{profile.name} — {league} — {team.name}</p>
        </header>
        <div className="progress"><div className="progress-bar" style={{ width: `${p}%` }} /></div>
        <ul className="steps">
          {STEPS.map((s, idx) => (
            <li key={s} className={idx < i ? "done" : idx === i ? "active" : ""}>{s}</li>
          ))}
        </ul>
        <div className="actions" style={{ justifyContent: "flex-end" }}>
          <button className="btn" onClick={onDone} disabled={p < 100}>Entrer dans le Hub</button>
        </div>
      </div>
    </div>
  );
}
