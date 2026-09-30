// D.1 scratch verifier for vibes/defs/vocab.js (not a tree verifier; run by hand).
//   node ~/dev/vibes-night/tools/d1-vocab-check.mjs
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const WEB = '/Users/micahflunker/dev/vibes-night/wt/web-design';
const NAT = '/Users/micahflunker/dev/rack-mobile';
const src = readFileSync(join(WEB, 'vibes/defs/vocab.js'), 'utf8');
const V = (await import(pathToFileURL(join(WEB, 'vibes/defs/vocab.js')).href)).default;
const IDX = await import(pathToFileURL(join(WEB, 'vibes/defs/index.js')).href);
const V1 = (await import(pathToFileURL(join(WEB, 'vibes/defs/v1.js')).href)).default;

let fails = 0, checks = 0;
const ok = (c, m) => { checks++; if (!c) { fails++; console.log('  x ' + m); } };

ok(!/^\s*import\b/m.test(src) && !/\brequire\(/.test(src), 'imports nothing');
const frozen = o => !o || typeof o !== 'object' || (Object.isFrozen(o) && Object.values(o).every(frozen));
ok(frozen(V), 'frozen all the way down');

const contract = IDX.ROLES.filter(r => r.kind === 'variant').map(r => r.path.slice(9));
const blocks = Object.keys(V.blocks);
for (const b of contract) ok(blocks.includes(b), 'contract block present: ' + b);
console.log('blocks: ' + blocks.length + ' (' + contract.length + ' in the contract, ' + (blocks.length - contract.length) + ' new)');

// native variant.js table
const vsrc = readFileSync(join(NAT, 'src/ui/variant.js'), 'utf8');
const natNames = {};
for (const m of vsrc.matchAll(/^\s+(\w+):\s+Object\.freeze\(\[([^\]]*)\]\)/gm)) natNames[m[1]] = [...m[2].matchAll(/'([^']+)'/g)].map(x => x[1]);

const NAME = /^[a-z][A-Za-z0-9]*$/;
const roleOk = p => IDX.at(V1, p) !== undefined;
const webText = ['rack.css', 'auth.css', 'index.html', ...readdirSync(WEB).filter(f => f.endsWith('.js'))].map(f => readFileSync(join(WEB, f), 'utf8')).join('\n');
const cssText = ['rack.css', 'auth.css'].map(f => readFileSync(join(WEB, f), 'utf8')).join('\n');
const natFile = s => s.split(' ')[0];
for (const b of blocks) {
  const x = V.blocks[b];
  for (const k of ['label', 'web', 'native', 'switches', 'add', 'slots', 'reads', 'type', 'variants', 'v1', 'looks', 'keeps']) ok(k in x, b + ' has ' + k);
  ok(x.v1 === 'v1', b + ' v1 is v1');
  ok(x.variants[0] === 'v1' && x.variants.length >= 2 && new Set(x.variants).size === x.variants.length && x.variants.every(n => NAME.test(n)), b + ' names well formed');
  ok(JSON.stringify(Object.keys(x.looks)) === JSON.stringify(x.variants), b + ' looks match variants, in order');
  for (const [n, l] of Object.entries(x.looks)) {
    ok(n === 'v1' ? l.grade === 'v1' : ['shape', 'deep'].includes(l.grade), b + '.' + n + ' grade');
    ok(typeof l.look === 'string' && l.look.length > 10, b + '.' + n + ' look');
    if (n !== 'v1') ok(Array.isArray(l.for), b + '.' + n + ' for');
  }
  if (natNames[b]) for (const n of natNames[b]) ok(x.variants.includes(n), b + ' keeps native name ' + n);
  for (const r of x.reads) ok(roleOk(r), b + ' reads a v1 role: ' + r);
  for (const s of [...x.native, ...x.switches, ...x.add]) {
    const f = natFile(s);
    if (/^(src|app)\//.test(f)) ok(existsSync(join(NAT, f)), b + ' native file exists: ' + f);
  }
  for (const s of x.switches) {
    const f = natFile(s);
    ok(readFileSync(join(NAT, f), 'utf8').includes("variantOf('" + b + "')"), b + ' switch is at ' + f);
  }
  // an existing switch file not listed?
  for (const s of x.web) for (const m of s.matchAll(/\.([a-z][a-z0-9-]+)/g)) {
    if (/^(js|css|html|jsx)$/.test(m[1])) continue;
    const esc = m[1].replace(/-/g, '\\-');
    ok(new RegExp('\\.' + esc + '(?![a-z0-9-])').test(cssText) || new RegExp('[\'" ]' + esc + '[\'" ]').test(webText), b + ' web class seen: .' + m[1]);
  }
  ok(x.slots.every(s => ['youHero', 'coachCard', 'startWorkout', 'summaryHero', 'fuelSummary', 'stepsToday', 'weightLog'].includes(s)), b + ' slots are hero slots');
}
// every native switch in the tree is listed
for (const [b] of Object.entries(natNames)) {
  const listed = V.blocks[b].switches.map(natFile);
  ok(listed.length > 0, b + ' has its native switches listed');
}
// every hero slot is on some block
for (const s of ['youHero', 'coachCard', 'startWorkout', 'summaryHero', 'fuelSummary', 'stepsToday', 'weightLog']) ok(blocks.some(b => V.blocks[b].slots.includes(s)), 'slot placed: ' + s);
// params' colour roles exist
const P = V.params;
for (const r of [P.rule.ink, P.leader.ink, P.band.fill, P.band.ink, P.keyline.ink]) ok(r in V1.colors, 'param role exists: ' + r);
// grades
ok(Object.keys(V.grades).join() === 'v1,shape,deep', 'grades');

console.log(fails ? fails + ' of ' + checks + ' checks failed' : 'all ' + checks + ' checks passed');
for (const b of blocks) console.log(b.padEnd(14) + V.blocks[b].variants.join(' | '));
process.exit(fails ? 1 : 0);
