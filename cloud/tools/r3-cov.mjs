#!/usr/bin/env node
/* r3-cov — Pnat round-3 coverage reviewer's scratch tool.
 * For each hunk of `git diff -U0 1cb6498..HEAD -- app src` in the engine, says
 * which of its + lines (engine) and - lines (build 58) any verify-vibe-v1
 * scene executed, from NODE_V8_COVERAGE runs of both trees. Each app file is
 * recompiled exactly as tools/lib/rn-render.mjs compiles it (babel JSX
 * automatic + CJS) with a source map, and V8 block counts are mapped back.
 *   node r3-cov.mjs <engineTree> <engineCovDir> <baseTree> <baseCovDir> <outFile>
 * Per line: FULL (every mapped segment ran), PART (some did), NEVER (none),
 * - (no code), UNLOADED (the file never loaded).
 */
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';

const [ENG, ENGCOV, BASE, BASECOV, OUT] = process.argv.slice(2);
const req = createRequire(join(ENG, 'package.json'));
const babel = req('@babel/core');
const { TraceMap, eachMapping } = req('@jridgewell/trace-mapping');
const JSX_PLUGIN = req.resolve('@babel/plugin-transform-react-jsx');
const CJS_PLUGIN = req.resolve('@babel/plugin-transform-modules-commonjs');
const opts = f => ({ filename: f, babelrc: false, configFile: false, sourceType: 'module', plugins: [[JSX_PLUGIN, { runtime: 'automatic' }], CJS_PLUGIN] });

