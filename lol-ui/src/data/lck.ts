export type LckTeamLite = { id: string; name: string; short: string; logo: string };

export const LCK_TEAMS: LckTeamLite[] = [
  { id: "t1",   name: "T1",                    short: "T1",  logo: "/logos/lck/t1.png" },
  { id: "geng", name: "Gen.G",                 short: "GEN", logo: "/logos/lck/gen.png" },      // ✅ ton fichier = gen.png
  { id: "hle",  name: "Hanwha Life Esports",   short: "HLE", logo: "/logos/lck/hleo.png" },     // ✅ ton fichier = hleo.png
  { id: "kt",   name: "KT Rolster",            short: "KT",  logo: "/logos/lck/kt.png" },
  { id: "dk",   name: "Dplus KIA",             short: "DK",  logo: "/logos/lck/dplus.png" },    // ✅ ton fichier = dplus.png
  { id: "drx",  name: "DRX",                   short: "DRX", logo: "/logos/lck/drx.png" },
  { id: "kdf",  name: "Kwangdong Freecs",      short: "KDF", logo: "/logos/lck/kdf.png" },
  { id: "ns",   name: "Nongshim RedForce",     short: "NS",  logo: "/logos/lck/ns.png" },
  { id: "lsb",  name: "Liiv SANDBOX",          short: "LSB", logo: "/logos/lck/default.png" },  // ⚠️ ajoute lsb.png quand tu pourras
  { id: "okb",  name: "OKSavings Bank BRION",  short: "OKB", logo: "/logos/lck/oks.png" },      // ✅ ton fichier = oks.png
];
