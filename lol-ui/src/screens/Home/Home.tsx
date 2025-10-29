import { useEffect, useMemo, useState } from "react";
// ⬇️ conserve tes imports UI
import { Logo } from "../../ui/Logo";
import { MenuButton } from "../../ui/MenuButton";

import { getSaveStore } from "../../persist/store";
import type { GameDB } from "../../utils/types";

export type HomeAction = "new" | "load" | "settings";

export default function Home({ onAction }: { onAction: (a: HomeAction) => void }) {
  const [hasSave, setHasSave] = useState(false);
  const [patch, setPatch] = useState("14.20");
  const store = useMemo(() => getSaveStore<GameDB>(), []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const list = await store.list();
        if (!mounted) return;
        setHasSave(list.some(s => s.exists));
      } catch {
        setHasSave(false);
      }
    })();
    setPatch("14.20");
    return () => { mounted = false };
  }, [store]);

  return (
    <div className="home-root">
      <div className="bg-orb orb-1" />
      <div className="bg-orb orb-2" />
      <div className="bg-grid" />

      <header className="home-header">
        <Logo />
        <div className="home-header-right">
          <span className="pill">Patch {patch}</span>
          <span className="pill">Solo - Offline</span>
        </div>
      </header>

      <main className="home-card">
        <section className="home-hero">
          <h2>LoL Manager — Carrière LCK</h2>
          <p>Dirige ton équipe en LCK : drafts, staff, entraînement, finances. Patchs évolutifs et mercatos officiels.</p>
        </section>

        <nav className="home-menu" aria-label="Menu principal">
          <MenuButton label="Nouvelle Partie" hint="Créer une saison LCK (BO3, format réel)" primary onClick={() => onAction("new")} />
          <MenuButton label="Charger" hint={hasSave ? "Reprendre une sauvegarde" : "Aucune sauvegarde"} disabled={!hasSave} onClick={() => onAction("load")} />
          <MenuButton label="Options" hint="Affichage, sons, langue" onClick={() => onAction("settings")} />
        </nav>
      </main>

      <footer className="home-footer">
        <span>© {new Date().getFullYear()} • Build local</span>
        <span className="muted">↑ ↓ Entrée pour naviguer (bientôt)</span>
      </footer>
    </div>
  );
}
