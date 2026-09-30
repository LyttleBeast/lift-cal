#!/usr/bin/env node
/* rev1-cov — which changed lines of the engine's app/ and src/ did any
 * verify-vibe-v1 scene execute? (Pnat adversarial reviewer, coverage lens.)
 *
 * Reads NODE_V8_COVERAGE output of a verify-vibe-v1 run, recompiles each app
 * file exactly as tools/lib/rn-render.mjs does (babel JSX automatic + CJS) with
 * a source map, maps V8 block counts back to original lines, and intersects
 * with `git diff -U0 1cb6498..HEAD -- app src`.
 *
 * usage: node rev1-cov.mjs <tree> <covdir> <outfile> [--all]
 */
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';

const [TREE, COVDIR, OUT] = process.argv.slice(2);
const req = createRequire(join(TREE, 'package.json'));
const babel = req('@babel/core');
const { TraceMap, eachMapping } = req('@jridgewell/trace-mapping');
const JSX_PLUGIN = req.resolve('@babel/plugin-transform-react-jsx');
const CJS_PLUGIN = req.resolve('@babel/plugin-transform-modules-commonjs');

const compile = (code, filename) => babel.transformSync(code, {
  filename, babelrc: false, configFile: false, sourceType: 'module',
  plugins: [[JSX_PLUGIN, { runtime: 'automatic' }], CJS_PLUGIN], sourceMaps: true
});

/* 1. coverage, per file: a list of per-process range lists */
const perFile = new Map();
for (const f of readdirSync(COVDIR)) {
  if (!f.endsWith('.json')) continue;
  const j = JSON.parse(readFileSync(join(COVDIR, f), 'utf8'));
  for (const r of j.result) {
    const pre = 'file://' + TREE + '/';
    if (!r.url.startsWith(pre)) continue;
    const rel = r.url.slice(pre.length);
    if (!/^(src|app)\//.test(rel)) continue;
    if (!perFile.has(rel)) perFile.set(rel, []);
    perFile.get(rel).push(r.functions);
  }
}

/* 2. changed lines (new side) from the diff */
const diffText = execFileSync('git', ['-C', TREE, 'diff', '-U0', '1cb6498..HEAD', '--', 'app', 'src'], { encoding: 'utf8', maxBuffer: 1 << 28 });
const changed = new Map(); // rel -> Set(lines)
let cur = null;
for (const line of diffText.split('\n')) {
  let m;
  if ((m = line.match(/^\+\+\+ b\/(.*)$/))) { cur = m[1]; if (!changed.has(cur)) changed.set(cur, new Set()); continue; }
  if (line.startsWith('+++ /dev/null')) { cur = null; continue; }
  if ((m = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/)) && cur) {
    const start = +m[1], n = m[2] == null ? 1 : +m[2];
    for (let i = 0; i < n; i++) changed.get(cur).add(start + i);
  }
}

const out = [];
const summary = [];
for (const [rel, lines] of [...changed].sort()) {
  if (!lines.size) continue;
  const src = readFileSync(join(TREE, rel), 'utf8');
  const srcLines = src.split('\n');
  const covs = perFile.get(rel);
  if (!covs) {
    summary.push(rel + ': NEVER LOADED by any scene (' + lines.size + ' changed lines)');
    out.push('\n=== ' + rel + ' — never loaded');
    continue;
  }
  const c = compile(src, join(TREE, rel));
  const code = c.code;
  const N = code.length;
  // executed[offset] = true if any process counted > 0 at that offset
  const exec = new Uint8Array(N);
  let lenOk = true;
  for (const fns of covs) {
    const cnt = new Int32Array(N).fill(-1);
    const ranges = [];
    for (const fn of fns) for (const r of fn.ranges) ranges.push(r);
    const top = ranges.find(r => r.startOffset === 0);
    if (top && top.endOffset !== N) lenOk = false;
    ranges.sort((a, b) => a.startOffset - b.startOffset || b.endOffset - a.endOffset);
    // apply outer first; inner later overwrite (proper nesting)
    ranges.sort((a, b) => (b.endOffset - b.startOffset) - (a.endOffset - a.startOffset));
    for (const r of ranges) for (let i = r.startOffset; i < Math.min(r.endOffset, N); i++) cnt[i] = r.count;
    for (let i = 0; i < N; i++) if (cnt[i] > 0) exec[i] = 1;
  }
  // generated line starts
  const gl = [0];
  for (let i = 0; i < N; i++) if (code[i] === '\n') gl.push(i + 1);
  const tm = new TraceMap(c.map);
  // per original line: [executedSegs, unexecutedSegs, unexecuted cols]
  const perLine = new Map();
  const segs = [];
  eachMapping(tm, m => { if (m.originalLine != null) segs.push(m); });
  // sort by generated position
  segs.sort((a, b) => a.generatedLine - b.generatedLine || a.generatedColumn - b.generatedColumn);
  for (let k = 0; k < segs.length; k++) {
    const m = segs[k];
    const off = gl[m.generatedLine - 1] + m.generatedColumn;
    if (off >= N) continue;
    const L = m.originalLine;
    if (!perLine.has(L)) perLine.set(L, { e: 0, u: 0, ucols: new Set() });
    const pl = perLine.get(L);
    if (exec[off]) pl.e++; else { pl.u++; pl.ucols.add(m.originalColumn); }
  }
  let never = 0, part = 0, full = 0, nocode = 0;
  const rows = [];
  for (const L of [...lines].sort((a, b) => a - b)) {
    const pl = perLine.get(L);
    const text = (srcLines[L - 1] || '').slice(0, 150);
    if (!pl) { nocode++; continue; }
    if (pl.u === 0) { full++; continue; }
    const kind = pl.e === 0 ? 'NEVER' : 'PART ';
    if (pl.e === 0) never++; else part++;
    const cols = [...pl.ucols].sort((a, b) => a - b).join(',');
    rows.push(kind + ' ' + String(L).padStart(5) + ' [cols ' + cols + ']  ' + text);
  }
  summary.push(rel + ': changed ' + lines.size + ' (code ' + (lines.size - nocode) + ': full ' + full + ', part ' + part + ', never ' + never + ')' + (lenOk ? '' : ' LENGTH MISMATCH'));
  if (rows.length) out.push('\n=== ' + rel + (lenOk ? '' : '  (!! compiled length differs from coverage: offsets unreliable)') + '\n' + rows.join('\n'));
}
writeFileSync(OUT, summary.join('\n') + '\n\n' + out.join('\n') + '\n');
console.log(summary.join('\n'));
