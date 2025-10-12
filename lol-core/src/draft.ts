import type { Champion, TeamComp, DraftContext, Role } from "./types";
import { applyPerks, staffLookaheadDepth } from "./staff";

export interface DraftOutcome { blue: TeamComp; red: TeamComp; bans: { blue:string[]; red:string[] } }

const roleKey: Record<Role, keyof TeamComp> = {
  TOP: "top",
  JUNGLE: "jungle",
  MID: "mid",
  ADC: "adc",
  SUP: "sup"
};

export function computeSynergy(
  comp: Partial<TeamComp>,
  pool: Record<string,Champion>,
  meta: DraftContext["meta"]
) {
  const ids = Object.values(comp).filter(Boolean) as string[];
  const champs = ids.map(id=>pool[id]);
  const kinds = new Set(champs.map(c=>c.archetype)).size;
  let mult = 1.0;
  if (kinds <= 3) mult *= 1.03;
  if (champs.some(c=>c.archetype==="Enchanter")) mult *= (1 + 0.02*meta.enchanterBias);
  return mult;
}

export function comfortScore(playerId:string|undefined, champ:Champion, ctx: DraftContext) {
  if (!playerId || !ctx.comfort) return 1;
  const key = `${playerId}:${champ.id}`;
  const v = ctx.comfort[key]; // 0..1
  if (v == null) return 1;
  return 0.9 + 0.2*v; // 0.9..1.1
}

export function baseChampScore(c: Champion) {
  const stat = c.base.dps*0.35 + c.base.burst*0.2 + c.base.sustain*0.1 + c.base.control*0.2 + c.base.mobility*0.05 + c.base.toughness*0.1;
  return stat * (0.9 + 0.2*c.scaling.mid);
}

export function scorePick(
  current: Partial<TeamComp>, role: Role, champ: Champion, ctx: DraftContext, playerId?:string
) {
  if (!champ.roles.includes(role)) return -Infinity;
  let score = baseChampScore(champ);
  const k = roleKey[role];
  score *= computeSynergy({ ...current, [k]: champ.id }, ctx.pool, ctx.meta);
  score *= comfortScore(playerId, champ, ctx);
  score = applyPerks(score, "DRAFT_PICK_SCORE", ctx.staff, { tags: [champ.archetype] });
  return score;
}

function pickForRole(
  role: Role, available: Set<string>, ctx: DraftContext, current: Partial<TeamComp>, playerId?:string
) {
  let best: { id:string; s:number } | undefined;
  for (const id of available) {
    const c = ctx.pool[id]; if (!c) continue;
    const s = scorePick(current, role, c, ctx, playerId);
    if (!best || s > best.s) best = { id, s };
  }
  return best?.id;
}

function banCandidates(available:Set<string>, ctx:DraftContext) {
  const list = Array.from(available).map(id => {
    const c = ctx.pool[id]!;
    const threat = baseChampScore(c);
    const tagBoost = (ctx.opponentHints??[]).some(t => c.tags?.includes(t)) ? 1.05 : 1;
    return { id, s: threat * tagBoost };
  });
  list.sort((a,b)=>b.s-a.s);
  return list.slice(0,6).map(x=>x.id);
}

function chooseBans(n:number, available:Set<string>, ctx:DraftContext) {
  const short = banCandidates(available, ctx);
  const bans:string[] = [];
  for (const id of short) {
    if (bans.length>=n) break;
    if (available.has(id)) { bans.push(id); available.delete(id); }
  }
  return bans;
}

export function simulateDraftWithBans(
  orderBlue: Role[], orderRed: Role[], ctx: DraftContext,
  playersBlue?:Record<Role,string>, playersRed?:Record<Role,string>
): DraftOutcome {
  const blue: Partial<TeamComp> = {}; const red: Partial<TeamComp> = {};
  const available = new Set(Object.keys(ctx.pool));

  const bansBlue = chooseBans(3, available, ctx);
  const bansRed  = chooseBans(3, available, ctx);

  const depth = staffLookaheadDepth(ctx.staff);

  for (let i=0;i<5;i++){
    const rb = orderBlue[i];
    const idB = pickBestLookahead(rb, available, ctx, blue, red, depth, playersBlue?.[rb]);
    if (idB) { blue[roleKey[rb]] = idB; available.delete(idB); }

    const rr = orderRed[i];
    const idR = pickBestLookahead(rr, available, ctx, red, blue, depth, playersRed?.[rr]);
    if (idR) { red[roleKey[rr]] = idR; available.delete(idR); }
  }

  return { blue: blue as TeamComp, red: red as TeamComp, bans: { blue: bansBlue, red: bansRed } };
}

function pickBestLookahead(
  role: Role, available:Set<string>, ctx:DraftContext,
  current: Partial<TeamComp>, enemy: Partial<TeamComp>, depth:number, playerId?:string
){
  let best: { id:string; val:number }|undefined;
  for (const id of available){
    const c = ctx.pool[id]; if(!c || !c.roles.includes(role)) continue;
    const s0 = scorePick(current, role, c, ctx, playerId);
    let val = s0;

    if (depth>1){
      const enemyRole =
        (["TOP","JUNGLE","MID","ADC","SUP"] as Role[])
        .find(r => !(enemy as any)[roleKey[r]]);
      if (enemyRole){
        const avail2 = new Set(available); avail2.delete(id);
        const bestCounter = pickForRole(enemyRole, avail2, ctx, enemy);
        if (bestCounter) {
          const counterVal = baseChampScore(ctx.pool[bestCounter]!);
          val = val - 0.15 * counterVal;
        }
      }
    }

    if (!best || val > best.val) best = { id, val };
  }
  return best?.id;
}
