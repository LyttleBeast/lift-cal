// Oxblood's icon set: v1's icons, with one redrawn — `spark`.
//
// v1's `spark` is a four-point sparkle, drawn beside the estimator's notice
// (web food.js:1234 / :1239, native food/common.jsx:948). A sparkle is an
// AI-made tell (SYNTHESIS finding 4, R8.8, never-do 29), and vibe.js iconIn()
// hands v1's drawing to any set that lacks the name, so a vibe must define its
// own or inherit it. Every other name falls back to v1's drawing through that
// same iconIn(), so this set holds `spark` and nothing else.
//
// THE MARK: ≈, the approximately-equal sign, as two strokes — because Rack's
// own copy marks an estimate with "≈", and the notice beside it says the
// numbers are approximate, not magic. Not a star, sparkle, asterisk or bolt.
// On the 24 grid, round caps and joins, no fill; the two notice sites fix the
// stroke at 1.6, so at 16px it draws 1.07px strokes with a 3px gap between the
// waves (readable at 16px, R8.8). The paths are byte-identical to Navy's and
// Chalk's proposal on purpose: if the orchestrator serves the three simple
// vibes from one shared set, this file merges into it for free.
//
// Imports nothing and is frozen all the way down, like vibes/icons/v1.js, so
// it can be copied byte for byte into rack-mobile's src/pure/vibes/icons/.

const icon = (stroke, els) =>
  ({ viewBox: '0 0 24 24', stroke, fill: 'none', linecap: 'round', linejoin: 'round', els });
const path = d => ({ tag: 'path', d });

const deepFreeze = o => {
  if (o && typeof o === 'object' && !Object.isFrozen(o)) {
    Object.freeze(o);
    for (const v of Object.values(o)) deepFreeze(v);
  }
  return o;
};

export default deepFreeze({
  id: 'oxblood',
  icons: {
    spark: icon(1.6, [path('M5 9.75c2.3-2.2 4.7-2.2 7 0s4.7 2.2 7 0'), path('M5 14.25c2.3-2.2 4.7-2.2 7 0s4.7 2.2 7 0')])
  }
});
