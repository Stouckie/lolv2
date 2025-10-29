import { useEffect, useMemo, useRef, useState } from "react";
import "../../../styles/tactics.css";

// Ajuste cet import si besoin (ex: "lol-core/dist/src/data/lck")
import { LCK_PLAYERS_2025 } from "@core/data/lck";

/* ============================
   Types & Constantes V1
============================ */

type League = "LCK";
type Role = "TOP" | "JGL" | "MID" | "ADC" | "SUP";
type Phase = "early" | "mid1" | "mid2" | "late";

type BaseStrategy =
  | "front_to_back"
  | "poke"
  | "pick_131"
  | "skirmish"
  | "scaling"
  | "dive"
  | "split_push";

type IntensityPreset = "ramp_up" | "early_spike" | "mid_control" | "late_scaling";

type LanePrio = "low" | "even" | "high";

type Tactic = {
  id: string;
  name: string;
  isDefault: boolean;

  style: BaseStrategy;
  intensityPreset: IntensityPreset;
  intensity: Record<Phase, number>; // 0..100

  lanePrio: { top: LanePrio; mid: LanePrio; bot: LanePrio };
  visionSplit: { top: number; river: number; bot: number }; // somme 100

  objectives: {
    plates: number;
    herald1: number;
    herald2: number;
    drake: number;
    baron: number;
    t1: number;
    t2: number;
  };

  triggers: {
    earlyGoldSwap: boolean;
    playForSoul: boolean;
    avoid5v5IfPoke: boolean;
    tradeWhenBehind: boolean;
    threatenBaron20IfAhead: boolean;
    swapIfBotLoses: boolean;
  };

  role: {
    TOP: {
      wave: "slow" | "freeze" | "push";
      duty: "split" | "teamfight";
      tp: "early" | "reactive";
      roam: "never" | "situational";
    };
    JGL: {
      clear: "full" | "3camp_gank";
      prio: "top" | "mid" | "bot";
      gankRisk: "low" | "normal" | "high";
      vision: "top" | "river" | "bot";
    };
    MID: {
      wave: "prio_roam" | "farm";
      roamFreq: "low" | "mid" | "high";
      tempo: "crash_move" | "hold_punish";
    };
    ADC: {
      lanePlan: "trade" | "farm";
      pos: "safe" | "normal" | "aggro";
      objective: "first_tower" | "drake";
    };
    SUP: {
      roamMinute: "<5" | "6_10" | ">10";
      vision: "tri" | "river" | "drake";
      duty: "protect" | "vision" | "engage";
    };
  };

  // Profil alternatif (B)
  roleB: Tactic["role"];
  useProfileBWhenBehind: boolean;

  playbooks: {
    drake: "control" | "aggressive";
    herald: "control" | "aggressive";
    baron: "control" | "aggressive";
    siege: "control" | "aggressive";
  };
};

const STRATEGY_LABEL: Record<BaseStrategy, string> = {
  front_to_back: "Front-to-Back Teamfight",
  poke: "Poke & Siege",
  pick_131: "Pick / 1-3-1",
  skirmish: "Skirmish Tempo",
  scaling: "Scaling Late",
  dive: "Dive / Hard Engage",
  split_push: "Split Push Focus",
};

const PRESET_LABEL: Record<IntensityPreset, string> = {
  ramp_up: "Ramp Up",
  early_spike: "Early Spike",
  mid_control: "Mid Control",
  late_scaling: "Late Scaling",
};

const ROLE_LABEL: Record<Role, string> = {
  TOP: "Top",
  JGL: "Jungle",
  MID: "Mid",
  ADC: "Carry AD",
  SUP: "Support",
};

const METRIC_LABEL: Record<string, string> = {
  laning: "Laning",
  mechanics: "Mechanics",
  positioning: "Positioning",
  macro: "Macro",
  decisionMaking: "Decision Making",
  teamfight: "Teamfight",
  clutch: "Clutch",
  consistency: "Consistency",
  discipline: "Discipline",
  pathing: "Pathing",
  objectiveControl: "Objectives",
  vision: "Vision",
  roaming: "Roaming",
  peelUtility: "Peel / Utility",
};

const clamp100 = (v: number | undefined) =>
  Math.max(0, Math.min(100, Number.isFinite(v as number) ? (v as number) : 0));

/* ============================
   Presets & Helpers V1
============================ */

const PRESET_INTENSITY: Record<IntensityPreset, Record<Phase, number>> = {
  ramp_up: { early: 40, mid1: 60, mid2: 75, late: 90 },
  early_spike: { early: 75, mid1: 65, mid2: 55, late: 45 },
  mid_control: { early: 45, mid1: 70, mid2: 70, late: 55 },
  late_scaling: { early: 30, mid1: 45, mid2: 60, late: 85 },
};

