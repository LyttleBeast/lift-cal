// chk-ev2-probe.mjs — engine v2 checker: a scratch vibe that sets every new
// role, built by native theme.js build() (nat-ev2) and by the web generator
// lifted from web-ev2's tools-check/vibes-css.mjs; then the two compared.
// Also runs the four spec definitions (web-design, untracked) through both.
// Read-only on every tree; writes only a scratch module under ~/dev/vibes-night/tmp.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
const W = '/Users/micahflunker/dev/vibes-night/wt/web-ev2', N = '/Users/micahflunker/dev/vibes-night/wt/nat-ev2';
const DESIGN = '/Users/micahflunker/dev/vibes-night/wt/web-design/vibes/defs';
const TMP = '/Users/micahflunker/dev/vibes-night/tmp/chk-ev2'; mkdirSync(TMP, { recursive: true });

// --- the web generator, lifted verbatim ---
const src = readFileSync(W + '/tools-check/vibes-css.mjs', 'utf8');
const a = src.indexOf('/* ================= the generator'), b = src.indexOf('/* ================= reading CSS');
const lifted = `import { ROLES, at, sideOf, hexToRgb, valueOf } from ${JSON.stringify(pathToFileURL(W + '/vibes/defs/index.js').href)};\n` +
  src.slice(a, b) + '\nexport { block, cssText, PROPS };\n';
writeFileSync(TMP + '/gen.mjs', lifted);
const G = await import(pathToFileURL(TMP + '/gen.mjs').href);
const I = await import(pathToFileURL(W + '/vibes/defs/index.js').href);

// --- native build ---
const R = await import(pathToFileURL(N + '/tools/lib/rn-render.mjs').href);
R.restoreConsole && R.restoreConsole();
const THEME = R.load('src/ui/theme.js');
const V1 = R.load('src/pure/vibes/defs/v1.js').default;
const clone = v => JSON.parse(JSON.stringify(v));
let fails = 0; const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (!c) fails++; };

const S = clone(V1);
S.id = 'zz'; S.name = 'ZZ';
S.colors.band = '#101010';
S.shadow.calHead = { web: [{ x: 0, y: 0, blur: 0, spread: 1, color: 'chalk', a: 0.9 }] };
S.shadow.calTarget = { web: [{ x: 0, y: 0, blur: 0, spread: 2, color: 'steel' }] };
S.tagInk = { W: 'warn', F: 'danger', D: 'accent' };
S.inkOf = { ...S.inkOf, pYellow: 'warn', pChrome: 'steel', pBlue: 'chalk' };
S.tint.runway = { color: 'knurl', a: 0.5 }; S.tint.runwayEdge = { color: 'knurl', a: 1 };
S.type.meta = { size: 14, wdth: 100, wght: 400, lh: 1.3, color: 'steel' };
S.face.web.display = "'ZZ Display', serif"; S.face.web.italic = "'ZZ Italic', serif"; S.face.web.num = "'ZZ Num'";
S.face.bands = [{ max: 80, family: 'ZZCond', keys: ['ZZCond_800'], snap: {}, weights: [800], minLh: 1.2 }];
const SCR = { dir: 'to bottom', stops: [{ color: 'rack', a: 0.54, at: 0 }] };
S.images = { youHero: { file: 'img/you.png', focal: { x: 0.5, y: 0.5 }, band: 80, scrim: SCR },
             stepsToday: { file: 'img/steps.png', band: 64, scrim: SCR }, coachCard: { file: 'img/c.png', band: 50, scrim: SCR } };
S.shape = { rule: { ink: 'chalk', hair: 0.5, head: [3, 2, 1.2], place: 'below', sub: [1.2], total: [1, 2, 1] },
            leader: { ink: 'dim', pitch: 4.5 }, lead: { keyline: true }, gutter: 3 };
S.variants = { ...S.variants, chart: 'print' };

const nat = THEME.build(S, { images: { youHero: 1, stepsToday: 2, coachCard: 3 } });
const web = G.block('zz', S);
const tok = Object.fromEntries([...web.text.matchAll(/^\s+(--[\w-]+):\s*(.*);$/gm)].map(m => [m[1], m[2]]));
const hex = r => I.sideOf(S.colors[r], 'web'), nhex = r => nat.colors[r];
const rgba = (h, al) => { const c = I.hexToRgb(h); return `rgba(${c.join(',')},${String(al).replace(/^0\./, '.')})`; };

