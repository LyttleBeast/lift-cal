// Iron Age final (Phase D): a probe copy of the web-design worktree's vibes/
// with iron-age appended to index.js VIBES, so tools-check/vibes-contract.mjs
// can be run against a registry that holds it (VIBES_CONTRACT_DEFS points the
// verifier at the copy). Writes only under design/iron-age/final/probe/.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const SRC = '/Users/micahflunker/dev/vibes-night/wt/web-design/vibes/';
const OUT = '/Users/micahflunker/dev/vibes-night/design/iron-age/final/probe/vibes/';
for (const d of ['defs', 'icons']) mkdirSync(OUT + d, { recursive: true });
for (const f of ['defs/v1.js', 'defs/iron-age.js', 'defs/vocab.js', 'icons/v1.js', 'icons/iron-age.js']) writeFileSync(OUT + f, readFileSync(SRC + f));
const idx = readFileSync(SRC + 'defs/index.js', 'utf8');
const anchor = "{ id: 'v1', name: 'v1', feel: 'The original Rack look.', experimental: false, scheme: 'dark' }\n";
if (!idx.includes(anchor)) throw new Error('index.js VIBES anchor moved');
writeFileSync(OUT + 'defs/index.js', idx.replace(anchor,
  "{ id: 'v1', name: 'v1', feel: 'The original Rack look.', experimental: false, scheme: 'dark' },\n" +
  "  { id: 'iron-age', name: 'Iron Age', feel: 'Ink on cream, circa 1900.', experimental: false, scheme: 'light' }\n"));
console.log('probe written to', OUT);
