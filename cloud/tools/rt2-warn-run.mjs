#!/usr/bin/env node
/* rt2-warn-run — Pnat runtime review, round 2. Runs the proof branch's
 * verify-vibe-v1 child render (every scene of one pass) against a tree, with
 * rt2-capture.mjs preloaded, and saves what the app printed to the console
 * (React's dev warnings land on console.error). Then, given two saved runs,
 * diffs them as multisets after normalising volatile parts.
 *
 *   node rt2-warn-run.mjs run  <tree> <pass> <out.json>
 *   node rt2-warn-run.mjs diff <a.json> <b.json>
 */
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
const PROOF = '/Users/micahflunker/dev/vibes-night/wt/nat-proof/tools/verify-vibe-v1.mjs';
const CAP = '/Users/micahflunker/dev/vibes-night/tools/rt2-capture.mjs';
const [mode, a, b, c] = process.argv.slice(2);

if (mode === 'run') {
  const tree = a, pass = b, out = c;
  const p = spawn(process.execPath, ['--import', CAP, PROOF, '--render', '--pass', pass, '--root', tree],
                  { env: { ...process.env, TZ: 'America/New_York', RT2_OUT: out }, stdio: ['ignore', 'inherit', 'inherit', 'ipc'] });
  let got = null;
  p.on('message', m => { got = m; });
  p.on('exit', code => {
    const msgs = JSON.parse(readFileSync(out, 'utf8'));
    console.log('pass ' + pass + ' on ' + tree + ': exit ' + code + ', scenes ' + (got ? got.scenes.length : 'none') +
                ', scene errors ' + (got ? got.scenes.reduce((n, s) => n + s.errors.length, 0) : '?') + ', console messages ' + msgs.length);
    const by = {};
    msgs.forEach(x => { by[x.k] = (by[x.k] || 0) + 1; });
    console.log('  by kind ' + JSON.stringify(by));
  });
} else if (mode === 'diff') {
  const norm = m => m.replace(/\/Users\/[^\s'")]+/g, '<path>').replace(/data-hid="?\d+"?/g, 'hid').replace(/\b\d{10,}\b/g, '<n>');
  const load = f => JSON.parse(readFileSync(f, 'utf8')).map(x => x.k + ': ' + norm(x.m));
  const A = load(a), B = load(b);
  const count = l => l.reduce((m, x) => m.set(x, (m.get(x) || 0) + 1), new Map());
  const ca = count(A), cb = count(B);
  const keys = new Set([...ca.keys(), ...cb.keys()]);
  let diffs = 0;
  for (const k of keys) {
    const x = ca.get(k) || 0, y = cb.get(k) || 0;
    if (x !== y) { diffs++; console.log('[' + x + ' -> ' + y + '] ' + k.slice(0, 700)); }
  }
  console.log('messages ' + A.length + ' vs ' + B.length + '; distinct ' + ca.size + ' vs ' + cb.size + '; differing lines ' + diffs);
}
