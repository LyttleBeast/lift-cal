// Synthesis helper (read-only): small local probes the synthesis cites.
// Usage: node synth-probe.mjs <probe>
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';

const probe = process.argv[2];
const HOME = '/Users/micahflunker/dev';

function grep(file, re, ctx = 0) {
  const lines = readFileSync(file, 'utf8').split('\n');
  lines.forEach((l, i) => {
    if (re.test(l)) {
      for (let j = Math.max(0, i - ctx); j <= Math.min(lines.length - 1, i + ctx); j++) {
        console.log(`${file.split('/').slice(-2).join('/')}:${j + 1}: ${lines[j]}`);
      }
      if (ctx) console.log('--');
    }
  });
}

if (probe === 'exports') {
  grep(`${HOME}/vibes-night/tools/colour/colour-lib.mjs`, /^export/);
}

if (probe === 'rn') {
  const pkg = JSON.parse(readFileSync(`${HOME}/rack-mobile/node_modules/react-native/package.json`, 'utf8'));
  console.log('react-native version', pkg.version);
  const f = `${HOME}/rack-mobile/node_modules/react-native/Libraries/StyleSheet/StyleSheetTypes.d.ts`;
  const lines = readFileSync(f, 'utf8').split('\n');
  const start = lines.findIndex((l) => /FontVariant/.test(l));
  for (let j = start; j < Math.min(lines.length, start + 45); j++) console.log(`${j + 1}: ${lines[j]}`);
}

if (probe === 'besley') {
  const dirs = [`${HOME}/vibes-night/research/fonts/besley`, `${HOME}/vibes-night/research/fonts/besley/upstream`];
  for (const d of dirs) {
    if (!existsSync(d)) { console.log('missing', d); continue; }
    for (const n of readdirSync(d)) {
      const s = statSync(`${d}/${n}`);
      console.log(d.split('/').slice(-2).join('/'), n, s.isDirectory() ? 'DIR' : s.size);
    }
  }
}

if (probe === 'photos') {
  const j = JSON.parse(readFileSync(`${HOME}/vibes-night/research/iron-age/PROVENANCE.photos.draft.json`, 'utf8'));
  const arr = Array.isArray(j) ? j : (j.entries || j.items || Object.values(j));
  const rows = arr.map((e) => [e.file || e.slug || e.id, e.tier, e.confidence, e.medium || '', e.created, e.first_published, (e.micah_approved)]);
  for (const r of rows) console.log(r.map((x) => (typeof x === 'object' ? JSON.stringify(x) : x)).join(' | '));
  const tierA = rows.filter((r) => r[1] === 'A');
  console.log('entries', rows.length, 'tierA', tierA.length, 'tierA high', tierA.filter((r) => r[2] === 'high').length);
  const olympic = arr.filter((e) => JSON.stringify(e).toLowerCase().includes('olympic-ship'));
  console.log('olympic entries', olympic.length);
  const keys = new Set(); arr.forEach((e) => Object.keys(e).forEach((k) => keys.add(k)));
  console.log('keys', [...keys].join(', '));
}

if (probe === 'pdbasis') {
  for (const f of ['PROVENANCE.photos.draft.json', 'PROVENANCE.engravings.draft.json']) {
    const j = JSON.parse(readFileSync(`${HOME}/vibes-night/research/iron-age/${f}`, 'utf8'));
    const arr = Array.isArray(j) ? j : (j.entries || j.items || Object.values(j));
    const vals = new Map();
    for (const e of arr) {
      const v = JSON.stringify(e.pd_basis_worldwide ?? null);
      vals.set(v, (vals.get(v) || 0) + 1);
    }
    console.log(f, 'entries', arr.length);
    for (const [v, n] of vals) console.log('  ', n, '×', v.slice(0, 400));
  }
}
