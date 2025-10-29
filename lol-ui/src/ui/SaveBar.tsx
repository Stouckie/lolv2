import { useRef } from "react";
import { saveJsonFile, openJsonFile } from "../persist/fs";
import { readGameSave, saveGameFile } from "@/utils/saveIO";
import { normalizeGameDB } from "@/utils/gameNormalization";
import type { GameSaveFile } from "@/adapters/persist/localStorage";
import type { Step1Payload } from "../screens/NewGame/Step1";
import type { TeamCard } from "../screens/NewGame/Step3Team";

type SaveContext = { profile?: Step1Payload; league?: string; team?: TeamCard };
function nowTimestamp(): number { return Date.now(); }

function ensureSave(context?: SaveContext): GameSaveFile {
  const existing = readGameSave();
  if (existing) return existing;

  const db = normalizeGameDB({});
  const now = nowTimestamp();
  const summary = {
    manager: context?.profile?.name ?? "Manager",
    league: context?.league ?? "LCK",
    team: context?.team?.name ?? "Team",
    teamId: context?.team?.id,
    season: db.meta.season,
    currentWeek: db.meta.currentWeek,
    currentDayIndex: db.meta.currentDayIndex,
  };

  return {
    version: 1,
    savedAt: now,
    updatedAt: now,
    summary,
    state: context ? { ...context } : undefined,
    file: db,
  };
}

function resolveSummary(save: GameSaveFile) {
  const summary = save.summary ?? {};
  return {
    manager: String(summary.manager ?? "Manager"),
    team: String(summary.team ?? "Team"),
    week: Number(summary.currentWeek ?? summary.week ?? 1),
  };
}

export default function SaveBar({ context }: { context?: SaveContext }) {
  const inputRef = useRef<HTMLInputElement>(null);

  const doSaveBrowser = async () => {
    const current = ensureSave(context);
    const next: GameSaveFile = {
      ...current,
      updatedAt: nowTimestamp(),
      file: { ...current.file },
    };
    saveGameFile(next);
    alert("Sauvegarde navigateur mise à jour.");
  };

  const doLoadBrowser = async () => {
    const save = readGameSave();
    if (!save) { alert("Aucune sauvegarde disponible."); return; }
    alert("Sauvegarde chargée. Rafraîchissement de la page.");
    location.reload();
  };

  const doSaveToDisk = async () => {
    const current = ensureSave(context);
    const stamped: GameSaveFile = {
      ...current,
      updatedAt: nowTimestamp(),
    };
    saveGameFile(stamped);
    const latest = readGameSave() ?? stamped;
    const summary = resolveSummary(latest);
    const name = `lolm2-slot-1-${summary.manager}-w${summary.week}.json`;
    await saveJsonFile(name, latest);
    alert("Sauvegarde écrite sur disque.");
  };

  const doLoadFromDisk = async () => {
    const json = await openJsonFile<GameSaveFile>();
    if (!json?.file) { alert("Fichier invalide."); return; }
    const imported: GameSaveFile = {
      ...json,
      updatedAt: nowTimestamp(),
    };
    saveGameFile(imported);
    alert("Sauvegarde importée.");
    location.reload();
  };

  const doExport = async () => {
    const save = readGameSave();
    if (!save) { alert("Aucune sauvegarde à exporter."); return; }
    const summary = resolveSummary(save);
    const name = `lolm2-export-${summary.manager}-${Date.now()}.json`;
    await saveJsonFile(name, save);
  };

  const doImportClick = () => inputRef.current?.click();

  const onImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const json = JSON.parse(text) as GameSaveFile;
      if (!json?.file) throw new Error("Fichier invalide (pas de champ 'file').");
      saveGameFile({
        ...json,
        updatedAt: nowTimestamp(),
      });
      alert("Import réussi.");
      location.reload();
    } catch (err: any) {
      alert("Import impossible: " + (err?.message ?? "fichier invalide"));
    } finally {
      e.target.value = "";
    }
  };

  return (
    <div className="savebar" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
      <button className="btn" onClick={doSaveBrowser} title="Sauvegarder dans le navigateur">Sauver</button>
      <button className="btn" onClick={doLoadBrowser} title="Charger depuis le navigateur">Charger</button>
      <button className="btn" onClick={doSaveToDisk} title="Exporter un fichier .json">Sauver disque</button>
      <button className="btn" onClick={doLoadFromDisk} title="Ouvrir un fichier .json">Ouvrir disque</button>
      <button className="btn" onClick={doExport} title="Exporter">Export</button>
      <button className="btn" onClick={doImportClick} title="Importer">Import</button>
      <input ref={inputRef} type="file" accept="application/json" hidden onChange={onImportFile} />
    </div>
  );
}
