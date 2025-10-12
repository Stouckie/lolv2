// Générateur déterministe de joueurs

type Role = "TOP" | "JNG" | "MID" | "ADC" | "SUP";
type TeamRep = { id: string; rep: number };

export type PlayerSeed = {
  id: string; teamId: string; name: string; role: Role;
  age: number; nat: string; ovr: number; pot: number;
  lane: number; mech: number; macro: number; champPool: number;
  style: "aggressive" | "control" | "skirmish" | "late";
  wagePerDay: number; contractEnd: string; morale: number; fitness: number; form: number;
};

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hashStr(s: string) { let h = 2166136261 >>> 0; for (let i=0;i<s.length;i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h>>>0; }

const ROLES: Role[] = ["TOP","JNG","MID","ADC","SUP"];
const NAT = "KR";
const STYLES: Array<PlayerSeed["style"]> = ["aggressive","control","skirmish","late"];
const FIRST = ["Min","Jun","Seong","Jae","Hyeon","Ji","Byun","Han","Kim","Park","Lee"];
const LAST  = ["Kim","Park","Lee","Choi","Jung","Kang","Cho","Yoon","Han","Kwon","Ryu"];

const clamp = (v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));
const round = (v:number)=>Math.round(v);
const wageFromOvr = (ovr:number)=>Math.round(Math.pow(1.18, ovr-60)*200/50)*50;
const fakeName = (rnd:()=>number)=>`${FIRST[Math.floor(rnd()*FIRST.length)]}${rnd()<.4?"-":" "}${LAST[Math.floor(rnd()*LAST.length)]}`;

export function generateTeamPlayers(team: TeamRep, seed: number): PlayerSeed[] {
  const rnd = mulberry32(seed ^ hashStr(team.id));
  const base = 60 + (team.rep - 60) * 0.6;
  const players: PlayerSeed[] = [];

  for (let i=0;i<ROLES.length;i++){
    const role = ROLES[i];
    const ovr = clamp(round(base + rnd()*10 + (i===2?2:0)), 65, 92);
    const pot = clamp(ovr + 4 + Math.floor(rnd()*6), ovr, 96);
    players.push({
      id:`p_${team.id}_${role.toLowerCase()}`, teamId:team.id, name:fakeName(rnd), role,
      age: clamp(round(19 + rnd()*8), 18, 30), nat:NAT, ovr, pot,
      lane:clamp(round(ovr + (rnd()*6-3)),50,99),
      mech:clamp(round(ovr + (rnd()*8-2)),50,99),
      macro:clamp(round(ovr + (rnd()*6-3)),50,99),
      champPool:clamp(round(50 + rnd()*40),30,100),
      style: STYLES[Math.floor(rnd()*STYLES.length)],
      wagePerDay: wageFromOvr(ovr), contractEnd: "2026-11-30",
      morale:clamp(round(65 + rnd()*25),40,100), fitness:clamp(round(90 + rnd()*10),70,100), form:clamp(round((rnd()-0.5)*4),-3,3),
    });
  }
  for (let j=0;j<2;j++){
    const role = ROLES[Math.floor(rnd()*ROLES.length)];
    const ovr = clamp(round(base - 3 + rnd()*8), 60, 88);
    const pot = clamp(ovr + 6 + Math.floor(rnd()*8), ovr, 95);
    players.push({
      id:`p_${team.id}_b${j+1}`, teamId:team.id, name:fakeName(rnd), role,
      age:clamp(round(18 + rnd()*7),17,28), nat:NAT, ovr, pot,
      lane:clamp(round(ovr + (rnd()*6-3)),50,95),
      mech:clamp(round(ovr + (rnd()*8-4)),45,95),
      macro:clamp(round(ovr + (rnd()*6-3)),45,95),
      champPool:clamp(round(40 + rnd()*40),20,90),
      style: STYLES[Math.floor(rnd()*STYLES.length)],
      wagePerDay: wageFromOvr(ovr), contractEnd: "2026-06-30",
      morale:clamp(round(60 + rnd()*30),35,100), fitness:clamp(round(88 + rnd()*10),65,100), form:clamp(round((rnd()-0.5)*4),-3,3),
    });
  }
  return players;
}

export function generateAllPlayers(teams: TeamRep[], seed: number): PlayerSeed[] {
  return teams.flatMap(t => generateTeamPlayers(t, seed));
}
