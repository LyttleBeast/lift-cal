// ev3k: run web-ev3's REAL generator (tools-check/vibes-css.mjs, its text from
// "the generator" through block()) on the scratch vibe, never registering it.
// The generator text is copied into tmp/ev3k/gen-extract.mjs with its imports.
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
const W = '/Users/micahflunker/dev/vibes-night/wt/web-ev3';
const OUT = '/Users/micahflunker/dev/vibes-night/tmp/ev3k';
const src = readFileSync(`${W}/tools-check/vibes-css.mjs`, 'utf8');
const a = src.indexOf('/* ================= the generator');
const b0 = src.indexOf('function block(id, def) {');
const b = src.indexOf('\n}\n', b0) + 3;
const head = `import { readFileSync } from 'node:fs';\nimport { pathToFileURL } from 'node:url';\n` +
  `const I = await import(${JSON.stringify(pathToFileURL(W + '/vibes/defs/index.js').href)});\n` +
  `const { ROLES, IDS, at, sideOf, hexToRgb, valueOf } = I;\n`;
writeFileSync(`${OUT}/gen-extract.mjs`, head + src.slice(a, b) + '\nexport { block, tokensOf, cssText };\n');
const G = await import(pathToFileURL(`${OUT}/gen-extract.mjs`).href);
const I = await import(pathToFileURL(W + '/vibes/defs/index.js').href);
const chalk = (await import(pathToFileURL(W + '/vibes/defs/chalk.js').href)).default;
const v1 = (await import(pathToFileURL(W + '/vibes/defs/v1.js').href)).default;
const { scratchOf } = await import(pathToFileURL(`${OUT}/scratch-v3.mjs`).href);
const s = scratchOf(chalk);
const out = G.block('ev3k-scratch', s);
writeFileSync(`${OUT}/scratch-web-block.css`, out.text);
const toks = new Map(out.text.split('\n').map(l => /^ {2}(--[\w-]+): (.*);$/.exec(l)).filter(Boolean).map(m => [m[1], m[2]]));
const want = {
  '--knob': '#123456', '--greet-name': '#654321',
  '--type-tag-size': '11px', '--type-tag-ls': '.06em', '--type-tag-upper': 'none', '--type-tag-wdth': '100', '--type-tag-wght': '600',
  '--shape-rule-hair': '0', '--shape-cue-ink': chalk.colors.accent, '--shape-chosen-tick': '1', '--shape-rank-column': '1'
};
let bad = 0;
for (const [k, v] of Object.entries(want)) { const got = toks.get(k); const ok = got === v; if (!ok) bad++; console.log((ok ? 'ok  ' : 'BAD ') + k + ' = ' + got + (ok ? '' : ' (want ' + v + ')')); }
const rules = out.text.split('\n').filter(l => l.startsWith(':root[data-vibe="ev3k-scratch"] ') || l.startsWith(':root[data-vibe="ev3k-scratch"]:'));
console.log('generated rules:\n  ' + rules.join('\n  '));
console.log('missing roles:', out.missing.join(', ') || 'none');
// any token for hero / pill / stripe / slab? (none expected: no web token)
console.log('tokens naming hero/pill/stripe/slab:', [...toks.keys()].filter(k => /hero|pill|stripe|slab/.test(k)).join(', ') || 'none');
// v1: the committed :root holds --knob / --greet-name at v1's; no --type-tag-*
const rack = readFileSync(`${W}/rack.css`, 'utf8');
const root = rack.slice(rack.indexOf(':root {'), rack.indexOf('\n}', rack.indexOf(':root {')));
const rootTok = k => (new RegExp(`\\n\\s*${k}:\\s*([^;]+);`).exec(root) || [])[1];
console.log(':root --knob', rootTok('--knob'), '--steel', rootTok('--steel'), '| --greet-name', rootTok('--greet-name'), '--accent', rootTok('--accent'),
  '| --shape-cue-ink', rootTok('--shape-cue-ink'), '--chalk', rootTok('--chalk'), '| any --type-tag in :root:', /--type-tag-/.test(root.replace(/\/\*[\s\S]*?\*\//g, '')));
// Chalk: its committed block equals the generator's
const chalkCss = readFileSync(`${W}/vibes/chalk.css`, 'utf8');
const cb = G.block('chalk', chalk).text;
console.log('chalk.css block == generator(chalk):', chalkCss.includes(cb));
// each ROLE resolves on the scratch def
const unres = I.ROLES.filter(r => I.valueOf(s, r.path) === undefined).map(r => r.path);
console.log('scratch unresolved roles:', unres.join(', ') || 'none');
console.log(bad ? `${bad} BAD` : 'all web tokens as expected');
