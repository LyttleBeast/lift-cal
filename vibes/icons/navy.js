// Navy's icons: v1's, plus one neutral `spark`.
//
// iconIn() (vibe.js) takes an icon from the vibe's set, else v1's. So a set
// that leaves `spark` out shows v1's four-point sparkle beside the estimator
// notices, and a sparkle is the mark of "AI did this" (SYNTHESIS finding 6,
// R8.8, never-do 29). This set defines `spark` and nothing else; every other
// name falls back to v1's hand-drawn paths.
//
// The mark is ≈, the approximately-equal sign, as two strokes: Rack's own copy
// marks an estimate with "≈", so the icon says "approximate", not "magic".
// Two sine waves on the 24 grid, round caps, no fill; the two notice sites fix
// the stroke at 1.6 (food.js:1234, :1239; native common.jsx:948), which at
// 16px is a 1.07px line. These are the same bytes as Chalk concept C's
// proposal on purpose: one shared set for the simple vibes is the orchestrator's call
// (PLAN §2 rule 14), and identical paths make that a free merge.
//
// Imports nothing and is frozen all the way down, like vibes/icons/v1.js, so
// it can be copied into rack-mobile byte for byte and pinned.

const deepFreeze = o => {
  if (o && typeof o === 'object' && !Object.isFrozen(o)) {
    Object.freeze(o);
    for (const v of Object.values(o)) deepFreeze(v);
  }
  return o;
};

const icon = (stroke, els) =>
  ({ viewBox: '0 0 24 24', stroke, fill: 'none', linecap: 'round', linejoin: 'round', els });
const path = d => ({ tag: 'path', d });

export default deepFreeze({
  id: 'navy',
  icons: {
    spark: icon(1.6, [path('M5 9.75c2.3-2.2 4.7-2.2 7 0s4.7 2.2 7 0'),
                      path('M5 14.25c2.3-2.2 4.7-2.2 7 0s4.7 2.2 7 0')])
  }
});