const DEFAULT_TACTIC = (name = "Default – Mid Control"): Tactic => ({
  id: crypto.randomUUID(),
  name,
  isDefault: true,
  style: "front_to_back",
  intensityPreset: "mid_control",
  intensity: { ...PRESET_INTENSITY["mid_control"] },
  lanePrio: { top: "even", mid: "even", bot: "even" },
  visionSplit: { top: 30, river: 40, bot: 30 },
  objectives: { plates: 50, herald1: 60, herald2: 50, drake: 60, baron: 50, t1: 55, t2: 45 },
  triggers: {
    earlyGoldSwap: false,
    playForSoul: true,
    avoid5v5IfPoke: false,
    tradeWhenBehind: true,
    threatenBaron20IfAhead: true,
    swapIfBotLoses: false,
  },
  role: {
    TOP: { wave: "push", duty: "teamfight", tp: "reactive", roam: "situational" },
    JGL: { clear: "full", prio: "mid", gankRisk: "normal", vision: "river" },
    MID: { wave: "prio_roam", roamFreq: "mid", tempo: "crash_move" },
    ADC: { lanePlan: "trade", pos: "normal", objective: "first_tower" },
    SUP: { roamMinute: "6_10", vision: "river", duty: "protect" },
  },
  roleB: {
    TOP: { wave: "slow", duty: "split", tp: "reactive", roam: "situational" },
    JGL: { clear: "full", prio: "bot", gankRisk: "low", vision: "bot" },
    MID: { wave: "farm", roamFreq: "low", tempo: "hold_punish" },
    ADC: { lanePlan: "farm", pos: "safe", objective: "drake" },
    SUP: { roamMinute: ">10", vision: "drake", duty: "protect" },
  },
  playbooks: { drake: "control", herald: "control", baron: "control", siege: "control" },
  useProfileBWhenBehind: true,
});

const STORAGE_KEY = "lolm2:tactics:v1";

/* ============================
   Team Aggregation (effectif)
============================ */

