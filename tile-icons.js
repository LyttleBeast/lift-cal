/* The row icons of Settings and of You's three rows — the October 2026
 * redesign's icon tiles (rack-mobile NEXT-WEB-YOU-SETTINGS.md §3 lists them,
 * and src/ui/settings/tileIcons.js is where these were taken from).
 *
 * The same shape as the icon contract's drawings (vibes/icons/v1.js: a
 * viewBox, a stroke, and `els`), drawn by tiles.js. An icon the contract
 * already has (you, workout, food, steps, spark, bubble, calendar) is NOT
 * redrawn here: those rows pass the contract's name and tiles.js asks the
 * worn icon set for it, so every vibe restyles them.
 *
 * PURE DATA, and kept out of vibes/icons/v1.js on purpose. That file is the
 * contract: it is copied byte for byte into rack-mobile and pinned by sha256,
 * every site in it is held to a file and line by two verifiers, and a tile
 * glyph has no vibe-specific drawing yet. Folding these into it is a contract
 * change for a later, deliberate ship — native keeps its own copy of this
 * table until then, so nothing needs to move together.
 *
 * Simple 24-unit line glyphs at stroke 2 with round ends, as the mockup draws
 * them; the paths are the mockup's.
 */
// The line width every tile glyph is drawn at (the mockup's 2).
const LINE_W = 2;
const line = (...els) => Object.freeze({ viewBox: '0 0 24 24', stroke: LINE_W, linecap: 'round', linejoin: 'round',
                                          els: Object.freeze(els.map(e => Object.freeze(e))) });
const p = d => ({ tag: 'path', d });
const c = (cx, cy, r) => ({ tag: 'circle', cx, cy, r });

export const TILE_ICONS = Object.freeze({
  target:   line(c(12, 12, 9), c(12, 12, 4)),
  flame:    line(p('M12 3c1 4 6 5.5 6 11a6 6 0 0 1-12 0c0-3 2-4.5 2.5-6.5 1 1.5 2 2 3 2.5 0-2.5-.5-4.5.5-7z')),
  drop:     line(p('M12 3C9 7.5 6 10.5 6 14.5a6 6 0 0 0 12 0C18 10.5 15 7.5 12 3z')),
  sliders:  line(p('M4 7h10M4 17h6M18 4v6M14 7h7M10 14v6M10 17h10')),
  timer:    line(c(12, 13, 8), p('M12 9v4l2.5 2M9 2h6')),
  palette:  line(p('M12 3a9 9 0 1 0 0 18c1.5 0 2-1 2-2s-1-1.5-1-2.5S14 15 15 15h2a4 4 0 0 0 4-4c0-4.5-4-8-9-8z'),
                 c(7.5, 11, 1), c(11, 7, 1), c(16, 8.5, 1)),
  ruler:    line(p('M3 8h18v8H3zM7 8v3M11 8v4M15 8v3M19 8v4')),
  phone:    line(p('M7 3h10v18H7zM11 18h2')),
  history:  line(p('M4 12a8 8 0 1 0 2.4-5.7M4 4v4h4M12 8v4l3 2')),
  braces:   line(p('M9 4c-2 0-3 1-3 3v2c0 1-1 2.5-2 3 1 .5 2 2 2 3v2c0 2 1 3 3 3M15 4c2 0 3 1 3 3v2c0 1 1 2.5 2 3-1 .5-2 2-2 3v2c0 2-1 3-3 3')),
  play:     line(c(12, 12, 9), p('M10 8.5l5 3.5-5 3.5z')),
  alert:    line(p('M12 4l9 16H3zM12 10v4M12 17h.01')),
  shield:   line(p('M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z')),
  exit:     line(p('M10 4H5v16h5M14 8l4 4-4 4M18 12H9')),
  trash:    line(p('M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13')),
  search:   line(c(11, 11, 7), p('M20 20l-3.5-3.5')),

  // Settings → Coach, one per switch (registry.js COACH_ICONS)
  trophy:   line(p('M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M9 20h6')),
  trend:    line(p('M4 17l6-6 4 4 6-7M15 8h5v5')),
  balance:  line(p('M12 4v16M7 20h10M5 7h14M5 7l-3 6h6zM19 7l-3 6h6z')),
  moon:     line(p('M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z')),
  pulse:    line(p('M3 12h4l2-5 4 10 2-5h6')),
  listPlus: line(p('M4 6h10M4 12h10M4 18h6M18 14v6M15 17h6')),
  battery:  line(p('M3 8h15v8H3zM21 11v2M6 11v2M9 11v2M12 11v2')),
  scale:    line(p('M5 4h14v16H5zM9 10a4 4 0 0 1 6 0M12 10l1-2')),
  question: line(c(12, 12, 9), p('M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6M12 17h.01')),
  nodes:    line(c(6, 6, 2), c(18, 9, 2), c(10, 18, 2), p('M8 6.5l8 2M7 8l2 8M16.5 10.5l-5 6')),

  // You's three rows
  review:   line(p('M4 6h16v14H4zM4 10h16M8 3v4M16 3v4M9 15l2 2 4-4')),
  chart:    line(p('M4 4v16h16M8 15l3-4 3 2 5-6')),

  // Friends (v67): the empty state's two people — the dock's own drawing,
  // index.html — the head's add button, and an inbox routine's row. Here and
  // not in vibes/icons for the reason at the top of this file.
  people:   line(c(9, 8.6, 3.2), p('M3 20c.4-3.4 2.9-5.4 6-5.4s5.6 2 6 5.4'),
                 p('M14.6 5.4a2.8 2.8 0 1 1 0 4.8M17.2 14.4c2.2.4 3.5 2.4 3.8 5.6')),
  userPlus: line(c(10, 8, 3.5), p('M3.5 20c.4-3.5 3-5.6 6.5-5.6 1.4 0 2.6.3 3.6.9M18 13v6M15 16h6')),
  inbox:    line(p('M4 13l2.5-8h11l2.5 8v6H4zM4 13h4.5l1 2h5l1-2H20')),
  // v68: a friend page's nudge switches.
  bell:     line(p('M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15zM10 20.5a2 2 0 0 0 4 0'))
});