console.log('\nA. scratch vibe "zz" — web generated block');
ok(/:root\[data-vibe="zz"\]::before \{[^}]*height: var\(--safe-top\); background: var\(--band\)/.test(web.text) && tok['--band'] === '#101010', '(a) colors.band: --band #101010 and the strip rule under --safe-top');
ok(tok['--shadow-cal-head'] === '0 0 0 1px ' + rgba(hex('chalk'), 0.9) && tok['--shadow-cal-target'] === '0 0 0 2px ' + hex('steel'), '(b) --shadow-cal-head/target: ' + tok['--shadow-cal-head'] + ' | ' + tok['--shadow-cal-target']);
ok(tok['--tag-ink-w'] === hex('warn') && tok['--tag-ink-f'] === hex('danger') && tok['--tag-ink-d'] === hex('accent'), '(c) --tag-ink-w/f/d = warn/danger/accent');
ok(tok['--tint-runway'] === rgba(hex('knurl'), 0.5) && tok['--tint-runway-edge'] === rgba(hex('knurl'), 1), '(d) --tint-runway ' + tok['--tint-runway'] + ', edge ' + tok['--tint-runway-edge']);
ok(tok['--ink-of-p-yellow'] === hex('warn') && tok['--ink-of-p-chrome'] === hex('steel') && tok['--ink-of-p-blue'] === hex('chalk') && tok['--ink-of-p-red'] === hex('pRed'), '(e) --ink-of-* follow inkOf, unset plates ink themselves');
ok(tok['--font-display'] === "'ZZ Display', serif" && tok['--font-italic'] === "'ZZ Italic', serif" && tok['--font-num'] === "'ZZ Num'", '(e) --font-display/italic/num');
ok(tok['--shape-rule-ink'] === hex('chalk') && tok['--shape-rule-hair'] === '.5px' && tok['--shape-rule-head-0'] === '3px' && tok['--shape-rule-head-1'] === '2px' && tok['--shape-rule-head-2'] === '1.2px' &&
   tok['--shape-rule-sub-0'] === '1.2px' && tok['--shape-rule-sub-1'] === '0' && tok['--shape-rule-total-1'] === '2px' && tok['--shape-lead-keyline'] === '1' &&
   tok['--shape-leader-ink'] === hex('dim') && tok['--shape-leader-pitch'] === '4.5px' && tok['--shape-leader-dot'] === '1.5px' && tok['--shape-gutter'] === '3px' && tok['--shape-band-fill'] === hex('raised'),
   '(e) --shape-* params (set ones follow, left-out ones at vocab defaults)');
ok(tok['--photo-band-you-hero'] === '80px' && tok['--photo-band-steps-today'] === '64px' && !('--photo-band-weight-log' in tok), '(f) --photo-band-you-hero 80px, steps 64px, unset slot writes none');
ok(!('--type-meta' in tok), '(e) type.meta is native-only (no web token)');

console.log('\nB. scratch vibe "zz" — native build()');
ok(!('band' in nat.colors), '(a) native: no T.colors.band (StatusBar handles it)');
ok(nat.ring.calHead && nat.ring.calHead.borderWidth === 1 && nat.ring.calHead.borderColor === rgba(nhex('chalk'), 0.9).replace('.9)', '0.9)') || (nat.ring.calHead && /0?\.9\)$/.test(nat.ring.calHead.borderColor)), '(b) T.ring.calHead ' + JSON.stringify(nat.ring.calHead));
ok(nat.ring.calTarget && nat.ring.calTarget.borderWidth === 2 && nat.ring.calTarget.borderColor === nhex('steel'), '(b) T.ring.calTarget ' + JSON.stringify(nat.ring.calTarget));
ok(nat.tagInk.W === nhex('warn') && nat.tagInk.F === nhex('danger') && nat.tagInk.D === nhex('accent'), '(c) T.tagInk ' + JSON.stringify(nat.tagInk));
ok(nat.inkOf.pYellow === nhex('warn') && nat.inkOf.pChrome === nhex('steel') && nat.inkOf.pBlue === nhex('chalk') && nat.inkOf.pRed === nhex('pRed'), '(e) T.inkOf ' + JSON.stringify(nat.inkOf));
ok(nat.text.meta && nat.text.meta.fontSize === 14 && nat.text.meta.color === nhex('steel'), '(e) T.text.meta ' + JSON.stringify(nat.text.meta));
ok(nat.fonts.keys.includes('ZZCond_800') && nat.face(75, 800) === 'ZZCond_800', '(e) face.bands: fonts.keys has ZZCond_800; face(75,800) = ' + nat.face(75, 800));
ok(nat.shape.rule.ink === nhex('chalk') && nat.shape.rule.hair === 0.5 && JSON.stringify(nat.shape.rule.head) === '[3,2,1.2]' && JSON.stringify(nat.shape.rule.sub) === '[1.2]' &&
   JSON.stringify(nat.shape.rule.total) === '[1,2,1]' && nat.shape.rule.place === 'below' && nat.shape.leader.ink === nhex('dim') && nat.shape.leader.dot === 1.5 && nat.shape.lead.keyline === true && nat.shape.gutter === 3 && nat.shape.band.fill === nhex('raised'),
   '(e) T.shape merged over the vocab defaults, colours resolved');
