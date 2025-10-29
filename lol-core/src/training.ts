import type { Player } from "./sim/types";
import { applyPerks, StaffCtx } from "./staff";

export function progressChampionSkill(player:Player, champId:string, minutes:number, staff:StaffCtx, fatigue=0){
  const base = 0.02 * (minutes/30); // 2% par 30 minutes
  const trainerGain = applyPerks(base, "TRAINING_GAIN", staff);
  const fatigueFactor = Math.max(0.6, 1 - fatigue*0.5); // fatigue 0..1
  const delta = trainerGain * fatigueFactor * (1 - (player.ratings[champId] ?? 0)/100) * 1.0; // rendement dÃ©croissant
  player.ratings[champId] = Math.min(100, (player.ratings[champId] ?? 0) + delta*100);
  return delta*100;
}

export function recoverFatigue(fatigue:number, staff:StaffCtx){
  const rec = applyPerks(0.2, "FATIGUE_RECOVERY", staff); // 20% par semaine * perks
  return Math.max(0, fatigue - rec);
}
