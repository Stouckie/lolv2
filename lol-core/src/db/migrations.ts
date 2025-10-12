import { SaveSnapshot } from "./schemas";

/** Exemple de pipeline de migrations */
export function migrateSave(raw: any): SaveSnapshot {
  // Si futur: if (raw.version === 1) raw = v1to2(raw)
  return SaveSnapshot.parse(raw);
}
