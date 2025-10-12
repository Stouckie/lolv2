import { useRef } from "react";
import { saveJsonFile, openJsonFile } from "../persist/fs";

// Format générique
type SaveFile<T = any> = {
  version: number;
  savedAt: string; // ISO
  summary?: { manager?: string; league?: string; team?: string; week?: number };
  state: T;
};

function parse<T = any>(raw: string | null): T | null {
  if (!raw) return null;
  try { return JSON.parse(raw) as T; } catch { return null; }
}
function nowISO() { return new Date().toISOString(); }

function readCurrentFile(): SaveFile | null {
  const file = parse<SaveFile>(localStorage.getItem("lolm2:slot-1"));
  if (file?.state) return file;

  const state = parse<any>(localStorage.getItem("lolm2:save:auto"));
  if (state) {
    return {
      version: 1,
      savedAt: nowISO(),
      summary: {
        manager: state?.profile?.name,
        league: state?.league,
        team: state?.team?.name,
        week: state?.currentWeek ?? 1,
      },
      state,
    };
  }
  return null;
}

async function writeLocalMirrors(file: SaveFile) {
  localStorage.setItem("lolm2:slot-1", JSON.stringify(file));      // SaveFile complet
  localStorage.setItem("lolm2:save:auto", JSON.stringify(file.state)); // état brut
}

export default function SaveBar({
  context,
}: {
  context?: { profile?: any; league?: any; team?: any };
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const doSaveBrowser = async () => {
    let file = readCurrentFile();
    if (!file) {
      const state = {
        profile: context?.profile ?? {},
        league: context?.league ?? "LCK",
        team: context?.team ?? {},
        schedule: [], results: [], standings: [], currentWeek: 1,
      };
      file = {
        version: 1,
        savedAt: nowISO(),
        summary: {
          manager: state.profile?.name ?? "Manager",
          league: state.league,
          team: state.team?.name ?? "Équipe",
          week: 1,
        },
        state,
      };
    } else {
      file.savedAt = nowISO();
      if (file.summary) file.summary.week = file.state?.currentWeek ?? file.summary.week;
    }
    await writeLocalMirrors(file);
    alert("Sauvegardé dans le navigateur ✓");
  };

  const doLoadBrowser = async () => {
    const file = parse<SaveFile>(localStorage.getItem("lolm2:slot-1"));
    if (!file?.state) return alert("Aucune sauvegarde (slot-1).");
    localStorage.setItem("lolm2:save:auto", JSON.stringify(file.state));
    location.reload();
  };

  const doSaveToDisk = async () => {
    // récupère l'état courant (ou le compose depuis le contexte si vide)
    let file = readCurrentFile();
    if (!file) {
      alert("Pas de partie en mémoire. Lance une nouvelle partie ou clique d'abord sur 'Sauvegarder (navigateur)'.");
      return;
    }
    file = { ...file, savedAt: nowISO() };
    const name = `lolm2-slot-1-${file.summary?.manager ?? "manager"}-w${file.summary?.week ?? 1}.json`;
    await saveJsonFile(name, file);
    // on met aussi à jour les miroirs locaux
    await writeLocalMirrors(file);
    alert("Sauvegarde écrite sur disque ✓");
  };

  const doLoadFromDisk = async () => {
    const json = await openJsonFile<SaveFile>();
    if (!json?.state) return alert("Fichier invalide.");
    await writeLocalMirrors({ ...json, savedAt: nowISO() });
    alert("Sauvegarde chargée depuis disque ✓");
    location.reload();
  };

  const doExport = async () => {
    const file = readCurrentFile();
    if (!file) return alert("Aucune sauvegarde à exporter.");
    const name = `lolm2-export-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.json`;
    await saveJsonFile(name, file); // utilise aussi showSaveFilePicker si dispo
  };

  const doImportClick = () => inputRef.current?.click();
  const onImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const json = JSON.parse(text) as SaveFile;
      if (!json?.state) throw new Error("Fichier invalide (pas de champ 'state').");
      await writeLocalMirrors({ ...json, savedAt: nowISO() });
      alert("Import OK ✓");
      location.reload();
    } catch (err: any) {
      alert("Import impossible: " + (err?.message ?? "fichier invalide"));
    } finally {
      e.target.value = "";
    }
  };

  return (
    <div className="savebar" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
      {/* Navigateur (localStorage) */}
      <button className="btn" onClick={doSaveBrowser} title="Sauver dans le navigateur (slot-1)">💾 Sauvegarder</button>
      <button className="btn" onClick={doLoadBrowser} title="Charger depuis le navigateur">📂 Charger</button>

      {/* Disque (logiciel) */}
      <button className="btn" onClick={doSaveToDisk} title="Écrire un fichier .json sur le disque">💽 Sauver sur disque</button>
      <button className="btn" onClick={doLoadFromDisk} title="Ouvrir un fichier .json de sauvegarde">📀 Ouvrir depuis disque</button>

      {/* Fallbacks rapides */}
      <button className="btn" onClick={doExport} title="Exporter">⬇️ Export</button>
      <button className="btn" onClick={doImportClick} title="Importer">⬆️ Import</button>
      <input ref={inputRef} type="file" accept="application/json" hidden onChange={onImportFile} />
    </div>
  );
}
