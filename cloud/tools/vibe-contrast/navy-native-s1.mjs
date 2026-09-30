// vibe-contrast/native.mjs — V59 §13.1 on native: every scene verify-vibe-v1
// draws over the seeded account (seeded + small passes), drawn with the account
// wearing a vibe (VIBE_SEED_VIBE, as verify-vibe-fit draws them), and every
// painted pair read off the drawn host tree: each Text / TextInput's ink over
// the backgrounds of the hosts it sits in (group opacity included), each SVG
// stroke and fill, each View border, and each Pressable's pressed ground.
//
//   node native.mjs --root <rack-mobile tree> --label chalk --vibe chalk [--out <dir>]
//   node native.mjs --root <tree> --label v1        (VIBE_SEED_VIBE unset: v1)
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const argv = process.argv.slice(2);
const arg = (f, d) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : d; };
const ROOT = resolve(arg('--root'));
const LABEL = arg('--label', 'run');
const VIBE = arg('--vibe', null);
const OUT = resolve(arg('--out', '/Users/micahflunker/dev/vibes-night/proof/vc-chalk-r1'));
mkdirSync(OUT, { recursive: true });

function renderPass(pass) {
  return new Promise((res, rej) => {
    const env = { ...process.env, TZ: 'America/New_York' };
    if (VIBE) env.VIBE_SEED_VIBE = VIBE; else delete env.VIBE_SEED_VIBE;
    const p = spawn(process.execPath, [join(ROOT, 'tools/verify-vibe-v1.mjs'), '--render', '--pass', pass, '--root', ROOT], { env, stdio: ['ignore', 'ignore', 'inherit', 'ipc'] });
    let got = null;
    p.on('message', m => { got = m; });
    p.on('exit', code => (got ? res(got) : rej(new Error(pass + ' exited ' + code))));
  });
}

