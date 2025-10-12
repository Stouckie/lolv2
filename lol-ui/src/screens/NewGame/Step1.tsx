import { useMemo, useState } from "react";

export type Step1Payload = {
  name: string;
  nationality: string;
  autosave: boolean;
  ironman: boolean;
};

export default function Step1({
  onBack,
  onNext,
}: {
  onBack: () => void;
  onNext: (v: Step1Payload) => void;
}) {
  const countries = useMemo(
    () =>
      [
        { code: "KR", label: "Corée du Sud" },
        { code: "FR", label: "France" },
        { code: "EU", label: "Union Européenne" },
        { code: "US", label: "États-Unis" },
        { code: "CN", label: "Chine" },
        { code: "BR", label: "Brésil" },
        { code: "JP", label: "Japon" }
      ] as const,
    []
  );

  const [name, setName] = useState("");
  const [nationality, setNationality] = useState("FR");
  const [autosave, setAutosave] = useState(true);
  const [ironman, setIronman] = useState(false);
  const valid = name.trim().length >= 2;

  return (
    <div className="newgame-root">
      <div className="bg-orb orb-1" />
      <div className="bg-orb orb-2" />
      <div className="bg-grid" />

      <div className="newgame-card">
        <header className="newgame-header">
          <h2>Nouvelle partie — Profil du manager</h2>
          <p className="muted">
            Ton nom apparaîtra dans les dialogues et la presse. Tu pourras changer quelques options plus tard.
          </p>
        </header>

        <form
          className="form"
          onSubmit={(e) => {
            e.preventDefault();
            if (!valid) return;
            onNext({ name: name.trim(), nationality, autosave, ironman });
          }}
        >
          <div className="field">
            <label className="label" htmlFor="mgr-name">Nom du manager</label>
            <input
              id="mgr-name"
              className="input"
              placeholder="ex: ChovyCoach"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
            {!valid && <div className="help">2 caractères minimum.</div>}
          </div>

          <div className="field">
            <label className="label" htmlFor="mgr-nat">Nationalité</label>
            <select
              id="mgr-nat"
              className="select"
              value={nationality}
              onChange={(e) => setNationality(e.target.value)}
            >
              {countries.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div className="row">
            <label className="toggle">
              <input type="checkbox" checked={autosave} onChange={(e) => setAutosave(e.target.checked)} />
              <span>Autosave hebdomadaire</span>
            </label>

            <label className="toggle">
              <input type="checkbox" checked={ironman} onChange={(e) => setIronman(e.target.checked)} />
              <span>Mode Ironman (un seul slot, pas de reload)</span>
            </label>
          </div>

          <div className="actions">
            <button type="button" className="btn" onClick={onBack}>Retour</button>
            <button type="submit" className="btn primary" disabled={!valid}>Continuer</button>
          </div>
        </form>
      </div>
    </div>
  );
}
