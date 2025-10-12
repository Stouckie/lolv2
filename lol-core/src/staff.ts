import type { Facilities, StaffMember, StaffPerk, PerkTrigger } from "./types";

export interface StaffCtx { staff: Partial<Record<StaffMember["role"], StaffMember>>; facilities: Facilities }

export function applyPerks(base:number, trigger:PerkTrigger, ctx:StaffCtx, extra?:{ tags?:string[] }) {
  let mult = 1;
  for (const k in ctx.staff) {
    const m = (ctx.staff as any)[k] as StaffMember | undefined; if (!m) continue;
    for (const pk of m.perks) {
      if (pk.trigger !== trigger) continue;
      if (pk.tags && extra?.tags && !pk.tags.some(t => extra.tags!.includes(t))) continue;
      mult *= (1 + pk.value);
    }
  }
  // Facilities
  if (["TRAINING_GAIN","FATIGUE_RECOVERY"].includes(trigger)) mult *= 1 + 0.05 * (ctx.facilities.trainingCenterLv||0);
  if (["PREP_COUNTER_ACCURACY"].includes(trigger)) mult *= 1 + 0.05 * (ctx.facilities.analyticsLabLv||0);
  if (["SCOUT_DISCOVERY_RATE","SCOUT_INFO_QUALITY"].includes(trigger)) mult *= 1 + 0.05 * (ctx.facilities.scoutingNetworkLv||0);
  return base * mult;
}

export function staffLookaheadDepth(ctx: StaffCtx) {
  const hc = ctx.staff.HeadCoach?.level ?? 0;
  const extra = hc >= 4 ? 1 : 0;
  return 1 + extra; // base 1, +1 si HeadCoach lvl4+
}
