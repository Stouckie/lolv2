// Simu rapide BO3 + mise à jour classement

export function simulateBo3(): [number, number] {
  const homeWins = Math.random() < 0.5;
  const is21 = Math.random() < 0.6;
  if (homeWins) return is21 ? [2,1] : [2,0];
  return is21 ? [1,2] : [0,2];
}

export function applyResultToStandings(
  db: any,
  s: { home: string; away: string; score: [number, number] }
) {
  const standings = db?.standings as any[] | undefined;
  if (!standings) return;

  const [hs, as] = s.score;
  const home = standings.find(r => r.teamId === s.home);
  const away = standings.find(r => r.teamId === s.away);
  if (!home || !away) return;

  home.gamesWon  = (home.gamesWon  ?? 0) + hs;
  home.gamesLost = (home.gamesLost ?? 0) + as;
  away.gamesWon  = (away.gamesWon  ?? 0) + as;
  away.gamesLost = (away.gamesLost ?? 0) + hs;

  if (hs > as) { home.wins += 1; away.losses += 1; }
  else         { away.wins += 1; home.losses += 1; }

  standings.sort(
    (A,B) => B.wins - A.wins || (B.gamesWon - B.gamesLost) - (A.gamesWon - A.gamesLost)
  );
}
