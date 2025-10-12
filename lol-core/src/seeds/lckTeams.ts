// Données de base LCK (logos = chemins côté UI)

export type TeamSeed = {
  id: string; name: string; short: string;
  rep: number; cash: number; sponsorPerDay: number; payrollPerDay: number;
  logo?: string;
};

export const LCK_TEAMS_SEED: TeamSeed[] = [
  { id: "t1",   name: "T1",                   short: "T1",  rep: 92, cash: 5_000_000, sponsorPerDay: 18_000, payrollPerDay: 0, logo: "/logos/lck/t1.png" },
  { id: "geng", name: "Gen.G",                short: "GEN", rep: 90, cash: 4_500_000, sponsorPerDay: 17_000, payrollPerDay: 0, logo: "/logos/lck/gen.png" },
  { id: "hle",  name: "Hanwha Life Esports",  short: "HLE", rep: 85, cash: 3_200_000, sponsorPerDay: 15_000, payrollPerDay: 0, logo: "/logos/lck/hleo.png" },
  { id: "kt",   name: "KT Rolster",           short: "KT",  rep: 83, cash: 3_000_000, sponsorPerDay: 14_000, payrollPerDay: 0, logo: "/logos/lck/kt.png" },
  { id: "dk",   name: "Dplus KIA",            short: "DK",  rep: 82, cash: 3_000_000, sponsorPerDay: 14_000, payrollPerDay: 0, logo: "/logos/lck/dplus.png" },
  { id: "drx",  name: "DRX",                  short: "DRX", rep: 78, cash: 2_400_000, sponsorPerDay: 12_000, payrollPerDay: 0, logo: "/logos/lck/drx.png" },
  { id: "kdf",  name: "Kwangdong Freecs",     short: "KDF", rep: 75, cash: 2_000_000, sponsorPerDay: 11_000, payrollPerDay: 0, logo: "/logos/lck/kdf.png" },
  { id: "ns",   name: "Nongshim RedForce",    short: "NS",  rep: 73, cash: 1_800_000, sponsorPerDay: 10_000, payrollPerDay: 0, logo: "/logos/lck/ns.png" },
  { id: "lsb",  name: "Liiv SANDBOX",         short: "LSB", rep: 76, cash: 2_100_000, sponsorPerDay: 11_000, payrollPerDay: 0, logo: "/logos/lck/default.png" },
  { id: "okb",  name: "OKSavings Bank BRION", short: "OKB", rep: 71, cash: 1_600_000, sponsorPerDay:  9_000, payrollPerDay: 0, logo: "/logos/lck/oks.png" },
];
