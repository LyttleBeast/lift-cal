#!/usr/bin/env node
/* r2-strict-diff — compare the stricter dumps of r2-strict-setup's copy, base
 * vs engine, host by host (the two must have the same scenes and host counts,
 * which the real proof already established). Reports each class of difference
 * the real proof's representation cannot see: sn (a nullish style prop present
 * or not), ko (style key order), ck (children shape), and anything else.
 * usage: node r2-strict-diff.mjs <base.txt> <engine.txt> */
import { readFileSync } from 'node:fs';
const [A, B] = process.argv.slice(2);
const parse = f => {
  const out = []; let cur = null;
  for (const l of readFileSync(f, 'utf8').split('\n')) {
    if (!l) continue;
    if (l.startsWith('{"calls"')) { cur = { name: JSON.parse(l).name, h: l, hosts: [] }; out.push(cur); }
    else cur.hosts.push(JSON.parse(l));
  }
  return out;
};
const a = parse(A), b = parse(B);
if (a.length !== b.length) throw new Error('scene count differs: ' + a.length + ' vs ' + b.length);
const strip = (e, keys) => { const o = { ...e }; keys.forEach(k => delete o[k]); return JSON.stringify(o, Object.keys(o).sort()); };
const cls = { sn: new Map(), ko: new Map(), ck: new Map(), fn: new Map(), other: [] };
const add = (m, k, v) => { if (!m.has(k)) m.set(k, []); m.get(k).push(v); };
const label = (hs, i) => { for (let j = i; j < hs.length && j < i + 6; j++) if (hs[j].x) return String(hs[j].x).slice(0, 40); return ''; };
let hosts = 0;
for (let s = 0; s < a.length; s++) {
  const A1 = a[s], B1 = b[s];
  if (A1.name !== B1.name) throw new Error('scene order differs at ' + s);
  if (A1.h !== B1.h) cls.other.push(A1.name + ': scene header differs');
  if (A1.hosts.length !== B1.hosts.length) { cls.other.push(A1.name + ': host count ' + A1.hosts.length + ' vs ' + B1.hosts.length); continue; }
  for (let i = 0; i < A1.hosts.length; i++) {
    hosts++;
    const x = A1.hosts[i], y = B1.hosts[i];
    const core = strip(x, ['sn', 'ko', 'ck', 'fn', 'cp']) !== strip(y, ['sn', 'ko', 'ck', 'fn', 'cp']);
    if (core) { cls.other.push(A1.name + ' #' + i + ' ' + x.t + ' core props differ'); continue; }
    const where = x.t + ' "' + label(A1.hosts, i) + '"';
    if (x.sn !== y.sn) add(cls.sn, where + ': ' + (x.sn || '(no style prop)') + ' -> ' + (y.sn || '(no style prop)'), A1.name);
    if (x.ko !== y.ko) add(cls.ko, where + ': [' + x.ko + '] -> [' + y.ko + ']', A1.name);
    if (x.fn !== y.fn) add(cls.fn, where + ': [' + (x.fn || '') + '] -> [' + (y.fn || '') + ']', A1.name);
    if (x.ck !== y.ck) add(cls.ck, x.t + ': ' + (x.ck || '(none)') + ' -> ' + (y.ck || '(none)'), A1.name);
    if (JSON.stringify(x.cp || null) !== JSON.stringify(y.cp || null)) {
      // pressed children: compare with the same stripping
      const px = (x.cp || []).map(e => strip(e, ['sn', 'ko', 'ck', 'fn'])).join('|'), py = (y.cp || []).map(e => strip(e, ['sn', 'ko', 'ck', 'fn'])).join('|');
      if (px !== py) cls.other.push(A1.name + ' #' + i + ' pressed children differ');
    }
  }
}
console.log('hosts compared:', hosts);
for (const k of ['sn', 'ko', 'ck', 'fn']) {
  console.log('\n== ' + k + ': ' + cls[k].size + ' distinct, ' + [...cls[k].values()].reduce((n, v) => n + v.length, 0) + ' hosts');
  for (const [w, scenes] of [...cls[k]].sort((p, q) => q[1].length - p[1].length)) console.log('  ' + scenes.length + '× ' + w.slice(0, 300) + '   e.g. ' + scenes[0]);
}
console.log('\n== other: ' + cls.other.length); cls.other.slice(0, 30).forEach(o => console.log('  ' + o));