const NAMED = { white: [255, 255, 255, 1], black: [0, 0, 0, 1], transparent: [0, 0, 0, 0] };
const P = v => {
  if (v == null || v === '$undefined') return null;
  if (typeof v !== 'string') return undefined;
  const s = v.trim().toLowerCase();
  if (NAMED[s]) return NAMED[s];
  let m = s.match(/^#([0-9a-f]{3,8})$/);
  if (m) {
    let h = m[1];
    if (h.length === 3 || h.length === 4) h = [...h].map(x => x + x).join('');
    const n = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16));
    return [...n, h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1];
  }
  m = s.match(/^rgba?\(([^)]+)\)$/);
  if (m) { const p = m[1].split(/[\s,\/]+/).filter(Boolean).map(Number); return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1]; }
  return undefined;
};
const over = (t, b) => {
  const a = t[3] + b[3] * (1 - t[3]);
  if (a <= 0) return [0, 0, 0, 0];
  return [0, 1, 2].map(i => (t[i] * t[3] + b[i] * b[3] * (1 - t[3])) / a).concat(a);
};
const hex = c => '#' + c.slice(0, 3).map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
const lin = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
const Lum = c => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
const CR = (a, b) => { const x = Lum(a), y = Lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

const SHAPES = /^(Path|Circle|Rect|Line|Polyline|Polygon|Ellipse)$/;
function walkScene(sc, ground) {
  const H = sc.hosts;
  const parent = new Array(H.length).fill(-1);
  const stack = [];
  H.forEach((e, i) => { while (stack.length && H[stack[stack.length - 1]].d >= e.d) stack.pop(); parent[i] = stack.length ? stack[stack.length - 1] : -1; stack.push(i); });
  const chain = i => { const c = []; for (let j = i; j >= 0; j = parent[j]) c.push(j); return c; };
  const hidden = i => chain(i).some(j => { const s = H[j].s || {}; return s.display === 'none' || s.opacity === 0; });
  const name = i => { const e = H[i]; const lab = e.p && (e.p.accessibilityLabel || e.p.testID); return e.t + (lab ? '[' + String(lab).slice(0, 24) + ']' : ''); };
  const ctx = i => { const c = chain(i).slice(0, 6).map(name); return c.join(' < '); };
  // pressed: j → use H[j].sp in place of H[j].s
  const paint = (i, start, fl, pressedAt = -1) => {
    let L = start, grounded = false;
    for (const j of chain(i)) {
      const s = (j === pressedAt && H[j].sp) ? H[j].sp : (H[j].s || {});
      const bg = P(s.backgroundColor);
      if (bg === undefined) fl.add('unparsed-bg:' + JSON.stringify(s.backgroundColor).slice(0, 40));
      else if (bg) { L = over(L, bg); if (L[3] >= 0.999) grounded = true; }
      if (s.opacity != null && s.opacity !== 1) {
        if (typeof s.opacity === 'number') { L = [L[0], L[1], L[2], L[3] * s.opacity]; fl.add('opacity' + s.opacity + '@' + H[j].t); }
        else fl.add('animated-opacity@' + H[j].t);
      }
      if (H[j].t === 'Modal') { if (!grounded) fl.add('ground-at-modal'); break; }
    }
    if (!grounded) fl.add('no-own-ground');
    return over(L, ground);
  };
  const rows = [];
  const add = (kind, i, fg, bg, extra = {}) => rows.push({ kind, ctx: ctx(i), fg: hex(fg), bg: hex(bg), ratio: +CR(fg, bg).toFixed(2), ...extra, fl: [...(extra.fl || [])].slice(0, 6) });
  H.forEach((e, i) => {
    if (hidden(i)) return;
    const s = e.s || {};
    if (e.t === 'Text' || e.t === 'TextInput') {
      // ink: own, else the nearest Text ancestor's
      let col = s.color;
      if (col == null && e.t === 'Text') for (let j = parent[i]; j >= 0 && H[j].t === 'Text'; j = parent[j]) if (H[j].s && H[j].s.color != null) { col = H[j].s.color; break; }
      let size = s.fontSize, w = s.fontWeight, fam = s.fontFamily;
      for (let j = parent[i]; j >= 0 && H[j].t === 'Text' && (size == null || fam == null); j = parent[j]) { const q = H[j].s || {}; if (size == null) size = q.fontSize; if (fam == null) fam = q.fontFamily; if (w == null) w = q.fontWeight; }
      const wt = fam && /_(\d{3})$/.test(fam) ? +fam.match(/_(\d{3})$/)[1] : (w ? +w : 400);
      const fs = +size || 14;
      const large = fs >= 24 || (fs >= 18.66 && wt >= 700), largeIos = fs >= 18 || (fs >= 14 && wt >= 700);
      const txt = e.t === 'Text' ? e.x : (e.p && e.p.value != null ? String(e.p.value) : '');
      if (txt != null && String(txt).trim() !== '') {
        const c = P(col);
        const fl = new Set();
        if (c) {
          add('text', i, paint(i, c, fl), paint(i, [0, 0, 0, 0], fl), { fl, fs, w: wt, large, largeIos, text: String(txt).slice(0, 48), raw: col, fam });
          // pressed: the nearest Pressable ancestor with a pressed style
          for (const j of chain(i)) if (H[j].sp && H[j].sp.backgroundColor !== (H[j].s || {}).backgroundColor) {
            const f2 = new Set(['pressed']);
            add('text-pressed', i, paint(i, c, f2, j), paint(i, [0, 0, 0, 0], f2, j), { fl: f2, fs, w: wt, large, largeIos, text: String(txt).slice(0, 48), raw: col });
            break;
          }
        } else if (c === undefined) rows.push({ kind: 'unparsed-ink', ctx: ctx(i), raw: JSON.stringify(col) });
        else if (e.t === 'Text' && col == null) rows.push({ kind: 'no-ink', ctx: ctx(i), text: String(txt).slice(0, 40) });
      }
      if (e.t === 'TextInput' && e.p && e.p.placeholder && !(e.p.value)) {
        const c = P(e.p.placeholderTextColor);
        const fl = new Set(['placeholder']);
        if (c) add('placeholder', i, paint(i, c, fl), paint(i, [0, 0, 0, 0], fl), { fl, fs, w: wt, large, largeIos, text: String(e.p.placeholder).slice(0, 48), raw: e.p.placeholderTextColor });
        else rows.push({ kind: 'placeholder-no-colour', ctx: ctx(i), text: e.p.placeholder });
      }
    }
    // SVG shapes: stroke / fill props (currentColor → the nearest color prop up the chain)
    if (SHAPES.test(e.t) || e.t === 'Svg' || e.t === 'G') {
      const p = e.p || {};
      const cur = () => { for (const j of chain(i)) { const q = H[j].p || {}; if (q.color) return q.color; } return null; };
      const res = v => (v === 'currentColor' ? cur() : v);
      const host = (() => { for (const j of chain(i)) if (!SHAPES.test(H[j].t) && H[j].t !== 'G' && H[j].t !== 'Svg') return j; return i; })();
      const op = chain(i).filter(j => j !== host && chain(host).indexOf(j) < 0).reduce((o, j) => o * (typeof (H[j].p || {}).opacity === 'number' ? H[j].p.opacity : 1), 1);
      if (SHAPES.test(e.t)) {
        const st = P(res(p.stroke)), sw = p.strokeWidth == null ? 1 : +p.strokeWidth;
        const fl = new Set(['svg']);
        const so = p.strokeOpacity == null ? 1 : +p.strokeOpacity, fo = p.fillOpacity == null ? 1 : +p.fillOpacity;
        const under = paint(host, [0, 0, 0, 0], fl);
        if (st && st[3] > 0 && sw > 0) add('svg-stroke', i, paint(host, [st[0], st[1], st[2], st[3] * so * op], new Set()), under, { fl, raw: p.stroke + (p.stroke === 'currentColor' ? '=' + cur() : ''), sw });
        const fillV = p.fill === undefined ? null : res(p.fill);
        const fc = P(fillV);
        if (fc && fc[3] > 0) add('svg-fill', i, paint(host, [fc[0], fc[1], fc[2], fc[3] * fo * op], new Set()), under, { fl, raw: p.fill });
      }
    }
    // borders on Views
    const bw = Math.max(+s.borderWidth || 0, +s.borderTopWidth || 0, +s.borderBottomWidth || 0, +s.borderLeftWidth || 0, +s.borderRightWidth || 0);
    if (bw > 0) {
      for (const k of ['borderColor', 'borderTopColor', 'borderBottomColor', 'borderLeftColor', 'borderRightColor']) {
        const c = P(s[k]);
        if (!c || !c[3]) continue;
        const fl = new Set([k]);
        const outer = parent[i] >= 0 ? paint(parent[i], [0, 0, 0, 0], fl) : ground;
        const edge = parent[i] >= 0 ? paint(parent[i], c, new Set()) : over(c, ground);
        const inner = paint(i, [0, 0, 0, 0], new Set());
        const control = chain(i).slice(0, 2).some(j => H[j].t === 'Pressable' || H[j].t === 'TextInput' || H[j].t === 'Switch') || e.t === 'TextInput';
        add('border', i, edge, outer, { fl, bw, raw: s[k], inner: hex(inner), vsInner: +CR(edge, inner).toFixed(2), fillVsOuter: +CR(inner, outer).toFixed(2), control, t: e.t });
      }
    }
    // a painted box with no text under it (a mark): its ground vs its parent's
    const bgc = P(s.backgroundColor);
    if (bgc && bgc[3] > 0 && parent[i] >= 0 && e.t === 'View') {
      const hasText = H.slice(i + 1).findIndex((x, k) => x.d <= e.d) ;
      let kids = false; for (let k = i + 1; k < H.length && H[k].d > e.d; k++) if ((H[k].t === 'Text' && H[k].x) || H[k].t === 'TextInput') { kids = true; break; }
      if (!kids) {
        const fl = new Set();
        const mine = paint(i, [0, 0, 0, 0], fl), under = paint(parent[i], [0, 0, 0, 0], fl);
        if (hex(mine) !== hex(under)) add('mark', i, mine, under, { fl, raw: s.backgroundColor, wh: [s.width, s.height].join('x') });
      }
    }
  });
  return rows;
}

// T.colors.rack of the vibe worn: the screen's page, under anything that sets no ground.
const { readFileSync } = await import('node:fs');
const defSrc = readFileSync(join(ROOT, 'src/pure/vibes/defs', (VIBE || 'v1') + '.js'), 'utf8');
const rackHex = (await import(join(ROOT, 'src/pure/vibes/defs', (VIBE || 'v1') + '.js'))).default.colors.rack;
if (!rackHex) throw new Error('no colors.rack in the definition');
const GROUND = P(rackHex);
console.log('ground', rackHex, 'vibe', VIBE);

const out = { label: LABEL, vibe: VIBE, root: ROOT, ground: rackHex, scenes: [] };
for (const pass of ['seeded', 'small']) {
  const r = await renderPass(pass);
  for (const sc of r.scenes) {
    if (/\$theme/.test(sc.name)) continue;
    out.scenes.push({ pass, name: sc.name, errors: sc.errors, rows: walkScene(sc, GROUND) });
  }
  console.log(pass, r.scenes.length, 'scenes');
}
writeFileSync(join(OUT, 'nat-' + LABEL + '.json'), JSON.stringify(out));
console.log('→', join(OUT, 'nat-' + LABEL + '.json'));
process.exit(0);
