import { useMemo, useState } from "react";

import Home, { type HomeAction } from "./screens/Home";
import Step1 from "./screens/NewGame/Step1";
import type { Step1Payload } from "./screens/NewGame/Step1";
import Step2League from "./screens/NewGame/Step2League";
import Step3Team, { type TeamCard } from "./screens/NewGame/Step3Team";
import Step4Confirm from "./screens/NewGame/Step4Confirm";
import Step5Generate from "./screens/NewGame/Step5Generate";
import Hub from "./screens/Hub";

import { getSaveStore } from "./persist/store.ts";
import type { SaveFile } from "./persist/types.ts";

import "./styles/global.css";

type Nav = "home" | "new1" | "new2" | "new3" | "new4" | "gen" | "hub";

export default function App() {
  const [nav, setNav] = useState<Nav>("home");
  const [profile, setProfile] = useState<Step1Payload | null>(null);
  const [league, setLeague] = useState<"LCK" | null>(null);
  const [team, setTeam] = useState<TeamCard | null>(null);

  const store = useMemo(() => getSaveStore<any>(), []);

  return (
    <>
      {nav === "home" && (
        <Home
          onAction={async (a: HomeAction) => {
            if (a === "new") { setNav("new1"); return; }
            if (a === "load") {
              const save = await store.read("slot-1");
              if (!save) { alert("Aucune sauvegarde trouvée."); return; }
              const st = (save as SaveFile<any>).state as any;
              setProfile(st.profile as Step1Payload);
              setLeague(st.league as "LCK");
              setTeam(st.team as TeamCard);
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
        <Step5Generate profile={profile} league={league} team={team} onDone={() => setNav("hub")} />
      )}

      {nav === "hub" && profile && league && team && (
        <Hub profile={profile} league={league} team={team} />
      )}
    </>
  );
}
