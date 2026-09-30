#!/usr/bin/env node
/* r2cov-map — Pnat round-2 coverage reviewer's scratch tool.
 * Maps V8 block coverage (NODE_V8_COVERAGE from a verify-vibe-v1 run) of the
 * babel-compiled app/src files back to source lines, and lists every line the
 * engine ADDED since 1cb6498 (git diff -U0) that no scene executed.
 * usage: node r2cov-map.mjs <tree> <rawCoverageDir> <outJson> [base=1cb6498]
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const [tree, rawDir, outJson, base = '1cb6498'] = process.argv.slice(2);
const req = createRequire(join(tree, 'package.json'));
const babel = req('@babel/core');
const { TraceMap, eachMapping } = req('@jridgewell/trace-mapping');
const JSX_PLUGIN = req.resolve('@babel/plugin-transform-react-jsx');
const CJS_PLUGIN = req.resolve('@babel/plugin-transform-modules-commonjs');
const opts = f => ({ filename: f, babelrc: false, configFile: false, sourceType: 'module',
  plugins: [[JSX_PLUGIN, { runtime: 'automatic' }], CJS_PLUGIN] });

// Added lines per file (new-side line numbers), from -U0
const diff = execFileSync('git', (base === 'WORKTREE' ? ['-C', tree, 'diff', '-U0', 'HEAD', '--', 'app', 'src'] : ['-C', tree, 'diff', '-U0', base + '..HEAD', '--', 'app', 'src']), { encoding: 'utf8', maxBuffer: 64e6 });
const added = new Map(); let cur = null, nl = 0;
for (const l of diff.split('\n')) {
  if (l.startsWith('+++ ')) { cur = l.slice(4) === '/dev/null' ? null : l.slice(6); if (cur) added.set(cur, []); continue; }
  const m = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/.exec(l);
  if (m) { nl = +m[1]; continue; }
  if (cur && l.startsWith('+')) { added.get(cur).push(nl); nl++; }
  else if (cur && l.startsWith(' ')) nl++;
}

// Merge coverage by file
const cov = new Map(); // abs path -> list of [functions]
for (const f of readdirSync(rawDir)) {
  const j = JSON.parse(readFileSync(join(rawDir, f), 'utf8'));
  for (const s of j.result) {
    if (!s.url.startsWith('file://')) continue;
    const p = fileURLToPath(s.url);
    if (!p.startsWith(tree + '/app/') && !p.startsWith(tree + '/src/')) continue;
    if (!cov.has(p)) cov.set(p, []);
    cov.get(p).push(s.functions);
  }
}

const out = { files: {}, notLoaded: [], summary: [] };
for (const [rel, lines] of added) {
  const abs = join(tree, rel);
  if (!lines.length) continue;
  if (!cov.has(abs)) { out.notLoaded.push(rel + ' (' + lines.length + ' added lines)'); continue; }
  const src = readFileSync(abs, 'utf8');
  const r = babel.transformSync(src, { ...opts(abs), sourceMaps: true });
  const r0 = babel.transformSync(src, opts(abs));
  if (r.code !== r0.code) throw new Error('sourcemap changed code for ' + rel);
  const code = r.code;
  // per run: count at each offset = innermost range's count
  const runs = cov.get(abs);
  const genCount = runs.map(fns => {
    const top = fns[0].ranges[0];
    if (top.endOffset !== code.length) throw new Error(rel + ': coverage length ' + top.endOffset + ' != compiled ' + code.length);
    const ranges = [];
    for (const fn of fns) for (const rg of fn.ranges) ranges.push(rg);
    // sort by size desc so smaller (inner) override
    ranges.sort((a, b) => (b.endOffset - b.startOffset) - (a.endOffset - a.startOffset));
    const c = new Int32Array(code.length);
    for (const rg of ranges) c.fill(rg.count, rg.startOffset, rg.endOffset);
    return c;
  });
  const lineStart = [0];
  for (let i = 0; i < code.length; i++) if (code[i] === '\n') lineStart.push(i + 1);
  const srcLines = src.split('\n');
  const hit = new Map(); // orig line -> {any:bool, segs:n}
  const tm = new TraceMap(r.map);
  eachMapping(tm, m => {
    if (m.originalLine == null) return;
    const off = lineStart[m.generatedLine - 1] + m.generatedColumn;
    if (off >= code.length) return;
    const e = hit.get(m.originalLine) || { any: false, segs: 0, zero: [] };
    e.segs++;
    if (genCount.some(c => c[off] > 0)) e.any = true; else e.zero.push(m.originalColumn);
    hit.set(m.originalLine, e);
  });
  const unexec = [], nocode = [], partial = [];
  for (const ln of lines) {
    const e = hit.get(ln);
    if (!e) nocode.push(ln);
    else if (!e.any) unexec.push(ln); else if (e.zero.length) partial.push(ln + ': ' + [...new Set(e.zero)].sort((a,b)=>a-b).map(c => '@' + c + ' ' + JSON.stringify(srcLines[ln-1].slice(c, c + 50))).join(' | '));
  }
  out.files[rel] = { added: lines.length, unexecuted: unexec.map(n => n + ': ' + srcLines[n - 1]), partial, noCode: nocode.length };
  out.summary.push(rel + ': +' + lines.length + ', unexecuted ' + unexec.length + ', partial ' + partial.length + ', no code ' + nocode.length);
}
writeFileSync(outJson, JSON.stringify(out, null, 1));
console.log(out.summary.join('\n'));
console.log('not loaded:', out.notLoaded.join('; '));
