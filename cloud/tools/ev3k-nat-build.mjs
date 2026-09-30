// ev3k: native build() on nat-ev3 for (1) the scratch vibe — do the v3 roles
// arrive? — and (2) Chalk and v1, against main's build (rack-mobile main,
// whose src/ui is f3382d3's): does any key main's T had move?
// Read-only: loads each tree's own rn-render (which compiles from that tree).
import { pathToFileURL } from 'node:url';
const EV3 = '/Users/micahflunker/dev/vibes-night/wt/nat-ev3';
const MAIN = '/Users/micahflunker/dev/rack-mobile';
const which = process.argv[2] || 'ev3';
const ROOT = which === 'main' ? MAIN : EV3;
const R = await import(pathToFileURL(ROOT + '/tools/lib/rn-render.mjs').href);
R.restoreConsole && R.restoreConsole();
const THEME = R.load('src/ui/theme.js');
const V1 = R.load('src/pure/vibes/defs/v1.js').default;
const CHALK = R.load('src/pure/vibes/defs/chalk.js').default;
const canon = v => {
  if (v === undefined) return '"$undefined"';
  if (typeof v === 'function') return '"$fn"';
  if (typeof v === 'number' && !Number.isFinite(v)) return JSON.stringify(String(v));
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return '[' + v.map(canon).join(',') + ']';
  return '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + canon(v[k])).join(',') + '}';
};
// flatten a built theme to path -> canon value; functions sampled on a small plan
const TYPE_ARGS = [{ size: 10, wdth: 88, wght: 700, ls: 0.1, upper: 1, color: null }, { size: 34, wdth: 112, wght: 800, ls: -0.02, lh: 1, tnum: 1 }, { size: 13, lh: 1.5 }];
function flat(T) {
  const out = {};
  const walk = (v, p, depth) => {
    if (typeof v === 'function') {
      const tries = /type$/.test(p) ? TYPE_ARGS.map(a => [a]) : /loadNum$/.test(p) ? [[26], [40]] : /^alpha\./.test(p) ? [[0.14], [0.5]] :
        /(group|groupPlate|subject|kpi)$/.test(p) ? [['chest'], ['fuel'], ['steps']] : /plate$/.test(p) ? [[0], [3]] : /face$/.test(p) ? [[88, 700], [112, 800]] : /cardSkin$/.test(p) ? [[]] : null;
      if (!tries) { out[p] = '$fn(unsampled)'; return; }
      out[p] = tries.map(a => { try { return canon(v(...a)); } catch (e) { return '$threw ' + e.message; } }).join(' | ');
      return;
    }
    if (v && typeof v === 'object' && !Array.isArray(v) && depth < 6) { for (const k of Object.keys(v)) walk(v[k], p ? p + '.' + k : k, depth + 1); return; }
    out[p] = canon(v);
  };
  walk(T, '', 0);
  return out;
}
const res = { which, v1: flat(THEME.build(V1)), chalk: flat(THEME.build(CHALK)), T: flat(THEME.default) };
if (which === 'ev3') {
  const { scratchOf } = await import('/Users/micahflunker/dev/vibes-night/tmp/ev3k/scratch-v3.mjs');
  const S = THEME.build(scratchOf(CHALK));
  res.scratch = {
    knob: S.colors.knob, greetName: S.colors.greetName, chalkSteel: CHALK.colors.steel, chalkAccent: CHALK.colors.accent,
    hero: S.text.hero, tag: S.text.tag, pill: S.text.pill, headline: S.text.headline,
    shape: { hair: S.shape.rule.hair, stripe: S.shape.stripe, cue: S.shape.cue, chosen: S.shape.chosen, rank: S.shape.rank, slab: S.shape.slab }
  };
  const C = THEME.build(CHALK);
  res.chalkV3 = { knob: C.colors.knob, greetName: C.colors.greetName, hero: C.text.hero, headline: C.text.headline, tag: C.text.tag, pill: C.text.pill, cue: C.shape.cue };
}
const { writeFileSync } = await import('node:fs');
writeFileSync(`/Users/micahflunker/dev/vibes-night/tmp/ev3k/nat-build-${which}.json`, JSON.stringify(res, null, 1));
console.log('wrote', which, Object.keys(res.chalk).length, 'chalk paths');
