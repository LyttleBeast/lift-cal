// The small coloured tile that leads a Settings row, a Coach switch and each of
// You's three rows — the October 2026 redesign's "B icons".
//
// A tile is a 32 px rounded square holding one 18 px line glyph. Its wash is
// the tone's colour at a low alpha and the glyph is the tone's colour, both
// read from the stylesheet (rack.css `.tile-<tone>`), so a vibe that repaints
// the plate colours repaints every tile with no change here. The tones and
// where each colour comes from are written next to the rules.
//
// Which drawing: one of this file's own (tile-icons.js — target, flame, drop,
// sliders and the rest) when the name is in that table, else the active
// vibe's icon of that name through vibe.js icon() — which is how a row that
// names a contract icon (you, workout, food, steps, spark, bubble, calendar)
// gets the app's own drawing in every vibe, and why none of those is redrawn
// here.
//
// Pure presentation. A tile never reads data and never owns a handler: the
// row it sits in is the button.

import { el } from './ui.js';
import { icon } from './vibe.js';
import { TILE_ICONS } from './tile-icons.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const ATTRS = { path: ['d'], circle: ['cx', 'cy', 'r'], rect: ['x', 'y', 'width', 'height', 'rx'] };

// The tones registry.js and you-rows.js use. A name outside the list draws as
// help (the neutral one) rather than as no tile at all.
export const TONES = Object.freeze(['plan', 'train', 'coach', 'look', 'tools', 'help', 'out', 'warn']);

function drawn(ic) {
  const s = document.createElementNS(SVG_NS, 'svg');
  s.setAttribute('viewBox', ic.viewBox);
  s.setAttribute('fill', 'none');
  s.setAttribute('stroke', 'currentColor');
  s.setAttribute('stroke-width', String(ic.stroke));
  s.setAttribute('stroke-linecap', ic.linecap);
  s.setAttribute('stroke-linejoin', ic.linejoin);
  s.setAttribute('aria-hidden', 'true');
  for (const e of ic.els) {
    const n = document.createElementNS(SVG_NS, e.tag);
    for (const k of ATTRS[e.tag] || []) if (e[k] != null) n.setAttribute(k, String(e[k]));
    s.appendChild(n);
  }
  return s;
}

export function glyph(name) {
  return Object.prototype.hasOwnProperty.call(TILE_ICONS, name)
    ? drawn(TILE_ICONS[name])
    : icon(name, { stroke: 2, ariaHidden: true });
}

export function tile(name, tone) {
  const t = el('span', 'tile tile-' + (TONES.includes(tone) ? tone : 'help'));
  t.appendChild(glyph(name));
  return t;
}
