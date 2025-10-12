export function rngFromSeed(seed: number | string = 42) {
  let s = typeof seed === "number" ? seed : Array.from(String(seed)).reduce((a,c)=>a+c.charCodeAt(0),0);
  return function() { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s>>>0) % 1_000_000) / 1_000_000; };
}
