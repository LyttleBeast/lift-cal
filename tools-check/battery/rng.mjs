// A seeded generator, so every lifter the battery invents is a lifter anyone
// can re-run by number. mulberry32, the same one tools-check/coach-prog.mjs
// uses, plus the handful of draws the simulator needs. No Math.random anywhere
// in the battery: a failure that cannot be reproduced is not a finding.

export function mulberry32(seed) {
  let s = seed | 0;
  return function next() {
    s = s + 0x6D2B79F5 | 0;
    let t = Math.imul(s ^ s >>> 15, 1 | s);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

export function rngOf(seed) {
  const r = mulberry32(seed);
  const api = {
    // [0, 1)
    f: () => r(),
    // integer in [lo, hi] inclusive
    int: (lo, hi) => lo + Math.floor(r() * (hi - lo + 1)),
    // true with probability p
    chance: p => r() < p,
    // one of a list
    pick: xs => xs[Math.floor(r() * xs.length)],
    // one of a weighted table [[value, weight], ...]
    weighted: table => {
      const total = table.reduce((a, [, w]) => a + w, 0);
      let x = r() * total;
      for (const [v, w] of table) { x -= w; if (x < 0) return v; }
      return table[table.length - 1][0];
    },
    // approximately normal, mean 0 sd 1 (sum of three uniforms, enough here)
    gauss: () => (r() + r() + r() - 1.5) * 2,
    // a fresh generator forked from this one, so one lifter's draws never
    // shift another's when a branch grows a new draw
    fork: () => rngOf(Math.floor(r() * 2147483647) || 1)
  };
  return api;
}

// A stable 32-bit hash of a string, for seeds derived from names.
export function hash32(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
