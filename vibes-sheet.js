// Settings → Look → Vibes (V59 §8.2–8.3). The design is research track 10's
// "Vibes picker" (§4), and the only words it adds are the ones §8 names.
//
// ONE TILE PER VIBE, EACH DRAWN IN ITS OWN VIBE. A tile carries its vibe's
// tokens on its own inner element (.vibe-in) — every custom property the
// vibe's definition gives, through the contract's ROLES map, spelled as
// tools-check/vibes-css.mjs spells them for that vibe's :root block — so every
// var() inside it is that vibe's, whichever vibe is worn, and nothing is
// switched app-wide to draw it. The tile shows the vibe's ground, a sample card
// in its card colours with a number in its numeral face, its accent, and for a
// vibe with photos its thumbnail. The number is `315` on every tile: a bar
// weight, a sample, never one of his own numbers — his bodyweight in a face he
// has not picked would be a number that is not his. The name, the feel line and
// "Experimental" are the registry's words, verbatim, in the sheet's own face
// and the tile's colours: only the number loads another vibe's face, the one
// file per vibe vibe.js prefetches for this sheet, which keeps it cheap.
//
// The inner element also carries data-vibe="<id>", so a vibe's own stylesheet,
// whose every selector starts [data-vibe="<id>"], reaches its own tile the way
// it reaches the app — a numeral face whose caps need another size, a scrim
// over its thumbnail — and no other vibe's.
//
// THE CHROME IS THE CURRENT VIBE'S. The sheet's ground, its title, the ring and
// Close spend the tokens on <html>, so a pick restyles them at once, and the
// tiles do not change, because each only ever spends its own. Restyle, never
// rebuild: the list stays where it was, anchored on the tile that was tapped
// in case the new face re-wrapped a line above it.
//
// THE CURRENT ONE IS MARKED BY SHAPE, NEVER BY COLOUR ALONE (WCAG 1.4.1): a ring
// round its tile in the sheet's own ink, a drawn check in the tile's, and
// aria-current for a screen reader. No word, no tint, no bolder name. The check
// is drawn, not a font glyph, so it never depends on a vibe's face having one,
// and it is not green: a green ✓ is a set done.
//
// TAP = ON, AT ONCE (store.js setVibe): the look goes on, then the choice is
// written; the sheet stays open. Tapping the one he wears does nothing. Every
// part of a tile is local — tokens in the bundle, the thumbnail and the face in
// the offline cache — so the sheet works offline, and a pick made offline
// queues like any setting. A refused pick has already been put back and said
// so on the red bar by the time the promise rejects, so the sheet only follows.
//
// SIZED BY CLASS (rack.css "Look → Vibes"), never by an inline height: every
// tile is at least 112px tall and the whole tile is the target.

import { el, svgEl, sheet } from './ui.js';
import { vibe, setVibe } from './store.js';
import { def, imageUrl, onVibeChange } from './vibe.js';
import { list, ROLES, DEFAULT, at, sideOf, hexToRgb, valueOf } from './vibes/defs/index.js';

/* The sample every tile shows (research track 10 §4.3.1): three glyphs, so it
   fits every face at the same cap height, and plainly not his data. Hidden
   from screen readers with the rest of the sample card. */
const SAMPLE = '315';

/* ---------- a vibe's tokens, as its own stylesheet block spells them ----------
   The same text tools-check/vibes-css.mjs generates for :root[data-vibe="<id>"]
   — every custom-property role but the fixed layout and motion ones, in ROLES
   order, then color-scheme where the vibe sets one — built the same way, so a
   tile and the app in that vibe can never disagree. tools-check/vibe-setting.mjs
   holds the two to each other, value for value. */
const PROPS = ROLES.filter(r => typeof r.web === 'string' && r.web.startsWith('--') && !r.fixed);
const num = n => String(n).replace(/^(-?)0\./, '$1.');
const len = n => (n === 0 ? '0' : num(n) + 'px');

function colourOf(d, role, a) {
  const hex = sideOf(d.colors[role], 'web');
  if (typeof hex !== 'string') throw new Error('no colour role ' + role);
  if (a === undefined) return hex;
  const rgb = hexToRgb(hex);
  if (!rgb) throw new Error('no channels for ' + role);
  return 'rgba(' + rgb.join(',') + ',' + num(a) + ')';
}

