import { z } from "zod";

export const Role = z.enum(["TOP","JUNGLE","MID","ADC","SUP"]);
export const Archetype = z.enum(["Assassin","Bruiser","Mage","Tank","Marksman","Enchanter"]);
export const StaffRole = z.enum(["HeadCoach","Analyst","Scout","Trainer","Psychologist","GM"]);

const ID = z.string().min(1);

export const Champion = z.object({
  id: ID, name: z.string(),
  roles: z.array(Role).min(1),
  archetype: Archetype,
  base: z.object({
    dps:z.number(), burst:z.number(), sustain:z.number(), control:z.number(), mobility:z.number(), toughness:z.number()
  }),
  scaling: z.object({ early:z.number(), mid:z.number(), late:z.number() }),
  tags: z.array(z.string()).default([])
});
export type Champion = z.infer<typeof Champion>;

export const Player = z.object({
  id: ID, name: z.string(), role: Role, age: z.number().int().min(15).max(45),
  salary: z.number().int().nonnegative(),
  potential: z.number().min(0).max(100),
  ratings: z.record(z.string(), z.number().min(0).max(100)),
  personality: z.object({
    discipline: z.number().min(0).max(100).default(50),
    teamplay: z.number().min(0).max(100).default(50),
    consistency: z.number().min(0).max(100).default(50),
    ego: z.number().min(0).max(100).default(50)
  }).default({ discipline:50, teamplay:50, consistency:50, ego:50 }),
  comfortTags: z.array(z.string()).default([]),
  currentTeamId: ID.optional()
});
export type Player = z.infer<typeof Player>;

export const StaffPerk = z.object({
  id: ID,
  trigger: z.enum([
    "DRAFT_PICK_SCORE","DRAFT_BAN_SCORE","DRAFT_LOOKAHEAD",
    "PREP_COUNTER_ACCURACY","PREP_META_READ",
    "TRAINING_GAIN","SCRIM_GAIN","FATIGUE_RECOVERY","INJURY_RISK",
    "SCOUT_DISCOVERY_RATE","SCOUT_INFO_QUALITY",
    "CONTRACT_NEGOTIATION","BUYOUT_DISCOUNT"
  ]),
  value: z.number(),
  cap: z.number().optional(),
  tags: z.array(z.string()).optional()
});
export type StaffPerk = z.infer<typeof StaffPerk>;

export const StaffMember = z.object({
  id: ID, name: z.string(), role: StaffRole,
  level: z.union([z.literal(1),z.literal(2),z.literal(3),z.literal(4),z.literal(5)]),
  salary: z.number().int().nonnegative(),
  xp: z.number().nonnegative().default(0),
  perks: z.array(StaffPerk)
});
export type StaffMember = z.infer<typeof StaffMember>;

export const Facilities = z.object({
  trainingCenterLv: z.union([z.literal(0),z.literal(1),z.literal(2),z.literal(3)]).default(0),
  analyticsLabLv:   z.union([z.literal(0),z.literal(1),z.literal(2),z.literal(3)]).default(0),
  scoutingNetworkLv:z.union([z.literal(0),z.literal(1),z.literal(2),z.literal(3)]).default(0)
});
export type Facilities = z.infer<typeof Facilities>;

/** staff = objet aux clés fixes, toutes optionnelles */
export const StaffMap = z.object({
  HeadCoach: StaffMember.optional(),
  Analyst: StaffMember.optional(),
  Scout: StaffMember.optional(),
  Trainer: StaffMember.optional(),
  Psychologist: StaffMember.optional(),
  GM: StaffMember.optional()
}).default({});
export type StaffMap = z.infer<typeof StaffMap>;

export const Team = z.object({
  id: ID, name: z.string(), region: z.string(), budget: z.number().int().nonnegative(),
  roster: z.object({ top:ID.optional(), jungle:ID.optional(), mid:ID.optional(), adc:ID.optional(), sup:ID.optional() }),
  academy: z.array(ID).default([]),
  staff: StaffMap,
  facilities: Facilities.default({ trainingCenterLv:0, analyticsLabLv:0, scoutingNetworkLv:0 })
});
export type Team = z.infer<typeof Team>;

export const MetaParams = z.object({
  enchanterBias:z.number().default(1),
  skirmishBias:z.number().default(1),
  objectiveWeight:z.number().default(1),
  wSynergy:z.number().default(0.5),
  wComfort:z.number().default(0.3),
  wMeta:z.number().default(1.0)
});
export type MetaParams = z.infer<typeof MetaParams>;

export const MatchFixture = z.object({
  id: ID, week: z.number().int().positive(),
  blueTeamId: ID, redTeamId: ID,
  bo: z.union([z.literal(1),z.literal(3),z.literal(5)]).default(1)
});
export type MatchFixture = z.infer<typeof MatchFixture>;

export const Standing = z.object({
  teamId: ID, wins:z.number().int().nonnegative(), losses:z.number().int().nonnegative(),
  form: z.array(z.number().int().min(0).max(1)).default([])
});
export type Standing = z.infer<typeof Standing>;

export const FinanceState = z.object({ cash:z.number(), revenueYTD:z.number(), expensesYTD:z.number() });
export type FinanceState = z.infer<typeof FinanceState>;

export const SaveSnapshot = z.object({
  version: z.literal(1),
  patch: z.string(),
  meta: MetaParams,
  champions: z.record(ID, Champion),
  players: z.record(ID, Player),
  teams: z.record(ID, Team),
  fixtures: z.array(MatchFixture),
  standings: z.record(ID, Standing),
  finances: z.record(ID, FinanceState),
  week: z.number().int().nonnegative()
});
export type SaveSnapshot = z.infer<typeof SaveSnapshot>;
