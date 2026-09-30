// D.1: builds design/VOCAB.md from design/vocab-head.md, vibes/defs/vocab.js
// (the generated sections 3-6) and design/vocab-tail.md.
//   node ~/dev/vibes-night/tools/d1-vocab-md.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const DES = '/Users/micahflunker/dev/vibes-night/design/';
const V = (await import(pathToFileURL('/Users/micahflunker/dev/vibes-night/wt/web-design/vibes/defs/vocab.js').href)).default;

const code = s => '`' + s + '`';
const lt = s => String(s).replace(/</g, '&lt;');
const cell = s => lt(s).replace(/\|/g, '\\|');
const out = [];

// 3. rules
V.rules.forEach((r, i) => out.push((i + 1) + '. ' + lt(r)));
out.push('');

// 4. params
out.push('## 4. The `shape` params (proposed)', '');
out.push('A look that draws a rule, a leader, a band, a gutter or a keyline reads these from a vibe definition\'s `shape` object. Any key the definition leaves out takes the default below.');
out.push('');
out.push('- **Units:** numbers are pt on native and px on the web, as radius is.');
out.push('- **Colours:** a colour value names a colour role, never a hex.');
out.push('- **Not in the contract yet.** Neither `v1.js` nor `index.js` `ROLES` has `shape`; §9 says why that is the orchestrator\'s call.');
out.push('- **v1 reads none of them.** It names no look.');
out.push('');
out.push('| Param | Default | Meaning | Looks that read it |');
out.push('|---|---|---|---|');
const users = key => Object.entries(V.blocks).flatMap(([b, x]) => Object.entries(x.looks)
  .filter(([n, l]) => n !== 'v1' && l.look.includes('shape.' + key)).map(([n]) => b + ' · ' + n));
const P = V.params;
const prow = (k, v, m) => out.push('| ' + code('shape.' + k) + ' | ' + code(JSON.stringify(v)) + ' | ' + cell(m) + ' | ' + (users(k).join(', ') || '—') + ' |');
prow('rule.ink', P.rule.ink, 'the colour role of every drawn rule; 3:1 on its ground where it carries structure (R2.2)');
prow('rule.hair', P.rule.hair, 'a hairline: row, cell and column dividers');
prow('rule.head', P.rule.head, 'the head rule, line and gap widths outermost first: [2] is one 2pt rule, [3, 2, 1] an Oxford rule');
prow('rule.place', P.rule.place, "'above': the head hangs from the rule. 'below': the head sits on it");
prow('leader', P.leader, 'drawn dots on the text baseline between a name and its value (ink role, dot size, pitch, shortest leader)');
prow('band', P.band, 'a filled strip holding a head\'s own words (ground role, ink role, height)');
prow('gutter', P.gutter, 'the gap between panels, board cells and strips');
prow('keyline', P.keyline, 'a stamped outline: plates, stamps, record cells (ink role, width)');
out.push('');

// 5. glance
out.push('## 5. The blocks at a glance', '');
out.push('The blocks are in `vocab.js` order. "(new)" marks the 12 that D.1 adds to the 17 the contract has today.');
out.push('');
out.push('- **"Switch today"** says whether native `cb47196` already branches on the block.');
out.push('- **"Photo slots"** names the hero slots the block carries (native `theme.js` `HERO_SLOTS`).');
out.push('');
out.push('| Block | What it is | Looks | Switch today | Photo slots |');
out.push('|---|---|---|---|---|');
const contract = ['card', 'youCard', 'sectionHeader', 'eyebrow', 'statRow', 'btn', 'chip', 'segmented', 'settingsRow', 'sheetHost', 'sheetTitle', 'dock', 'screenHeader', 'kpi', 'youHero', 'coachCard', 'chart'];
for (const [b, x] of Object.entries(V.blocks)) {
  out.push('| ' + code(b) + (contract.includes(b) ? '' : ' (new)') + ' | ' + cell(x.label) + ' | ' + x.variants.map(code).join(' ') + ' | ' +
    (x.switches.length ? 'yes (' + x.switches.length + ')' : 'no') + ' | ' + (x.slots.map(code).join(', ') || '—') + ' |');
}
out.push('');

// 6. block by block
out.push('## 6. Block by block', '');
out.push('For each block:');
out.push('- where it is drawn on each client;');
out.push('- the v1 roles it spends (its main ones, each checked against `v1.js`);');
out.push('- its looks;');
out.push('- what it keeps whatever the look, on top of §3.');
out.push('');
out.push('"Asked for by" names the research directions that want a look (SYNTHESIS §5). These are working names, not vibe ids.');
out.push('');
for (const [b, x] of Object.entries(V.blocks)) {
  out.push('### ' + code(b) + ': ' + x.label, '');
  out.push('- **Web:** ' + lt(x.web.join('; ')));
  out.push('- **Native:** ' + lt(x.native.join('; ')));
  out.push('- **Native switches today:** ' + (x.switches.length ? lt(x.switches.join('; ')) : 'none'));
  if (x.add.length) out.push('- **Switch sites to open:** ' + lt(x.add.join('; ')));
  if (x.slots.length) out.push('- **Photo slots:** ' + x.slots.map(code).join(', '));
  if (x.type.length) out.push('- **Type:** ' + lt(x.type.join('; ')));
  out.push('- **v1 roles it spends:** ' + x.reads.map(code).join(', '));
  out.push('');
  out.push('| Look | Grade | What it draws | Asked for by |');
  out.push('|---|---|---|---|');
  for (const n of x.variants) {
    const l = x.looks[n];
    out.push('| ' + code(n) + ' | ' + l.grade + ' | ' + cell(l.look) + ' | ' + (n === 'v1' ? 'today' : (l.for.length ? l.for.join(', ') : 'reserved')) + ' |');
  }
  out.push('');
  out.push('Keeps, whatever the look:');
  for (const k of x.keeps) out.push('- ' + lt(k));
  out.push('');
}

const md = readFileSync(DES + 'vocab-head.md', 'utf8') + out.join('\n') + readFileSync(DES + 'vocab-tail.md', 'utf8');
writeFileSync(DES + 'VOCAB.md', md);
console.log('design/VOCAB.md', md.length, 'bytes,', md.split('\n').length, 'lines');