function cssText(d, role) {
  // valueOf(): the definition's own value, else what the role says one
  // without it takes; null is nothing drawn, so no property
  const v = valueOf(d, role.path);
  if (v === undefined || v === null) return undefined;
  if (role.ref === 'color') return colourOf(d, v);
  if (role.channel) {
    const rgb = hexToRgb(sideOf(d.colors[v], 'web'));
    if (!rgb) throw new Error(role.path + ' has no channels');
    return rgb.join(',');
  }
  switch (role.kind) {
    case 'radius': return typeof v === 'number' ? len(v) : String(v);
    case 'shadow': {
      const layers = sideOf(v, 'web');
      if (!Array.isArray(layers)) throw new Error(role.path + ' has no web layers');
      if (!layers.length) return 'none';
      return layers.map(l => [l.inset ? 'inset' : null, len(l.x), len(l.y), len(l.blur),
        l.spread ? len(l.spread) : null, colourOf(d, l.color, l.a)].filter(Boolean).join(' ')).join(', ');
    }
    case 'scrim':
      if (typeof v === 'string') return v;
      if (v && Array.isArray(v.stops)) {
        return 'linear-gradient(' + v.dir + ', ' + v.stops.map(s => colourOf(d, s.color, s.a) + ' ' +
          num(Math.round(s.at * 1000) / 10) + '%').join(', ') + ')';
      }
      throw new Error(role.path + ' is not a filter or a gradient');
    case 'tint':
      if (!v || typeof v.color !== 'string' || typeof v.a !== 'number') throw new Error(role.path + ' is not { color, a }');
      return colourOf(d, v.color, v.a);
    case 'shape':
      if (typeof v === 'number') return len(v);
      if (typeof v === 'boolean') return v ? '1' : '0';
      throw new Error(role.path + ' is not a number or a switch');
    case 'image':                                   // a photo band's height, px
      if (typeof v === 'number') return len(v);
      throw new Error(role.path + ' is not a number');
    case 'type':                                    // a preset's key (type.tag.*), by its unit
      if (typeof v !== 'number') throw new Error(role.path + ' is not a number');
      if (role.unit === 'case') return v ? 'uppercase' : 'none';
      return num(v) + (role.unit || '');
    default: {
      const s = sideOf(v, 'web');
      if (typeof s !== 'string') throw new Error(role.path + ' is not a string');
      return s;
    }
  }
}

/* [[property, value], …] for one definition. A role it lacks or cannot spell
   is left out — the tile then shows the sheet's value there — rather than
   thrown: this runs inside a tap, and vibes-css.mjs has already refused any
   committed definition with a hole in it. */
export function vibeTokens(d) {
  const out = [];
  for (const r of PROPS) {
    let t;
    try { t = cssText(d, r); } catch { t = undefined; }
    if (t !== undefined) out.push([r.web, t]);
  }
  const cs = sideOf(at(d, 'chrome.colorScheme'), 'web');
  if (typeof cs === 'string') out.push(['color-scheme', cs]);
  return out;
}

/* ---------- the list ---------- */

/* The registry's vibes that this build can draw — each has its definition in
   vibe.js — in the registry's order, v1 first whatever that order says. One
   listed without a definition is left off rather than drawn as v1 under its
   name. */
function vibesToShow() {
  const shown = list().filter(m => def(m.id).id === m.id);
  return [...shown.filter(m => m.id === DEFAULT), ...shown.filter(m => m.id !== DEFAULT)];
}

/* The Settings row's value: the worn vibe's registered name, verbatim. */
export function vibeName() {
  const id = vibe();
  const m = list().find(v => v.id === id);
  return m ? m.name : id;
}

/* Whether a vibe's numeral face is ready: the first family of its numeral
   stack (face.web.num, the --font-num the card's figure is set in; a
   definition without one takes its face.web.font), loaded for the sample's
   glyphs. Until it is, the number is not drawn — a number in another vibe's
   face would misrepresent this one — and a face that never loads leaves it
   hidden for good. With no font loading API to ask, it is drawn. */
function faceReady(d) {
  const stack = d ? valueOf(d, 'face.web.num') : undefined;
  const family = typeof stack === 'string' ? stack.split(',')[0].trim() : '';
  let fonts = null;
  try { fonts = document.fonts; } catch {}
  if (!family || !fonts || typeof fonts.load !== 'function') return Promise.resolve(true);
  let asked;
  try { asked = fonts.load('800 35px ' + family, SAMPLE); } catch { return Promise.resolve(false); }
  return Promise.resolve(asked).then(faces => !!faces && faces.length > 0, () => false);
}

