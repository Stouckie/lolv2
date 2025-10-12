import { useMemo, useState } from "react";

/**
 * Affiche un logo avec fallback automatique :
 * - essaie src si fourni
 * - essaie plusieurs alias connus pour l'id
 * - finit sur /logos/lck/default.png
 */
export default function LogoImg({
  id,
  src,
  alt,
  size = 24,
  className,
}: {
  id?: string;
  src?: string;
  alt: string;
  size?: number;
  className?: string;
}) {
  const candidates = useMemo(() => {
    const idn = (id || "").toLowerCase().trim();

    // alias courants des équipes LCK (noms de fichiers possibles)
    const aliases: Record<string, string[]> = {
      t1: ["t1", "skt", "sktt1"],
      geng: ["geng", "gen", "gen.g", "gen_g"],
      hle: ["hle", "hanwha", "hanwhalife"],
      kt: ["kt", "ktrolster", "rolster"],
      dk: ["dk", "dplus", "dpluskia", "kia"],
      drx: ["drx"],
      kdf: ["kdf", "kwangdong", "freecs", "kwangdongfreecs"],
      ns: ["ns", "nongshim", "redforce"],
      lsb: ["lsb", "sandbox", "liiv", "liivsandbox"],
      okb: ["okb", "bro", "brion", "oksavingsbankbrion"],
    };

    const guess: string[] = [];
    if (src) guess.push(src);

    const list = aliases[idn] ?? (idn ? [idn] : []);
    for (const name of list) {
      guess.push(`/logos/lck/${name}.png`, `/logos/lck/${name}.svg`, `/logos/lck/${name}.jpg`);
    }

    // fallback final
    guess.push(`/logos/lck/default.png`);

    // dédoublonnage
    return [...new Set(guess)];
  }, [id, src]);

  const [idx, setIdx] = useState(0);

  return (
    <img
      src={candidates[idx]}
      alt={alt}
      width={size}
      height={size}
      onError={() => setIdx((i) => Math.min(i + 1, candidates.length - 1))}
      className={className}
      style={{ borderRadius: 6, objectFit: "cover" }}
    />
  );
}
