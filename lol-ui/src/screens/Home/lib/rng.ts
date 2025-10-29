// lol-ui/src/screens/Home/lib/rng.ts

// A tiny deterministic RNG + helpers for your generators

export type RNG = { next: () => number };

/** Combine any seeds into one and return a deterministic RNG (mulberry32-ish). */
export function seededFrom(...seeds: Array<string | number | boolean>): RNG {
  const hashOne = (x: string | number | boolean) => {
    const s = String(x);
    let h = 1779033703 ^ s.length;
    for (let i = 0; i < s.length; i++) {
      h = Math.imul(h ^ s.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    return h >>> 0;
  };

  let seed = 0x9e3779b9; // golden ratio prime
  for (const x of seeds) {
    seed ^= hashOne(x);
    seed = Math.imul(seed ^ (seed >>> 16), 0x85ebca6b) >>> 0;
  }

  let t = seed >>> 0;
  const next = () => {
    // mulberry32 variant
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };

  return { next };
}

/** Clamp a value between a and b. */
export function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v));
}

/** Random integer in [min, max] (inclusive). */
export function randInt(rng: RNG, min: number, max: number) {
  const lo = Math.ceil(min);
  const hi = Math.floor(max);
  return Math.floor(rng.next() * (hi - lo + 1)) + lo;
}

/** Gaussian-like integer using Box–Muller. */
export function randNorm(rng: RNG, mean = 50, sd = 10) {
  let u = 0, v = 0;
  while (u === 0) u = rng.next();
  while (v === 0) v = rng.next();
  const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  return Math.round(mean + z * sd);
}

/** Pick a random element from an array. */
export function pick<T>(rng: RNG, arr: T[]): T {
  return arr[Math.floor(rng.next() * arr.length)];
}