function checkMark() {
  const s = svgEl('svg', { class: 'vibe-check', viewBox: '0 0 20 20', 'aria-hidden': 'true' });
  s.appendChild(svgEl('path', { d: 'M4 10.5 L8.5 15 L16 5.5' }));
  return s;
}

function tile(m) {
  const d = def(m.id);
  const b = el('button', 'vibe-tile');
  b.type = 'button';
  const inner = el('span', 'vibe-in');
  inner.dataset.vibe = m.id;
  for (const [k, v] of vibeTokens(d)) inner.style.setProperty(k, v);

  // The sample: the vibe's card, its number, its accent, and its thumbnail
  // under the number where it has one. A swatch, so a screen reader skips it.
  const sample = el('span', 'vibe-sample');
  sample.setAttribute('aria-hidden', 'true');
  const src = imageUrl(m.id, 'thumb');
  if (src) {
    const img = el('img', 'vibe-thumb');
    img.alt = '';
    img.decoding = 'async';
    // A thumbnail that will not load leaves the card itself, never an empty frame.
    img.onerror = () => { img.remove(); sample.classList.remove('photo'); };
    img.src = src;
    sample.classList.add('photo');
    sample.appendChild(img);
  }
  const n = el('span', 'vibe-num wait', SAMPLE);
  sample.append(n, el('span', 'vibe-accent'));
  faceReady(d).then(ok => { if (ok) n.classList.remove('wait'); });

  const words = el('span', 'vibe-words');
  words.appendChild(el('span', 'vibe-name', m.name));
  words.appendChild(el('span', 'vibe-feel', m.feel));
  if (m.experimental) words.appendChild(el('span', 'vibe-exp', 'Experimental'));

  inner.append(sample, words);
  b.appendChild(inner);
  return { id: m.id, b, inner };
}

/* ================= THE SHEET =================
   Sheets never nest: the hub's row closes the hub, then opens this. Tall, as
   the Coach sheet is, and hugging its tiles up to that. `onEdit` is the hub's
   repaint hook and is not needed here: a pick repaints the screen behind this
   sheet itself (vibe.js applyVibe, app.js setRenderer). */
export function openVibes(onEdit) {
  let off = () => {};
  const { sh, close } = sheet(() => off());
  sh.classList.add('vibes-sheet');
  sh.appendChild(el('div', 'eyebrow', 'Look'));
  const title = el('h2', null, 'Vibes');
  title.id = 'vibes-title';
  sh.appendChild(title);

  const listEl = el('div', 'vibe-list');
  listEl.setAttribute('role', 'group');
  listEl.setAttribute('aria-labelledby', 'vibes-title');
  const tiles = vibesToShow().map(tile);

  /* The ring and the check on the vibe worn, and on no other tile. */
  const mark = id => {
    for (const t of tiles) {
      const on = t.id === id;
      if (on) t.b.setAttribute('aria-current', 'true'); else t.b.removeAttribute('aria-current');
      const c = t.inner.querySelector('.vibe-check');
      if (on && !c) t.inner.appendChild(checkMark());
      if (!on && c) c.remove();
    }
  };

  for (const t of tiles) {
    t.b.onclick = () => {
      if (t.id === vibe()) return;
      const top = t.b.getBoundingClientRect().top;
      setVibe(t.id).catch(() => {});
      requestAnimationFrame(() => {
        const moved = t.b.getBoundingClientRect().top - top;
        if (moved) sh.scrollTop += moved;
      });
    };
    listEl.appendChild(t.b);
  }
  sh.appendChild(listEl);

  const done = el('button', 'btn btn-ghost btn-block vibes-close', 'Close');
  done.onclick = close;
  sh.appendChild(done);

  mark(vibe());
  // A pick, and a refused pick put back, both arrive here.
  off = onVibeChange(v => mark(v));

  // It opens at the top, unless the tile worn would sit below the fold.
  const cur = tiles.find(t => t.id === vibe());
  if (cur) {
    const s = sh.getBoundingClientRect(), r = cur.b.getBoundingClientRect();
    if (r.bottom > s.bottom) sh.scrollTop += r.top - s.top - 16;
  }
}
