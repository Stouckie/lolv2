import React from "react";
import { currentDateLabel, getSeasonStartISO, weekRangeLabelFR } from "../lib/date";

type Props = {
  db: any;
  clock: { week: number; dayIndex: number };
  todayRemaining: number;
  onContinue: () => void;
  onPlayNext: () => void;
  onSimulateToday: () => void;
  onNextMatchDay: () => void;
  rightExtra?: React.ReactNode; // ex: SaveBar / menu
};

export default function TopActions({
  db, clock, todayRemaining,
  onContinue, onPlayNext, onSimulateToday, onNextMatchDay,
  rightExtra
}: Props) {
  const startISO = getSeasonStartISO(db);

  // ❗️Utiliser la semaine courante depuis la save (1-based), pas currentDayIndex/7
  const weekIdx = Math.max(0, (db?.meta?.currentWeek ?? clock?.week ?? 1) - 1);

  return (
    <div className="top-actions">
      <span className="pill">{currentDateLabel(db)}</span>
      <span className="pill">{weekRangeLabelFR(startISO, weekIdx)}</span>
      <span className="pill">
        Aujourd’hui : {todayRemaining} match{todayRemaining !== 1 ? "s" : ""}
      </span>

      <button className="btn-accent" onClick={onContinue}>
        Continuer (jour +1)
      </button>
      <button className="btn-accent" onClick={onPlayNext} disabled={todayRemaining <= 0}>
        Jouer le prochain match
      </button>
      <button className="btn-accent" onClick={onSimulateToday} disabled={todayRemaining <= 0}>
        Simuler toute la journée
      </button>
      <button className="btn-accent" onClick={onNextMatchDay}>
        Prochain jour avec match
      </button>

      {rightExtra}
    </div>
  );
}