function loadCov(tree, dir) {
  const per = new Map();
  for (const f of readdirSync(dir)) {
    if (!f.endsWith('.json')) continue;
    const j = JSON.parse(readFileSync(join(dir, f), 'utf8'));
    for (const r of j.result) {
      const pre = 'file://' + tree + '/';
      if (!r.url.startsWith(pre)) continue;
      const rel = decodeURIComponent(r.url.slice(pre.length));
      if (!/^(src|app)\//.test(rel)) continue;
      if (!per.has(rel)) per.set(rel, []);
      per.get(rel).push(r.functions);
    }
  }
  return per;
}
const covE = loadCov(ENG, ENGCOV), covB = loadCov(BASE, BASECOV);
const cache = new Map();
/** line -> {e, u, ucols} for a tree's file, or null if never loaded. */
function lineCov(tree, per, rel) {
  const key = tree + '|' + rel;
  if (cache.has(key)) return cache.get(key);
  const covs = per.get(rel);
  if (!covs) { cache.set(key, null); return null; }
  const abs = join(tree, rel);
  const src = readFileSync(abs, 'utf8');
  const r = babel.transformSync(src, { ...opts(abs), sourceMaps: true });
  const r0 = babel.transformSync(src, opts(abs));
  if (r.code !== r0.code) throw new Error('source map changed the code: ' + rel);
  const code = r.code, N = code.length;
  const exec = new Uint8Array(N);
  let lenOk = true;
  for (const fns of covs) {
    const cnt = new Int32Array(N).fill(-1);
    const ranges = [];
    for (const fn of fns) for (const x of fn.ranges) ranges.push(x);
    const top = ranges.find(x => x.startOffset === 0);
    if (top && top.endOffset !== N) lenOk = false;
    ranges.sort((a, b) => (b.endOffset - b.startOffset) - (a.endOffset - a.startOffset));
    for (const x of ranges) cnt.fill(x.count, x.startOffset, Math.min(x.endOffset, N));
    for (let i = 0; i < N; i++) if (cnt[i] > 0) exec[i] = 1;
  }
  const gl = [0];
  for (let i = 0; i < N; i++) if (code[i] === '\n') gl.push(i + 1);
  const per1 = new Map();
  eachMapping(new TraceMap(r.map), m => {
    if (m.originalLine == null) return;
    const off = gl[m.generatedLine - 1] + m.generatedColumn;
    if (off >= N) return;
    if (!per1.has(m.originalLine)) per1.set(m.originalLine, { e: 0, u: 0, ucols: new Set() });
    const pl = per1.get(m.originalLine);
    if (exec[off]) pl.e++; else { pl.u++; pl.ucols.add(m.originalColumn); }
  });
  const res = { lines: per1, lenOk, src: src.split('\n') };
  cache.set(key, res);
  return res;
}
const kind = (lc, L) => {
  if (!lc) return 'UNLOADED';
  const pl = lc.lines.get(L);
  if (!pl) return '-';
  if (pl.u === 0) return 'FULL';
  return pl.e === 0 ? 'NEVER' : 'PART[' + [...pl.ucols].sort((a, b) => a - b).join(',') + ']';
};

const diffText = execFileSync('git', ['-C', ENG, 'diff', '-U0', '1cb6498..HEAD', '--', 'app', 'src'], { encoding: 'utf8', maxBuffer: 1 << 29 });
const hunks = [];
let oldF = null, newF = null, h = null, ol = 0, nl = 0;
for (const line of diffText.split('\n')) {
  let m;
  if (line.startsWith('--- ')) { oldF = line === '--- /dev/null' ? null : line.slice(6); continue; }
  if (line.startsWith('+++ ')) { newF = line === '+++ /dev/null' ? null : line.slice(6); continue; }
  if ((m = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/.exec(line))) {
    h = { oldF, newF, head: line, minus: [], plus: [] }; hunks.push(h);
    ol = +m[1]; nl = +m[3]; continue;
  }
  if (!h) continue;
  if (line.startsWith('-')) { h.minus.push([ol, line.slice(1)]); ol++; }
  else if (line.startsWith('+')) { h.plus.push([nl, line.slice(1)]); nl++; }
}

const out = [], summary = new Map();
let nH = 0, nHunc = 0;
for (const hk of hunks) {
  nH++;
  const lcE = hk.newF ? lineCov(ENG, covE, hk.newF) : null;
  const lcB = hk.oldF ? lineCov(BASE, covB, hk.oldF) : null;
  const pk = hk.plus.map(([L, t]) => [L, kind(lcE, L), t]);
  const mk = hk.minus.map(([L, t]) => [L, kind(lcB, L), t]);
  const bad = x => x[1] === 'NEVER' || x[1].startsWith('PART') || x[1] === 'UNLOADED';
  const f = hk.newF || hk.oldF;
  const s = summary.get(f) || { hunks: 0, uncovered: 0, plus: 0, never: 0, part: 0, unloaded: 0 };
  s.hunks++; s.plus += pk.length;
  pk.forEach(x => { if (x[1] === 'NEVER') s.never++; else if (x[1].startsWith('PART')) s.part++; else if (x[1] === 'UNLOADED') s.unloaded++; });
  if (pk.some(bad) || mk.some(bad)) {
    s.uncovered++; nHunc++;
    out.push('\n### ' + f + '  ' + hk.head + (lcE && !lcE.lenOk ? '  (!! engine length mismatch)' : '') + (lcB && !lcB.lenOk ? '  (!! base length mismatch)' : ''));
    const long = mk.length + pk.length > 12;
    const show = (arr, sign) => arr.forEach((x, i) => {
      if (long && !(bad(x) || (arr[i - 1] && bad(arr[i - 1])) || (arr[i + 1] && bad(arr[i + 1])))) return;
      out.push('  ' + sign + ' ' + String(x[0]).padStart(5) + ' ' + x[1].padEnd(14) + ' ' + x[2].slice(0, 170));
      const m = /^PART\[([\d,]+)\]/.exec(x[1]);
      if (m && process.env.FRAG) {
        const cols = m[1].split(',').map(Number);
        const runs = [];
        for (const c of cols) { const r = runs[runs.length - 1]; if (r && c - r[1] <= 3) r[1] = c; else runs.push([c, c]); }
        out.push('          unexecuted: ' + runs.map(([a, b]) => JSON.stringify(x[2].slice(a, Math.max(b + 12, a + 18)))).join(' | '));
      }
    });
    show(mk, '-'); show(pk, '+');
  }
  summary.set(f, s);
}
const sumLines = [...summary].map(([f, s]) => f + ': hunks ' + s.hunks + ', with an unexecuted line ' + s.uncovered + '; + lines ' + s.plus + ' (never ' + s.never + ', part ' + s.part + ', unloaded ' + s.unloaded + ')');
writeFileSync(OUT, 'hunks ' + nH + ', with an unexecuted line on either side ' + nHunc + '\n' + sumLines.join('\n') + '\n' + out.join('\n') + '\n');
console.log('hunks ' + nH + ', with an unexecuted line on either side ' + nHunc);
console.log(sumLines.join('\n'));
