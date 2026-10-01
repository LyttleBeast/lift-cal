// Clear sky's icons: v1's, but for `spark` and three glyphs.
//
// Clear sky keeps v1's hand-drawn set (vibes/icons/v1.js) — Rack's own
// drawings, 24 grid, round caps and joins, no fill — recoloured through its
// roles. It draws no sun, cloud or weather mark anywhere: theming a sky vibe by
// motif is what a generator does.
//
// `spark`. v1 draws a four-point sparkle at the estimator's two notices
// (food.js ai-warn, native food/common.jsx AiWarn), the generic "AI" mark
// research lists as a tell (SYNTHESIS finding 6, never-do #29). Clear sky
// draws a ± there instead: "give or take", which is what an estimate is. It is
// not a star, sparkle, asterisk or bolt, and it is unlike Chalk's, Navy's and
// Oxblood's ≈ and Iron Age's manicule. Three strokes at the sites' fixed 1.6,
// inked in warn as v1's spark is. From concept B's drawing (plus arms 4.5
// either side of its centre, a 9-wide bar under it), moved down half a unit
// and the bar a unit lower, so the mark is centred on the grid (4.2 to 19.8
// with its caps) and the gap between the plus and the bar is 3.4 units — 2.3px
// at the 16px sites, where concept B's 2.4 units closed to 1.6px.
//
// `glyphs`. Three characters Archivo lacks, so v1 shows them in the system
// face, where iOS may draw ⚙ and ⚠ as colour emoji (VIBES-CODEMAP §4.5).
// Each is routed through the icon contract's glyph keys (vibes/icons/v1.js
// `glyphs`) and drawn at every site listed there for it; a character inside a
// sentence is copy (`prose`) and stays text. The drawing keeps the character
// as its accessible name (vibe.js glyphed(), native icon routing).
//   gear  ⚙  native Fuel's gear button (food.jsx:1628): v1's own `gear`
//            drawing, the one the web already draws at that button, so both
//            clients show one gear. NavBtn keeps its label.
//   warn  ⚠  the glyph that leads the estimator's sentence and native's dev
//            banner: a triangle with its mark, in v1's line.
//   edit  ✎  the library row's edit button: v1's own `pen` drawing.
// Every other glyph, the water vessel and the (absent) tailpieces fall back to
// v1's: vibe.js icon() / glyphed() / vessel() and native icon() take v1's for
// every name a set leaves out.
//
// Like v1.js it imports nothing, is frozen all the way down, and is copied
// byte for byte into rack-mobile (src/pure/vibes/icons/clear-sky.js), pinned
// by sha256.

const icon = (stroke, els) =>
  ({ viewBox: '0 0 24 24', stroke, fill: 'none', linecap: 'round', linejoin: 'round', els });
const path = d => ({ tag: 'path', d });

/* v1's gear outline, copied verbatim from vibes/icons/v1.js GEAR_OUTLINE:
   this file imports nothing. */
const GEAR_OUTLINE = 'M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z';

// Inline, not imported: this file imports nothing.
const deepFreeze = o => {
  if (o && typeof o === 'object' && !Object.isFrozen(o)) {
    Object.freeze(o);
    for (const v of Object.values(o)) deepFreeze(v);
  }
  return o;
};

export default deepFreeze({
  id: 'clear-sky',

  icons: {
    // ±: a plus centred on (12, 9.5), arms 4.5 long, and a bar 9 wide at y 19.
    spark: icon(1.6, [path('M12 5v9'), path('M7.5 9.5h9'), path('M7.5 19h9')])
  },

  glyphs: {
    // v1's `gear` drawing, at v1's gear stroke (the web's Fuel gear site).
    gear: icon(1.6, [{ tag: 'circle', cx: 12, cy: 12, r: 3 }, path(GEAR_OUTLINE)]),
    // A triangle on the grid's full width with rounded joins, its mark a
    // stroke and a round-capped dot; at the spark sites' stroke.
    warn: icon(1.6, [path('M12 4.2L21.2 19.8H2.8z'), path('M12 10v4.2'), path('M12 17.3v.01')]),
    // v1's `pen` drawing, at v1's add-tile stroke.
    edit: icon(1.8, [path('M4 20h4L18.5 9.5a2.6 2.6 0 0 0-3.7-3.7L4 16.3z'), path('M13.6 7.1l3.7 3.7')])
  }
});
