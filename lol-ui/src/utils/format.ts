// src/utils/format.ts
export const clamp01 = (v: number) => Math.max(0, Math.min(100, Number.isFinite(v) ? v : 0));

export const fmtMoneyShort = (n?: number | null, currencySign = "$") => {
  if (n == null || !Number.isFinite(n)) return "N/A";
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)} B${currencySign}`;
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} M${currencySign}`;
  if (abs >= 1_000) return `${(n / 1_000).toFixed(1)} K${currencySign}`;
  return `${n.toFixed(0)} ${currencySign}`;
};

export const fmtDate = (iso?: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toISOString().slice(0, 10);
};

export const plural = (n: number, one: string, many: string) => `${n} ${n <= 1 ? one : many}`;
