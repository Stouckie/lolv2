import type { Player } from "./sim/types";
import { applyPerks, StaffCtx } from "./staff";

let rookieIdCounter = 1;

export function generateRookies(count:number, roleDist:Record<string,number>, staff:StaffCtx){
  const list: Player[] = [];
  for (let i=0;i<count;i++){
    const role = pickWeighted(roleDist);
    const baseSkill = 50 + Math.random()*20;
    const id = `rookie_${rookieIdCounter++}`;
    list.push({
      id, name:`Rookie ${rookieIdCounter}`, role: role as any, age: 17 + Math.floor(Math.random()*3),
      salary: 30000 + Math.floor(Math.random()*20000), potential: 70 + Math.floor(Math.random()*25),
      ratings: {}, personality:{ discipline:50+Math.random()*40, teamplay:50+Math.random()*40, consistency:50+Math.random()*40 },
    });
  }
  return list;
}

export function scoutingDiscover(basePerWeek:number, staff:StaffCtx){
  const rate = applyPerks(basePerWeek, "SCOUT_DISCOVERY_RATE", staff);
  return Math.max(1, Math.round(rate));
}

export function scoutingInfoQuality(baseQuality:number, staff:StaffCtx){
  return Math.min(1, applyPerks(baseQuality, "SCOUT_INFO_QUALITY", staff));
}

function pickWeighted(dist:Record<string,number>){
  const sum = Object.values(dist).reduce((a,b)=>a+b,0);
  let t = Math.random()*sum;
  for (const [k,v] of Object.entries(dist)) { t -= v; if (t<=0) return k; }
  return Object.keys(dist)[0];
}

export function retirementProbability(age:number, moralePenalty=0){
  const base = Math.max(0, (age - 26) * 0.03); // 3% par an aprÃ¨s 26
  return Math.min(0.9, base + moralePenalty);
}
