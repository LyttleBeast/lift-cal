// Which lines the engine changed (928a65e..HEAD in wt/web-engine) ever ran in a
// prove.mjs scene: reads coverage-B.jsonl (V8 block coverage of B's scripts,
// taken after each group by the scratch harness copy tmp/hsens-cov) and prints,
// per changed JS file, the changed code lines no scene executed.
//   node ~/dev/vibes-night/tools/hsens-cov.mjs <runDir> [--engine <tree>] [--base <sha>]
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2);
const runDir = args[0];
const opt = k => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : null; };
const ENGINE = opt('engine') || '/Users/micahflunker/dev/vibes-night/wt/web-engine';
const BASE = opt('base') || '928a65e';

const entries = readFileSync(join(runDir, 'coverage-B.jsonl'), 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
// path -> list of { group, functions }
const byPath = new Map();
for (const e of entries) for (const s of e.scripts) {
  let p; try { p = new URL(s.url).pathname.replace(/^\//, ''); } catch { continue; }
  if (!byPath.has(p)) byPath.set(p, []);
  byPath.get(p).push({ group: e.group + '@' + e.width, functions: s.functions });
}

// Changed lines on the B side.
const diff = spawnSync('git', ['-C', ENGINE, 'diff', '-U0', BASE, 'HEAD', '--', '*.js', ':!tools-check', ':!report'], { encoding: 'utf8', maxBuffer: 64e6 }).stdout;
const changed = new Map();
let file = null, bLine = 0;
for (const line of diff.split('\n')) {
  if (line.startsWith('+++ ')) { file = line.slice(4).replace(/^b\//, ''); if (file === '/dev/null') file = null; continue; }
  if (line.startsWith('--- ')) continue;
  const h = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/);
  if (h) { bLine = +h[1]; continue; }
  if (!file) continue;
  if (line.startsWith('+')) { if (!changed.has(file)) changed.set(file, []); changed.get(file).push(bLine); bLine++; }
}

// Innermost range count at an offset, over one script load's functions.
function countAt(functions, off) {
  let best = null;
  for (const f of functions) for (const r of f.ranges) {
    if (off < r.startOffset || off >= r.endOffset) continue;
    const len = r.endOffset - r.startOffset;
    if (!best || len < best.len) best = { len, count: r.count };
  }
  return best ? best.count : null;
}

const report = { run: runDir, groups: [...new Set(entries.map(e => e.group + '@' + e.width))], files: {} };
let out = '';
for (const [f, lines] of changed) {
  const src = readFileSync(join(ENGINE, f), 'utf8');
  const starts = [0];
  for (let i = 0; i < src.length; i++) if (src[i] === '\n') starts.push(i + 1);
  const loads = byPath.get(f) || [];
  const rows = [];
  let code = 0, never = 0;
  let inBlockComment = false;
  const allLines = src.split('\n');
  // Track block comments across the whole file so comment lines are skipped.
  const isComment = new Array(allLines.length).fill(false);
  for (let i = 0; i < allLines.length; i++) {
    const t = allLines[i].trim();
    if (inBlockComment) { isComment[i] = true; if (t.includes('*/')) inBlockComment = false; continue; }
    if (t.startsWith('//')) { isComment[i] = true; continue; }
    if (t.startsWith('/*')) { isComment[i] = true; if (!t.includes('*/')) inBlockComment = true; continue; }
  }
  for (const ln of lines) {
    const text = allLines[ln - 1] || '';
    const t = text.trim();
    if (!t || isComment[ln - 1] || /^[\]\)\}]*[;,]?$/.test(t)) continue;
    code++;
    const off = starts[ln - 1] + (text.length - text.trimStart().length);
    let ran = false, seenIn = [];
    for (const L of loads) { const c = countAt(L.functions, off); if (c > 0) { ran = true; seenIn.push(L.group); } }
    if (!ran) { never++; rows.push({ line: ln, text: t.slice(0, 160), loaded: loads.length > 0 }); }
  }
  report.files[f] = { changedCodeLines: code, neverRan: never, loads: loads.length, rows };
  out += '=== ' + f + ': changed code lines ' + code + ', never ran ' + never + (loads.length ? '' : ' (NEVER LOADED)') + '\n';
  for (const r of rows) out += '  ' + String(r.line).padStart(5) + '  ' + r.text + '\n';
}
writeFileSync(join(runDir, 'coverage-report.json'), JSON.stringify(report, null, 1));
writeFileSync(join(runDir, 'coverage-report.txt'), out);
console.log(out);
