#!/usr/bin/env node
/* r2-strict-setup — Pnat round-2 coverage reviewer's scratch tool.
 * Copies the proof's verify-vibe-v1 (vibes/proof 7180d40) to
 * ~/dev/vibes-night/tmp/r2strict/tools and patches ONLY its dump so it also
 * records what the proof's representation drops:
 *   sn — a host whose `style` prop is PRESENT but null/undefined (entry() skips it)
 *   ko — the flattened style's own key order (canon() sorts keys)
 *   ck — the host's children as React holds them: 'arr:<len>:<null count>' or 'one'
 *   fn — the NAMES of its function-valued props (handlers), which val() drops
 * Nothing in any worktree is touched. Run the copy with --root <tree> --dump <file>.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
const SRC = '/Users/micahflunker/dev/vibes-night/wt/nat-proof/tools';
const DST = '/Users/micahflunker/dev/vibes-night/tmp/r2strict/tools';
mkdirSync(join(DST, 'lib'), { recursive: true });
for (const f of ['verify-vibe-v1.mjs', 'lib/vibe-seed.mjs']) writeFileSync(join(DST, f), readFileSync(join(SRC, f)));
let snap = readFileSync(join(SRC, 'lib/vibe-snap.mjs'), 'utf8');
const from = "  const e = { d, t };\n";
if (snap.split(from).length !== 2) throw new Error('entry() anchor not found exactly once');
snap = snap.replace(from, () => from +
  "  if ('style' in p && p.style == null) e.sn = p.style === null ? '$null' : '$undefined';\n" +
  "  if (p.style != null && typeof p.style !== 'string') { try { const k = Object.keys(flat(p.style, false)); if (k.length) e.ko = k.join(','); } catch {} }\n" +
  "  if (Array.isArray(p.children)) e.ck = 'arr:' + p.children.length + ':' + p.children.filter(c => c == null || c === false).length; else if (p.children != null && typeof p.children !== 'function') e.ck = 'one';\n" +
  "  { const fns = Object.keys(p).filter(k => typeof p[k] === 'function' && k !== 'children' && !/style$/i.test(k)).sort(); if (fns.length) e.fn = fns.join(','); }\n");
writeFileSync(join(DST, 'lib/vibe-snap.mjs'), snap);
console.log('patched copy written to', DST);
