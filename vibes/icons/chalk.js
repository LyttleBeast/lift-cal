// Chalk's icons: v1's, but for one.
//
// A simple vibe keeps v1's hand-drawn set (vibes/icons/v1.js), recoloured
// through its roles. The one icon it cannot keep is `spark`: v1 draws a
// four-point sparkle at the estimator's two notices (food.js ai-warn, native
// food/common.jsx AiWarn), the generic "AI" mark research lists as a tell
// (SYNTHESIS never-do #29). Chalk draws ≈ there instead, as two strokes —
// the sign Rack already writes before an estimated figure (Weight's
// maintenance, weight.js) — the same mark Navy and Oxblood specify, on v1's 24 grid, round
// caps and joins, no fill, at v1's 1.6 site stroke, inked in warn at the
// sites as v1's spark is.
//
// Only `spark` is here. vibe.js icon() and native icon() fall back to v1's
// drawing for every name a set leaves out, and a set with no glyphs, vessel
// or ornaments keeps v1's text glyphs, v1's bottle and no tailpiece.
//
// Like v1.js it imports nothing, is frozen all the way down, and is copied
// byte for byte into rack-mobile (src/pure/vibes/icons/chalk.js), pinned by
// sha256.

const icon = (stroke, els) =>
  ({ viewBox: '0 0 24 24', stroke, fill: 'none', linecap: 'round', linejoin: 'round', els });
const path = d => ({ tag: 'path', d });

// Inline, not imported: this file imports nothing.
const deepFreeze = o => {
  if (o && typeof o === 'object' && !Object.isFrozen(o)) {
    Object.freeze(o);
    for (const v of Object.values(o)) deepFreeze(v);
  }
  return o;
};

export default deepFreeze({
  id: 'chalk',

  icons: {
    // ≈: two waves, 4.5 apart, centred on the grid; each wave is two
    // half-periods of 3.5 with a 2.2 swing.
    spark: icon(1.6, [path('M5 9.75c2.3-2.2 4.7-2.2 7 0s4.7 2.2 7 0'), path('M5 14.25c2.3-2.2 4.7-2.2 7 0s4.7 2.2 7 0')])
  }
});