ok(nat.image('youHero').band === 80 && nat.image('stepsToday').band === 64 && nat.image('coachCard').band === 50, '(f) T.image(slot).band: youHero 80, stepsToday 64, coachCard 50 (the Coach card box ignores it by design)');
ok(nat.variant.chart === 'print', '(g) variant chart print reaches T.variant');

console.log('\nC. web and native agree on the colours they share');
const same = (w, n) => String(w).toLowerCase() === String(n).toLowerCase();
ok(same(tok['--tag-ink-w'], nat.tagInk.W) && same(tok['--tag-ink-f'], nat.tagInk.F) && same(tok['--tag-ink-d'], nat.tagInk.D), 'tagInk web = native');
ok(['pRed', 'pBlue', 'pYellow', 'pGreen', 'pWhite', 'pChrome'].every(k => same(tok['--ink-of-' + k.replace(/[A-Z]/g, c => '-' + c.toLowerCase())], nat.inkOf[k])), 'inkOf web = native (where both sides use web hex)');

console.log('\nD. v1 through both: nothing new drawn');
const v1web = G.block('v1', V1);
ok(!/::before/.test(v1web.text) && !/--band:/.test(v1web.text) && /--shadow-cal-head: none;/.test(v1web.text), 'v1 block: no strip, no --band, cal rings none');
const nv1 = THEME.build(V1);
ok(nv1.ring.calHead === null && nv1.ring.calTarget === null && nv1.tagInk.W === nv1.colors.pYellow && nv1.inkOf.pBlue === nv1.colors.pBlue, 'native v1: no rings, badge letters and inks are the plates');

console.log('\nE. the four spec definitions, as written (web-design, untracked)');
for (const id of ['iron-age', 'chalk', 'navy', 'oxblood']) {
  const def = (await import(pathToFileURL(`${DESIGN}/${id}.js`).href)).default;
  let wb = null, nb = null, we = null, ne = null;
  try { wb = G.block(id, def); } catch (e) { we = e.message; }
  const imgs = Object.fromEntries(Object.keys(def.images || {}).map((k, i) => [k, i + 1]));
  try { nb = THEME.build(def, { images: imgs }); } catch (e) { ne = e.message; }
  ok(!!wb && !!nb, `${id}: web block ${wb ? 'generated (' + wb.text.split('\n').length + ' lines' + (wb.missing.length ? ', missing ' + wb.missing.join(',') : '') + ')' : 'THREW ' + we}; native build ${nb ? 'ok' : 'THREW ' + ne}`);
  if (wb && nb) {
    const t = Object.fromEntries([...wb.text.matchAll(/^\s+(--[\w-]+):\s*(.*);$/gm)].map(m => [m[1], m[2]]));
    console.log(`    band ${t['--band'] || '-'} strip ${/::before/.test(wb.text)}; calHead ${t['--shadow-cal-head']} / native ${JSON.stringify(nb.ring.calHead)}; tagInk web ${t['--tag-ink-w']},${t['--tag-ink-f']},${t['--tag-ink-d']} native ${nb.tagInk.W},${nb.tagInk.F},${nb.tagInk.D}; runway ${t['--tint-runway']}; num ${t['--font-num']}; photo bands ${Object.keys(t).filter(k => k.startsWith('--photo-band')).map(k => k + '=' + t[k]).join(' ') || '-'} / native ${['youHero', 'summaryHero', 'stepsToday', 'weightLog'].map(s => nb.image(s) && nb.image(s).band).join(',')}; chart ${nb.variant.chart}; icons ${def.icons}`);
    console.log(`    T.text.meta ${JSON.stringify(nb.text.meta && { f: nb.text.meta.fontFamily, s: nb.text.meta.fontSize, c: nb.text.meta.color })}; shape.rule ${JSON.stringify(nb.shape.rule)}; inkOf.pYellow web ${t['--ink-of-p-yellow']} native ${nb.inkOf.pYellow}`);
  }
}
console.log('\n' + (fails ? fails + ' FAILED' : 'all passed'));
process.exit(fails ? 1 : 0);
