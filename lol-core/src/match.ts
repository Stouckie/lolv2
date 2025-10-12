import type { Champion, TeamComp, MatchConfig, MatchResult, TeamSide, MetaParams } from "./types";
import { rngFromSeed } from "./rng";

function baseTeamScore(comp:TeamComp, pool:Record<string,Champion>) {
  return (Object.values(comp) as string[]).reduce((acc,id)=>{
    const c = pool[id]; if(!c) return acc;
    const stat = c.base.dps*0.35 + c.base.burst*0.20 + c.base.sustain*0.10 + c.base.control*0.20 + c.base.mobility*0.05 + c.base.toughness*0.10;
    return acc + stat * (0.8 + 0.4*c.scaling.mid);
  },0);
}

function synergyTeam(comp:TeamComp, pool:Record<string,Champion>, meta:MetaParams){
  const champs = (Object.values(comp) as string[]).map(id=>pool[id]);
  const kinds = new Set(champs.map(c=>c.archetype)).size;
  let mult = 1.0;
  if (kinds <= 3) mult *= 1 + 0.03 * meta.wSynergy; // cohérence
  const enchanter = champs.some(c=>c.archetype==="Enchanter");
  if (enchanter) mult *= 1 + 0.02 * meta.enchanterBias;
  return mult;
}

export function simulateMatch(blue:TeamComp, red:TeamComp, pool:Record<string,Champion>, cfg:MatchConfig): MatchResult {
  const rng = rngFromSeed(cfg.rngSeed ?? 42);

  const bBase = baseTeamScore(blue, pool), rBase = baseTeamScore(red, pool);
  const bSyn  = synergyTeam(blue, pool, cfg.meta), rSyn = synergyTeam(red, pool, cfg.meta);

  // bruit “compétitif” (constance  via meta.wMeta)
  const varScale = 0.10 * (1.0 / Math.max(0.5, cfg.meta.wMeta)); // +wMeta -> moins de variance
  const noiseB = 1 + (rng()-0.5)*varScale;
  const noiseR = 1 + (rng()-0.5)*varScale;

  const blueScore = bBase * bSyn * noiseB;
  const redScore  = rBase * rSyn * noiseR;

  const winner:TeamSide = blueScore >= redScore ? "BLUE" : "RED";
  const mvp = (winner==="BLUE" ? Object.values(blue) : Object.values(red))[0];

  return {
    winner,
    score: { blue: Math.round(blueScore), red: Math.round(redScore) },
    mvpChampionId: mvp!,
    log: [
      `bBase=${bBase.toFixed(1)} bSyn=${bSyn.toFixed(3)}`,
      `rBase=${rBase.toFixed(1)} rSyn=${rSyn.toFixed(3)}`,
      `winner=${winner}`
    ]
  };
}
