import { useState } from "react";
import type { Step1Payload } from "../NewGame/Step1";
import type { TeamCard } from "../NewGame/Step3Team";
import SquadPage from "./pages/Squad";


// ✅ CSS shell
import "../../styles/hub.css";

// Pages
import Dashboard from "./pages/Dashboard.tsx";
import Schedule from "./pages/Schedule.tsx";

// UI utilitaires
import SaveBar from "../../ui/SaveBar.tsx";
import LogoImg from "../../ui/LogoImg.tsx";

type Tab =
  | "home"
  | "inbox"
  | "squad"
  | "tactics"
  | "data"
  | "training"
  | "schedule"
  | "competitions"
  | "recruitment"
  | "transfers"
  | "club"
  | "finance"
  | "u18";

type Props = {
  profile: Step1Payload;
  league: "LCK";
  team: TeamCard;
};

type TeamExtra = {
  logo?: string;
  id?: string;
  sponsor?: string;
  budget?: number;
  payroll?: number;
  stars?: number;
  synergy?: number;
};

export default function Hub({ profile, league, team }: Props) {
  const [tab, setTab] = useState<Tab>("home");
  const t = team as TeamCard & TeamExtra;

  const logo = t.logo ?? `/logos/lck/${t.id || "default"}.png`;
  const teamName = team?.name || "Équipe";

  return (
    <div className="hub-shell">
      <aside className="hub-sidebar">
        <div className="brand">
          {/* ✅ logo avec fallback */}
          <LogoImg id={(t as any)?.id} src={logo} alt={teamName} size={28} />
          <div>
            <div className="brand-name">{teamName}</div>
            <div className="brand-sub">{league}</div>
          </div>
        </div>

        <nav className="side-nav" aria-label="Navigation Hub">
          <SideItem icon="🏠" label="Page d’accueil" active={tab === "home"} onClick={() => setTab("home")} />
          <SideItem icon="📨" label="Boîte de réception" active={tab === "inbox"} onClick={() => setTab("inbox")} />
          <SideItem icon="👥" label="Effectif" active={tab === "squad"} onClick={() => setTab("squad")} />
          <SideItem icon="🧩" label="Tactiques" active={tab === "tactics"} onClick={() => setTab("tactics")} />
          <SideItem icon="📊" label="Centre de données" active={tab === "data"} onClick={() => setTab("data")} />
          <SideItem icon="🏋️" label="Entraînement" active={tab === "training"} onClick={() => setTab("training")} />
          <SideItem icon="🗓️" label="Calendrier" active={tab === "schedule"} onClick={() => setTab("schedule")} />
          <SideItem icon="🏆" label="Compétitions" active={tab === "competitions"} onClick={() => setTab("competitions")} />
          <SideItem icon="🧭" label="Recrutement" active={tab === "recruitment"} onClick={() => setTab("recruitment")} />
          <SideItem icon="🔁" label="Transferts" active={tab === "transfers"} onClick={() => setTab("transfers")} />
          <SideItem icon="🏛️" label="Infos club" active={tab === "club"} onClick={() => setTab("club")} />
          <SideItem icon="💶" label="Finances" active={tab === "finance"} onClick={() => setTab("finance")} />
          <div className="side-sep" />
          <SideItem icon="🎓" label="U18" active={tab === "u18"} onClick={() => setTab("u18")} />
        </nav>

        <div className="sidebar-foot">
          <div className="meta">
            <span>Patch 14.20</span>
            <span>Solo</span>
          </div>
          <button className="btn-accent">Rencontres</button>
        </div>
      </aside>

      <main className="hub-main">
        <header className="hub-topbar">
          <div className="crumbs">
            <span>Hub</span>
            <span className="sep">•</span>
            <strong>{tabLabel(tab)}</strong>
          </div>

          {/* ✅ barre de sauvegarde + actions */}
          <div className="top-actions" style={{ gap: 8 }}>
            <SaveBar context={{ profile, league, team: t }} />
            <span className="pill">{profile?.name ?? "Manager"}</span>
            <button className="btn-accent">Rencontres</button>
          </div>
        </header>

        {tab === "home" && <Dashboard profile={profile} league={league} team={t} />}

        {tab === "schedule" && <Schedule league={league} team={t} />}

        {tab !== "home" && tab !== "schedule" && (
          <section className="panel placeholder">
            <h3>{tabLabel(tab)}</h3>
            <p className="muted">Cette page sera branchée plus tard. Le shell et la navigation sont prêts.</p>
          </section>
        )}
      </main>
    </div>
  );
}

function SideItem({
  icon,
  label,
  active,
  onClick,
}: {
  icon: string;
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button className={`side-item ${active ? "active" : ""}`} onClick={onClick}>
      <span className="i">{icon}</span>
      <span>{label}</span>
    </button>
  );
}

function tabLabel(t: any) {
  return (
    {
      home: "Page d’accueil",
      inbox: "Boîte de réception",
      squad: "Effectif",
      tactics: "Tactiques",
      data: "Centre de données",
      training: "Entraînement",
      schedule: "Calendrier",
      competitions: "Compétitions",
      recruitment: "Recrutement",
      transfers: "Transferts",
      club: "Infos club",
      finance: "Finances",
      u18: "U18",
    } as Record<string, string>
  )[t];
}