const norm = (s: unknown) => String(s ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
const TEAM_SYNONYMS: Record<string, string[]> = {
  t1: ["t1", "skt", "sktt1", "sktelecomt1", "sktelecom"],
  gen: ["gen", "geng", "gen g", "genesis", "gen.g"],
  kt: ["kt", "ktrolster", "kt-rolster"],
  hleo: ["hleo", "hanwha", "hanwhalife"],
  drx: ["drx"],
  kdf: ["kdf", "kwangdong", "freecs"],
  brion: ["brion", "okbrion", "bro", "freditbrion"],
  ns: ["ns", "nongshim", "redforce"],
  lsb: ["lsb", "liiv", "sandbox", "liivsandbox"],
  dk: ["dk", "dplus", "damwon", "dwg", "dpluskia", "damwonkia"],
};

function expandAliases(teamId: string, teamName?: string): string[] {
  const ids = new Set<string>();
  const baseId = norm(teamId);
  const baseName = norm(teamName);
  if (baseId) ids.add(baseId);
  if (baseName) ids.add(baseName);
  (TEAM_SYNONYMS[baseId] || []).forEach(x => ids.add(norm(x)));
  return Array.from(ids);
}

type TeamProfile = {
  byRole: Record<Role, { count: number } & Record<string, number>>;
  count: number;
};

function buildTeamProfile(teamId: string, teamName?: string): TeamProfile {
  const all = (LCK_PLAYERS_2025 as any[]) ?? [];
  const keys = expandAliases(teamId, teamName);
  const m: TeamProfile = {
    count: 0,
    byRole: { TOP: { count: 0 }, JGL: { count: 0 }, MID: { count: 0 }, ADC: { count: 0 }, SUP: { count: 0 } },
  };
  const roleMap: Record<string, Role> = { JNG: "JGL", JGL: "JGL", TOP: "TOP", MID: "MID", ADC: "ADC", SUP: "SUP" };

  const pool = all.filter((p) => {
    const tid = norm(p.teamId);
    return keys.some((k) => tid.includes(k) || tid === k);
  });

  for (const p of pool) {
    const r = roleMap[String(p.rolePrimary || p.role || "MID").toUpperCase()] || "MID";
    m.byRole[r].count++;
    for (const k of Object.keys(METRIC_LABEL)) {
      const v = clamp100(p[k]);
      m.byRole[r][k] = (m.byRole[r][k] || 0) + v;
    }
    m.count++;
  }
  for (const r of Object.keys(m.byRole) as Role[]) {
    const n = m.byRole[r].count || 1;
    for (const k of Object.keys(METRIC_LABEL)) {
      m.byRole[r][k] = Math.round((m.byRole[r][k] || 0) / n);
    }
  }
  return m;
}

/* ============================
   Coach Summary
============================ */

type Weights = Partial<Record<Role, Partial<Record<string, number>>>>;

const STYLE_WEIGHTS: Record<BaseStrategy, Weights> = {
  front_to_back: {
    ADC: { positioning: 0.25, mechanics: 0.15, teamfight: 0.30, consistency: 0.1, discipline: 0.1 },
    MID: { positioning: 0.15, mechanics: 0.15, teamfight: 0.2, macro: 0.2, decisionMaking: 0.2 },
    JGL: { macro: 0.25, objectiveControl: 0.25, pathing: 0.2, vision: 0.2 },
    SUP: { peelUtility: 0.25, vision: 0.25, positioning: 0.15, teamfight: 0.15, discipline: 0.1 },
    TOP: { teamfight: 0.25, positioning: 0.2, discipline: 0.15, laning: 0.15, macro: 0.15 },
  },
  poke: {
    ADC: { mechanics: 0.25, positioning: 0.25, consistency: 0.15, discipline: 0.1, teamfight: 0.1 },
    MID: { mechanics: 0.25, positioning: 0.25, macro: 0.15, decisionMaking: 0.15, roaming: 0.1 },
    JGL: { macro: 0.25, vision: 0.25, pathing: 0.2, objectiveControl: 0.15 },
    SUP: { vision: 0.35, peelUtility: 0.2, positioning: 0.15, discipline: 0.1 },
    TOP: { laning: 0.2, positioning: 0.2, macro: 0.15, discipline: 0.1 },
  },
  pick_131: {
    MID: { roaming: 0.25, mechanics: 0.2, positioning: 0.15, decisionMaking: 0.2, macro: 0.2 },
    JGL: { pathing: 0.25, macro: 0.25, vision: 0.2, decisionMaking: 0.15 },
    TOP: { laning: 0.25, macro: 0.2, positioning: 0.2, discipline: 0.15 },
    ADC: { positioning: 0.2, consistency: 0.15, mechanics: 0.15 },
    SUP: { vision: 0.3, roaming: 0.2, peelUtility: 0.15 },
  },
  skirmish: {
    JGL: { pathing: 0.25, mechanics: 0.2, macro: 0.2, decisionMaking: 0.15 },
    MID: { mechanics: 0.25, laning: 0.2, positioning: 0.15, roaming: 0.15 },
    TOP: { laning: 0.25, mechanics: 0.2, positioning: 0.15 },
    ADC: { mechanics: 0.2, positioning: 0.2, clutch: 0.15 },
    SUP: { vision: 0.25, peelUtility: 0.15, roaming: 0.15 },
  },
  scaling: {
    ADC: { positioning: 0.25, consistency: 0.2, discipline: 0.2, mechanics: 0.15 },
    MID: { macro: 0.25, decisionMaking: 0.2, positioning: 0.2, mechanics: 0.1 },
    JGL: { macro: 0.25, objectiveControl: 0.25, vision: 0.2 },
    TOP: { discipline: 0.2, laning: 0.2, macro: 0.2 },
    SUP: { vision: 0.3, peelUtility: 0.2, discipline: 0.1 },
  },
  dive: {
    JGL: { pathing: 0.25, mechanics: 0.2, decisionMaking: 0.2, vision: 0.15 },
    SUP: { peelUtility: 0.15, vision: 0.2 },
    MID: { mechanics: 0.25, teamfight: 0.2, positioning: 0.15 },
    TOP: { teamfight: 0.25, laning: 0.2, positioning: 0.15 },
    ADC: { positioning: 0.25, teamfight: 0.2, discipline: 0.15 },
  },
  split_push: {
    TOP: { laning: 0.25, macro: 0.25, positioning: 0.2, discipline: 0.15 },
    JGL: { macro: 0.25, pathing: 0.2, vision: 0.2 },
    MID: { macro: 0.25, decisionMaking: 0.2, roaming: 0.2 },
    ADC: { positioning: 0.2, consistency: 0.15 },
    SUP: { vision: 0.3, roaming: 0.2 },
  },
};

function computeSuitability(style: BaseStrategy, team: TeamProfile): { score: number; notes: string[] } {
  const W = STYLE_WEIGHTS[style];
  let sum = 0, count = 0;
  for (const r of Object.keys(ROLE_LABEL) as Role[]) {
    const roleWeights = W[r];
    if (!roleWeights) continue;
    for (const k of Object.keys(roleWeights)) {
      const w = roleWeights[k]!;
      const v = clamp100((team.byRole[r] as any)?.[k] ?? 50);
      sum += v * w;
      count += w;
    }
  }
  const score = Math.round(sum / (count || 1));
  const notes: string[] = [];
  if ((team.byRole.SUP.vision ?? 0) < 60 && (W.SUP?.vision || 0) > 0.2) notes.push("Vision support faible pour ce style");
  if ((team.byRole.JGL.macro ?? 0) < 60 && (W.JGL?.macro || 0) > 0.2) notes.push("Macro jungle à renforcer");
  if ((team.byRole.MID.mechanics ?? 0) < 60 && (W.MID?.mechanics || 0) > 0.2) notes.push("Mechanics mid en dessous des attentes");
  return { score, notes };
}

/* ============================
   Storage
============================ */

function loadTactics(): Tactic[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [DEFAULT_TACTIC()];
    const arr = JSON.parse(raw) as Tactic[];
    return arr.length ? arr : [DEFAULT_TACTIC()];
  } catch {
    return [DEFAULT_TACTIC()];
  }
}
function saveTactics(list: Tactic[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

/* ============================
   UI
============================ */

export default function TacticsPage({
  league,
  team,
}: {
  league: League;
  team: { id: string; name: string };
}) {
  const [tactics, setTactics] = useState<Tactic[]>(() => loadTactics());
  const [currentId, setCurrentId] = useState<string>(() => tactics[0]?.id);
  const current = tactics.find((t) => t.id === currentId) ?? tactics[0];

  useEffect(() => saveTactics(tactics), [tactics]);

  const teamProfile = useMemo(() => buildTeamProfile(team?.id, team?.name), [team?.id, team?.name]);
  const coach = useMemo(() => computeSuitability(current.style, teamProfile), [current.style, teamProfile]);

  function update(fn: (draft: Tactic) => void) {
    setTactics((list) => list.map((t) => (t.id === current.id ? { ...t, ...(fn(t), t) } : t)));
  }

  function addNew() {
    const nt = DEFAULT_TACTIC(`Tactic ${tactics.length + 1}`);
    nt.isDefault = tactics.every((t) => !t.isDefault);
    setTactics((list) => [...list, nt]);
    setCurrentId(nt.id);
  }
  function duplicate() {
    const copy = { ...current, id: crypto.randomUUID(), name: current.name + " (copy)", isDefault: false };
    setTactics((list) => [...list, copy]);
    setCurrentId(copy.id);
  }
  function remove() {
    if (tactics.length <= 1) return;
    const next = tactics.filter((t) => t.id !== current.id);
    if (!next.some((t) => t.isDefault)) next[0].isDefault = true;
    setTactics(next);
    setCurrentId(next[0].id);
  }
  function setDefault() {
    setTactics((list) =>
      list.map((t) => ({ ...t, isDefault: t.id === current.id }))
    );
  }
  function applyPreset(p: IntensityPreset) {
    update((d) => {
      d.intensityPreset = p;
      d.intensity = { ...PRESET_INTENSITY[p] };
    });
  }

  /* ========== Sticky anchors & accordion state ========== */
  const secBase = useRef<HTMLDivElement>(null);
  const secLanes = useRef<HTMLDivElement>(null);
  const secObjectives = useRef<HTMLDivElement>(null);
  const secRoles = useRef<HTMLDivElement>(null);
  const secPlaybooks = useRef<HTMLDivElement>(null);
  const secTriggers = useRef<HTMLDivElement>(null);

  const [open, setOpen] = useState<Record<string, boolean>>({
    base: true, lanes: true, objectives: true, roles: true, playbooks: true, triggers: true,
  });
  const [density, setDensity] = useState<"comfort" | "compact">("comfort");
  const [activeRole, setActiveRole] = useState<Role>("MID");
  const [profileTab, setProfileTab] = useState<"A" | "B">("A");

 function scrollTo(ref: { current: HTMLElement | null }) {
  ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
}
  function toggleAll(next: boolean) {
    setOpen({ base: next, lanes: next, objectives: next, roles: next, playbooks: next, triggers: next });
  }

  /* ========== Reset helpers (burger actions) ========== */
  const DEFAULT = DEFAULT_TACTIC();

  function resetBase() { update(d => { d.style = DEFAULT.style; applyPreset(d.intensityPreset); }); }
  function resetCurveToPreset() { update(d => { d.intensity = { ...PRESET_INTENSITY[d.intensityPreset] }; }); }
  function resetLanesVision() { update(d => { d.lanePrio = { ...DEFAULT.lanePrio }; d.visionSplit = { ...DEFAULT.visionSplit }; }); }
  function resetObjectives() { update(d => { d.objectives = { ...DEFAULT.objectives }; }); }
  function resetPlaybooks() { update(d => { d.playbooks = { ...DEFAULT.playbooks }; }); }
  function resetTriggers() { update(d => { d.triggers = { ...DEFAULT.triggers }; }); }
  function copyRoleAtoB(r: Role) { update(d => { d.roleB[r] = { ...d.role[r] } as any; }); }
  function copyRoleBtoA(r: Role) { update(d => { d.role[r] = { ...d.roleB[r] } as any; }); }

  /* ========== Overview computed bits ========== */
  const top3Objectives = useMemo(() => {
    return Object.entries(current.objectives)
      .sort((a,b) => b[1]-a[1])
      .slice(0,3)
      .map(([k]) => k);
  }, [current.objectives]);

  const intensityArray: number[] = [current.intensity.early, current.intensity.mid1, current.intensity.mid2, current.intensity.late];

  return (
    <div className={`tact-shell ${density}`}>
      {/* Header */}
      <header className="tact-head">
        <div className="sel">
          <label className="small">Tactique</label>
          <select className="input" value={currentId} onChange={(e) => setCurrentId(e.target.value)}>
            {tactics.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}{t.isDefault ? " • (défaut)" : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="name-edit">
          <input className="input" value={current.name} onChange={(e) => update((d) => (d.name = e.target.value))} />
          {current.isDefault && <span className="tag">Par défaut</span>}
        </div>

        <div className="actions">
          <button className="btn" onClick={addNew}>+ Nouvelle</button>
          <button className="btn" onClick={duplicate}>Dupliquer</button>
          <button className="btn" onClick={setDefault}>Définir par défaut</button>
          <button className="btn danger" onClick={remove} disabled={tactics.length <= 1}>Supprimer</button>
        </div>

        <div className="density">
          <span className="small">Densité</span>
          <div className="seg">
            <button className={`seg-btn ${density==="comfort"?"on":""}`} onClick={()=>setDensity("comfort")}>Confort</button>
            <button className={`seg-btn ${density==="compact"?"on":""}`} onClick={()=>setDensity("compact")}>Compact</button>
          </div>
        </div>
      </header>

      {/* Overview sticky (résumé + liens d’édition) */}
      <div className="tact-overview">
        <div className="ov-item">
          <div className="ov-label">Style</div>
          <div className="ov-value">{STRATEGY_LABEL[current.style]}</div>
          <button className="icon-btn" title="Modifier" onClick={()=>scrollTo(secBase)}>✎</button>
        </div>

        <div className="ov-item">
          <div className="ov-label">Intensité</div>
          <div className="spark">
            {intensityArray.map((v,i)=>(
              <div key={i} className="spark-bar" style={{height: `${Math.max(8, v/1.4)}px`}} title={String(v)} />
            ))}
          </div>
          <div className="ov-sub">{PRESET_LABEL[current.intensityPreset]}</div>
          <button className="icon-btn" title="Modifier" onClick={()=>scrollTo(secBase)}>✎</button>
        </div>

        <div className="ov-item ov-vision">
          <div className="ov-label">Vision</div>
          <div className="vision-bar small">
            <div style={{width: `${current.visionSplit.top}%`}}>Top {current.visionSplit.top}%</div>
            <div style={{width: `${current.visionSplit.river}%`}}>River {current.visionSplit.river}%</div>
            <div style={{width: `${current.visionSplit.bot}%`}}>Bot {current.visionSplit.bot}%</div>
          </div>
          <button className="icon-btn" title="Modifier" onClick={()=>scrollTo(secLanes)}>✎</button>
        </div>

        <div className="ov-item">
          <div className="ov-label">Lane prio</div>
          <div className="ov-chips">
            <span className="chip tiny">Top: {current.lanePrio.top}</span>
            <span className="chip tiny">Mid: {current.lanePrio.mid}</span>
            <span className="chip tiny">Bot: {current.lanePrio.bot}</span>
          </div>
          <button className="icon-btn" title="Modifier" onClick={()=>scrollTo(secLanes)}>✎</button>
        </div>

        <div className="ov-item">
          <div className="ov-label">Playbooks</div>
          <div className="ov-chips">
            {(["drake","herald","baron","siege"] as const).map(pb=>(
              <span key={pb} className="chip tiny">{pb}: {current.playbooks[pb]}</span>
            ))}
          </div>
          <button className="icon-btn" title="Modifier" onClick={()=>scrollTo(secPlaybooks)}>✎</button>
        </div>

        <div className="ov-item">
          <div className="ov-label">Objectifs (Top 3)</div>
          <div className="ov-chips">
            {top3Objectives.map(k => <span key={k} className="chip tiny strong">{k}</span>)}
          </div>
          <button className="icon-btn" title="Modifier" onClick={()=>scrollTo(secObjectives)}>✎</button>
        </div>

        <div className="ov-tools">
          <button className="btn ghost" onClick={()=>toggleAll(false)}>Tout replier</button>
          <button className="btn ghost" onClick={()=>toggleAll(true)}>Tout développer</button>
        </div>
      </div>

      {/* Content grid : gauche (édition), droite (coach sticky) */}
      <div className="tact-content">
        <div className="left">

          {/* ==== Section: Base & Intensité ==== */}
          <section ref={secBase} className={`panel acc ${open.base?"":"collapsed"}`}>
            <div className="acc-head">
              <button className="acc-toggle" onClick={()=>setOpen(o=>({...o, base:!o.base}))}>
                <span>Base Strategy & Intensité</span><i className="caret">▾</i>
              </button>
              <details className="kebab">
                <summary>⋮</summary>
                <div className="menu">
                  <button onClick={resetBase}>Réinitialiser style & preset</button>
                  <button onClick={resetCurveToPreset}>Recalibrer sur le preset</button>
                </div>
              </details>
            </div>

            <div className="acc-body">
              <div className="field">
                <label>Style d’équipe</label>
                <select
                  className="input"
                  value={current.style}
                  onChange={(e) => update((d) => (d.style = e.target.value as BaseStrategy))}
                >
                  {(Object.keys(STRATEGY_LABEL) as BaseStrategy[]).map((k) => (
                    <option key={k} value={k}>{STRATEGY_LABEL[k]}</option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label>Courbe d’intensité</label>
                <div className="row gap wrap">
                  {(Object.keys(PRESET_LABEL) as IntensityPreset[]).map((p) => (
                    <button
                      key={p}
                      className={`chip ${current.intensityPreset===p ? "active":""}`}
                      onClick={() => applyPreset(p)}
                    >
                      {PRESET_LABEL[p]}
                    </button>
                  ))}
                </div>

                <div className="curve">
                  {(["early","mid1","mid2","late"] as Phase[]).map(ph => (
                    <div key={ph} className="curve-row">
                      <span className="curve-label">
                        {ph==="early"?"0–8":ph==="mid1"?"8–14":ph==="mid2"?"14–20":"20+"} :
                      </span>
                      <input
                        type="range" min={0} max={100}
                        value={current.intensity[ph]}
                        onChange={(e)=>update(d=>d.intensity[ph]=Number(e.target.value))}
                      />
                      <span className="curve-val">{current.intensity[ph]}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* ==== Section: Lane prio & Vision ==== */}
          <section ref={secLanes} className={`panel acc ${open.lanes?"":"collapsed"}`}>
            <div className="acc-head">
              <button className="acc-toggle" onClick={()=>setOpen(o=>({...o, lanes:!o.lanes}))}>
                <span>Lane prio & Répartition vision</span><i className="caret">▾</i>
              </button>
              <details className="kebab">
                <summary>⋮</summary>
                <div className="menu">
                  <button onClick={resetLanesVision}>Réinitialiser</button>
                </div>
              </details>
            </div>

            <div className="acc-body two">
              <div>
                <label>Priorité des lanes</label>
                {(["top","mid","bot"] as const).map((lane)=>(
                  <div key={lane} className="row between">
                    <span className="mini">{lane.toUpperCase()}</span>
                    <select className="input mini"
                      value={current.lanePrio[lane]}
                      onChange={(e)=>update(d=>(d.lanePrio as any)[lane]=e.target.value as LanePrio)}>
                      <option value="low">Faible</option>
                      <option value="even">Neutre</option>
                      <option value="high">Forte</option>
                    </select>
                  </div>
                ))}
              </div>

              <div>
                <label>Répartition vision (somme 100)</label>
                {(["top","river","bot"] as const).map(area=>(
                  <div key={area} className="vs-row">
                    <span className="mini">{area}</span>
                    <input
                      type="number" className="input mini"
                      value={current.visionSplit[area]}
                      onChange={(e)=>update(d=>{
                        const v = Math.max(0, Math.min(100, Number(e.target.value)));
                        d.visionSplit[area] = v;
                        const tot = d.visionSplit.top + d.visionSplit.river + d.visionSplit.bot;
                        if (tot !== 100) {
                          const f = 100 / (tot || 1);
                          d.visionSplit.top = Math.round(d.visionSplit.top * f);
                          d.visionSplit.river = Math.round(d.visionSplit.river * f);
                          d.visionSplit.bot = 100 - d.visionSplit.top - d.visionSplit.river;
                        }
                      })}
                    />
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ==== Section: Objectifs ==== */}
          <section ref={secObjectives} className={`panel acc ${open.objectives?"":"collapsed"}`}>
            <div className="acc-head">
              <button className="acc-toggle" onClick={()=>setOpen(o=>({...o, objectives:!o.objectives}))}>
                <span>Priorités d’objectifs</span><i className="caret">▾</i>
              </button>
              <details className="kebab">
                <summary>⋮</summary>
                <div className="menu">
                  <button onClick={resetObjectives}>Réinitialiser</button>
                </div>
              </details>
            </div>

            <div className="acc-body">
              <div className="goals">
                {Object.entries(current.objectives).map(([k,v])=>(
                  <div key={k} className="goal-row zebra">
                    <span className="mini">{k}</span>
                    <input type="range" min={0} max={100} value={v}
                      onChange={(e)=>update(d=>(d.objectives as any)[k]=Number(e.target.value))}/>
                    <span className="curve-val">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ==== Section: Consignes par rôle (onglets + A/B) ==== */}
          <section ref={secRoles} className={`panel acc ${open.roles?"":"collapsed"}`}>
            <div className="acc-head">
              <button className="acc-toggle" onClick={()=>setOpen(o=>({...o, roles:!o.roles}))}>
                <span>Consignes par rôle</span><i className="caret">▾</i>
              </button>
              <details className="kebab">
                <summary>⋮</summary>
                <div className="menu">
                  <button onClick={()=>copyRoleAtoB(activeRole)}>Copier A → B (rôle actif)</button>
                  <button onClick={()=>copyRoleBtoA(activeRole)}>Copier B → A (rôle actif)</button>
                </div>
              </details>
            </div>

            <div className="acc-body">
              <div className="tabs">
                {(Object.keys(ROLE_LABEL) as Role[]).map(r=>(
                  <button key={r}
                    className={`tab ${activeRole===r?"on":""}`}
                    onClick={()=>setActiveRole(r)}
                  >{ROLE_LABEL[r]}</button>
                ))}
                <div className="spacer" />
                <div className="seg">
                  <button className={`seg-btn ${profileTab==="A"?"on":""}`} onClick={()=>setProfileTab("A")}>Profil A</button>
                  <button className={`seg-btn ${profileTab==="B"?"on":""}`} onClick={()=>setProfileTab("B")}>Profil B</button>
                </div>
              </div>

              <div className="role-summary">
                {/* ligne de chips récap express */}
                <RoleSummary role={activeRole} data={profileTab==="A" ? current.role[activeRole] : current.roleB[activeRole]} />
              </div>

              <div className="role-editor">
                <RoleEditor
                  role={activeRole}
                  data={profileTab==="A" ? current.role[activeRole] : current.roleB[activeRole]}
                  onChange={(val)=>update(d=>{
                    if (profileTab==="A") d.role[activeRole]=val as any;
                    else d.roleB[activeRole]=val as any;
                  })}
                />
              </div>

              <div className="row mt">
                <label className="check">
                  <input type="checkbox"
                    checked={current.useProfileBWhenBehind}
                    onChange={(e)=>update(d=>{ d.useProfileBWhenBehind = e.target.checked; })}
                  />
                  Utiliser le profil B quand on est behind
                </label>
              </div>
            </div>
          </section>

          {/* ==== Section: Playbooks ==== */}
          <section ref={secPlaybooks} className={`panel acc ${open.playbooks?"":"collapsed"}`}>
            <div className="acc-head">
              <button className="acc-toggle" onClick={()=>setOpen(o=>({...o, playbooks:!o.playbooks}))}>
                <span>Playbooks (mode)</span><i className="caret">▾</i>
              </button>
              <details className="kebab">
                <summary>⋮</summary>
                <div className="menu">
                  <button onClick={resetPlaybooks}>Réinitialiser</button>
                </div>
              </details>
            </div>

            <div className="acc-body">
              <div className="playbooks">
                {(["drake","herald","baron","siege"] as const).map((pb)=>(
                  <div key={pb} className="pb-row zebra">
                    <span className="mini">{pb}</span>
                    <div className="row gap">
                      {(["control","aggressive"] as const).map(mode=>(
                        <button
                          key={mode}
                          className={`chip ${current.playbooks[pb]===mode?"active":""}`}
                          onClick={()=>update(d=>{ d.playbooks[pb]=mode; })}
                        >
                          {mode}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ==== Section: Triggers ==== */}
          <section ref={secTriggers} className={`panel acc ${open.triggers?"":"collapsed"}`}>
            <div className="acc-head">
              <button className="acc-toggle" onClick={()=>setOpen(o=>({...o, triggers:!o.triggers}))}>
                <span>Déclencheurs</span><i className="caret">▾</i>
              </button>
              <details className="kebab">
                <summary>⋮</summary>
                <div className="menu">
                  <button onClick={resetTriggers}>Tout décocher</button>
                </div>
              </details>
            </div>

            <div className="acc-body">
              <div className="triggers">
                <label className="check"><input type="checkbox"
                  checked={current.triggers.earlyGoldSwap}
                  onChange={(e)=>update(d=>d.triggers.earlyGoldSwap=e.target.checked)}/> +2k à 12:00 ⇒ swap & Herald</label>
                <label className="check"><input type="checkbox"
                  checked={current.triggers.playForSoul}
                  onChange={(e)=>update(d=>d.triggers.playForSoul=e.target.checked)}/> 2 drakes ⇒ jouer Soul (vision bot 60%)</label>
                <label className="check"><input type="checkbox"
                  checked={current.triggers.avoid5v5IfPoke}
                  onChange={(e)=>update(d=>d.triggers.avoid5v5IfPoke=e.target.checked)}/> vs poke adverse ⇒ éviter 5v5 fermés</label>
                <label className="check"><input type="checkbox"
                  checked={current.triggers.tradeWhenBehind}
                  onChange={(e)=>update(d=>d.triggers.tradeWhenBehind=e.target.checked)}/> behind ⇒ trade objectifs (pas de 5v5)</label>
                <label className="check"><input type="checkbox"
                  checked={current.triggers.threatenBaron20IfAhead}
                  onChange={(e)=>update(d=>d.triggers.threatenBaron20IfAhead=e.target.checked)}/> +3k à 20:00 ⇒ menacer Baron</label>
                <label className="check"><input type="checkbox"
                  checked={current.triggers.swapIfBotLoses}
                  onChange={(e)=>update(d=>d.triggers.swapIfBotLoses=e.target.checked)}/> bot perd fort ⇒ swap pour plates</label>
              </div>
            </div>
          </section>
        </div>

        {/* ===== Right rail — Coach (sticky) ===== */}
        <aside className="right">
          <div className="coach panel sticky">
            <div className="coach-ring">
              <div className={`ring ${coach.score>=85?"s4":coach.score>=75?"s3":coach.score>=60?"s2":"s1"}`}>
                <span>{coach.score}</span>
              </div>
              <div className="ring-label">Compatibilité</div>
              <div className="ring-sub">avec {team?.name}</div>
            </div>

            <div className="panel-sub">Forces</div>
            <ul className="coach-notes">
              {coach.score>=75 ? (
                <li>• Style adapté à vos profils clés</li>
              ) : (
                <li className="muted">• Aucune force majeure détectée</li>
              )}
            </ul>

            <div className="panel-sub">Risques</div>
            <ul className="coach-notes">
              {coach.notes.length === 0 && <li className="muted">• Rien à signaler</li>}
              {coach.notes.map((n,i)=>(
                <li key={i}>• {n}</li>
              ))}
            </ul>

            <div className="panel-sub small">Vision (répartition)</div>
            <div className="vision-bar">
              <div style={{width: `${current.visionSplit.top}%`}}>Top {current.visionSplit.top}%</div>
              <div style={{width: `${current.visionSplit.river}%`}}>River {current.visionSplit.river}%</div>
              <div style={{width: `${current.visionSplit.bot}%`}}>Bot {current.visionSplit.bot}%</div>
            </div>

            <div className="panel-sub small">Timeline intensité</div>
            <div className="timeline">
              {(["early","mid1","mid2","late"] as Phase[]).map(ph=>(
                <div key={ph} className="tseg">
                  <div className="tbar" style={{height:`${Math.max(8, current.intensity[ph]/1.2)}px`}} />
                  <span>{ph==="early"?"0–8":ph==="mid1"?"8–14":ph==="mid2"?"14–20":"20+"}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

/* ========= sous-composants ========= */

function RoleSummary({
  role, data
}: { role: Role; data: Tactic["role"][Role]; }) {
  if (role === "TOP") {
    const d = data as Tactic["role"]["TOP"];
    return <div className="summary-line">
      <span className="chip tiny">Wave: {d.wave}</span>
      <span className="chip tiny">Duty: {d.duty}</span>
      <span className="chip tiny">TP: {d.tp}</span>
      <span className="chip tiny">Roam: {d.roam}</span>
    </div>;
  }
  if (role === "JGL") {
    const d = data as Tactic["role"]["JGL"];
    return <div className="summary-line">
      <span className="chip tiny">Clear: {d.clear}</span>
      <span className="chip tiny">Prio: {d.prio}</span>
      <span className="chip tiny">Risk: {d.gankRisk}</span>
      <span className="chip tiny">Vision: {d.vision}</span>
    </div>;
  }
  if (role === "MID") {
    const d = data as Tactic["role"]["MID"];
    return <div className="summary-line">
      <span className="chip tiny">Wave: {d.wave}</span>
      <span className="chip tiny">Roam: {d.roamFreq}</span>
      <span className="chip tiny">Tempo: {d.tempo}</span>
    </div>;
  }
  if (role === "ADC") {
    const d = data as Tactic["role"]["ADC"];
    return <div className="summary-line">
      <span className="chip tiny">Plan: {d.lanePlan}</span>
      <span className="chip tiny">Pos: {d.pos}</span>
      <span className="chip tiny">Obj: {d.objective}</span>
    </div>;
  }
  const d = data as Tactic["role"]["SUP"];
  return <div className="summary-line">
    <span className="chip tiny">Roam: {d.roamMinute}</span>
    <span className="chip tiny">Vision: {d.vision}</span>
    <span className="chip tiny">Duty: {d.duty}</span>
  </div>;
}

function RoleEditor({
  role, data, onChange
}: {
  role: Role;
  data: Tactic["role"][Role];
  onChange: (val: any) => void;
}) {
  if (role === "TOP") {
    const d = data as Tactic["role"]["TOP"];
    return (
      <div className="role-grid">
        <RowRadio label="Wave" value={d.wave} onChange={(v)=>onChange({ ...d, wave:v })}
          options={[["slow","Slow push"],["freeze","Freeze"],["push","Perma-push"]]}/>
        <RowRadio label="Duty" value={d.duty} onChange={(v)=>onChange({ ...d, duty:v })}
          options={[["split","Split"],["teamfight","Teamfight"]]}/>
        <RowRadio label="TP" value={d.tp} onChange={(v)=>onChange({ ...d, tp:v })}
          options={[["early","Early"],["reactive","Reactive"]]}/>
        <RowRadio label="Roam" value={d.roam} onChange={(v)=>onChange({ ...d, roam:v })}
          options={[["never","Jamais"],["situational","Situations"]]} />
      </div>
    );
  }
  if (role === "JGL") {
    const d = data as Tactic["role"]["JGL"];
    return (
      <div className="role-grid">
        <RowRadio label="Clear" value={d.clear} onChange={(v)=>onChange({ ...d, clear:v })}
          options={[["full","Full clear"],["3camp_gank","3-camp → gank"]]}/>
        <RowRadio label="Prio" value={d.prio} onChange={(v)=>onChange({ ...d, prio:v })}
          options={[["top","Top"],["mid","Mid"],["bot","Bot"]]}/>
        <RowRadio label="Gank risk" value={d.gankRisk} onChange={(v)=>onChange({ ...d, gankRisk:v })}
          options={[["low","Faible"],["normal","Normal"],["high","Élevé"]]}/>
        <RowRadio label="Vision" value={d.vision} onChange={(v)=>onChange({ ...d, vision:v })}
          options={[["top","Top"],["river","River"],["bot","Bot"]]}/>
      </div>
    );
  }
  if (role === "MID") {
    const d = data as Tactic["role"]["MID"];
    return (
      <div className="role-grid">
        <RowRadio label="Wave" value={d.wave} onChange={(v)=>onChange({ ...d, wave:v })}
          options={[["prio_roam","Prio roam"],["farm","Farm"]]}/>
        <RowRadio label="Roam freq" value={d.roamFreq} onChange={(v)=>onChange({ ...d, roamFreq:v })}
          options={[["low","Rare"],["mid","Standard"],["high","Souvent"]]}/>
        <RowRadio label="Tempo" value={d.tempo} onChange={(v)=>onChange({ ...d, tempo:v })}
          options={[["crash_move","Crash & move"],["hold_punish","Hold & punish"]]}/>
      </div>
    );
  }
  if (role === "ADC") {
    const d = data as Tactic["role"]["ADC"];
    return (
      <div className="role-grid">
        <RowRadio label="Lane plan" value={d.lanePlan} onChange={(v)=>onChange({ ...d, lanePlan:v })}
          options={[["trade","Trade court"],["farm","Farm/Scaling"]]}/>
        <RowRadio label="Positioning" value={d.pos} onChange={(v)=>onChange({ ...d, pos:v })}
          options={[["safe","Safe"],["normal","Normal"],["aggro","Aggro"]]}/>
        <RowRadio label="Objective" value={d.objective} onChange={(v)=>onChange({ ...d, objective:v })}
          options={[["first_tower","First tower"],["drake","Drakes"]]}/>
      </div>
    );
  }
  // SUP
  const d = data as Tactic["role"]["SUP"];
  return (
    <div className="role-grid">
      <RowRadio label="Roam minute" value={d.roamMinute} onChange={(v)=>onChange({ ...d, roamMinute:v })}
        options={[["<5","<5"],["6_10","6–10"],[">10",">10"]]}/>
      <RowRadio label="Vision" value={d.vision} onChange={(v)=>onChange({ ...d, vision:v })}
        options={[["tri","Tri-bush"],["river","Rivière"],["drake","Drake"]]}/>
      <RowRadio label="Duty" value={d.duty} onChange={(v)=>onChange({ ...d, duty:v })}
        options={[["protect","Protect"],["vision","Vision"],["engage","Engage"]]}/>
    </div>
  );
}

function RowRadio({
  label, value, onChange, options
}: {
  label: string;
  value: string;
  onChange: (v: any) => void;
  options: [string, string][];
}) {
  return (
    <div className="row-radio">
      <div className="rlabel">{label}</div>
      <div className="ropts">
        {options.map(([val, lab]) => (
          <label key={val} className={`rbtn ${value===val?"on":""}`}>
            <input type="radio" checked={value === val} onChange={() => onChange(val)} />
            <span>{lab}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
