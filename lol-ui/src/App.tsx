import { useMemo, useState } from "react";

import Home, { type HomeAction } from "./screens/Home";
import Step1 from "./screens/NewGame/Step1";
import type { Step1Payload } from "./screens/NewGame/Step1";
import Step2League from "./screens/NewGame/Step2League";
import Step3Team, { type TeamCard } from "./screens/NewGame/Step3Team";
import Step4Confirm from "./screens/NewGame/Step4Confirm";
import Step5Generate from "./screens/NewGame/Step5Generate";
import Hub from "./screens/Hub";
import Finance from "./screens/Hub/pages/Finance";

import { getSaveStore } from "./persist/store";
import type { GameDB } from "./utils/types";
import type { SaveFile } from "./persist/types";

import "./styles/global.css";

/* ========= Accueil web par défaut ========= */
const DEFAULT_WEB_HOME = "/hub"; // <— on pointe vers le Hub

if (typeof window !== "undefined") {
  (window as any).__LOL_WEB_HOME = DEFAULT_WEB_HOME;
}

/* ========= Shell existant (étapes) ========= */
type Nav = "home" | "new1" | "new2" | "new3" | "new4" | "gen" | "hub";

function RootShell() {
  const [nav, setNav] = useState<Nav>("home");
  const [profile, setProfile] = useState<Step1Payload | null>(null);
  const [league, setLeague] = useState<"LCK" | null>(null);
  const [team, setTeam] = useState<TeamCard | null>(null);

  const store = useMemo(() => getSaveStore<GameDB>(), []);

  return (
    <>
      {nav === "home" && (
        <Home
          onAction={async (a: HomeAction) => {
            if (a === "new") { setNav("new1"); return; }
            if (a === "load") {
              const save = await store.read("slot-1");
              if (!save) { alert("Aucune sauvegarde trouvee."); return; }

              const canonical = save as SaveFile<GameDB>;
              const summary = (canonical.summary ?? {}) as Record<string, unknown>;
              const state = (canonical.state ?? {}) as Record<string, unknown>;
              const db = canonical.file;

              // expose DB + home web
              if (!(db as any).meta) (db as any).meta = {};
              if (!(db as any).meta.homeUrl) (db as any).meta.homeUrl = DEFAULT_WEB_HOME;
              if (typeof window !== "undefined") {
                (window as any).__LOL_DB = db;
                (window as any).__LOL_WEB_HOME = (db as any).meta.homeUrl;
              }

              const loadedProfile = state.profile as Step1Payload | undefined;
              const profileFallback: Step1Payload = {
                name: String(summary.manager ?? loadedProfile?.name ?? "Manager"),
                nationality: typeof (state.profile as any)?.nationality === "string" ? (state.profile as any).nationality : "KR",
                autosave: true,
                ironman: false,
              };
              setProfile(loadedProfile ?? profileFallback);

              const loadedLeague = (state.league as "LCK") ?? (summary.league as "LCK") ?? "LCK";
              setLeague(loadedLeague);

              const ctxTeam = state.team as TeamCard | undefined;
              const inferredTeamId = (summary.teamId as string | undefined) ?? ctxTeam?.id ?? db.teams[0]?.id ?? "team-1";
              const inferredTeamName = (summary.team as string | undefined)
                ?? ctxTeam?.name
                ?? db.teams.find(t => t.id === inferredTeamId)?.name
                ?? db.teams[0]?.name
                ?? "Team";
              const fallbackTeam: TeamCard = ctxTeam ?? {
                id: inferredTeamId,
                name: inferredTeamName,
                budgetEUR: 0,
                objective: "",
                stars: 3,
              };
              setTeam(fallbackTeam);

              setNav("hub");
              return;
            }
            if (a === "settings") { /* plus tard */ }
          }}
        />
      )}

      {nav === "new1" && (
        <Step1
          onBack={() => setNav("home")}
          onNext={(p: Step1Payload) => { setProfile(p); setNav("new2"); }}
        />
      )}

      {nav === "new2" && (
        <Step2League
          onBack={() => setNav("new1")}
          onChoose={(lg: "LCK") => { setLeague(lg); setNav("new3"); }}
        />
      )}

      {nav === "new3" && league === "LCK" && (
        <Step3Team
          league={league}
          onBack={() => setNav("new2")}
          onChoose={(t: TeamCard) => { setTeam(t); setNav("new4"); }}
        />
      )}

      {nav === "new4" && profile && league && team && (
        <Step4Confirm
          profile={profile}
          league={league}
          team={team}
          onBack={() => setNav("new3")}
          onLaunch={() => setNav("gen")}
        />
      )}

      {nav === "gen" && profile && league && team && (
        <Step5Generate
          profile={profile}
          league={league}
          team={team}
          onDone={() => {
            if (typeof window !== "undefined") {
              const db = (window as any).__LOL_DB as GameDB | undefined;
              if (db) {
                if (!(db as any).meta) (db as any).meta = {};
                if (!(db as any).meta.homeUrl) (db as any).meta.homeUrl = DEFAULT_WEB_HOME;
                (window as any).__LOL_WEB_HOME = (db as any).meta.homeUrl;
              } else {
                (window as any).__LOL_WEB_HOME = DEFAULT_WEB_HOME;
              }
            }
            setNav("hub");
          }}
        />
      )}

      {nav === "hub" && profile && league && team && (
        <Hub profile={profile} league={league} team={team} />
      )}
    </>
  );
}

/* ========= Route /hub indépendante ========= */
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

function deriveHubContext(db: GameDB) {
  const summary = (db as any).summary ?? {};
  const state = (db as any).state ?? {};

  const profile: Step1Payload = (state.profile as Step1Payload) ?? {
    name: String((summary as any).manager ?? "Manager"),
    nationality: typeof (state.profile as any)?.nationality === "string" ? (state.profile as any).nationality : "KR",
    autosave: true,
    ironman: false,
  };

  const league: "LCK" = (state.league as "LCK") ?? ((summary as any).league as "LCK") ?? "LCK";

  const inferredTeamId =
    ((summary as any).teamId as string | undefined) ??
    (state.team as any)?.id ??
    db.teams?.[0]?.id ??
    "team-1";

  const inferredTeamName =
    ((summary as any).team as string | undefined) ??
    (state.team as any)?.name ??
    (db.teams || []).find(t => t.id === inferredTeamId)?.name ??
    db.teams?.[0]?.name ??
    "Team";

  const team: TeamCard = (state.team as any) ?? {
    id: inferredTeamId,
    name: inferredTeamName,
    budgetEUR: 0,
    objective: "",
    stars: 3,
  };

  return { profile, league, team };
}

function HubEntry() {
  const db = typeof window !== "undefined" ? ((window as any).__LOL_DB as GameDB | undefined) : undefined;
  if (!db || !db.teams || db.teams.length === 0) {
    return <Navigate to="/" replace />;
  }
  const { profile, league, team } = deriveHubContext(db);
  return <Hub profile={profile} league={league} team={team} />;
}

/* ========= Router ========= */
import StaffSearchScreen from "./screens/StaffSearch/StaffSearch";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* App “classique” (home/new/…/hub interne) */}
        <Route path="/" element={<RootShell />} />
        {/* Hub accessible directement */}
        <Route path="/hub" element={<HubEntry />} />
        {/* Recherche staff */}
        <Route path="/staff/search" element={<StaffSearchScreen />} />
        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
        <Route path="/hub/finance" element={<Finance />} />
<Route path="/finance" element={<Navigate to="/hub/finance" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

