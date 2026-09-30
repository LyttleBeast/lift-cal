// iapages.mjs — download several Internet Archive BookReader page images through fetch.mjs,
// then make ~1100px viewing copies with sips (research track 7).
// Usage: node iapages.mjs <identifier> <prefix> n0 n4 n20 ...
import { execFileSync } from 'node:child_process';
const [id, prefix, ...pages] = process.argv.slice(2);
const dir = '/Users/micahflunker/dev/vibes-night/research/iron-age-period';
for (const p of pages) {
  const out = `${dir}/scans/${prefix}-${p}.jpg`;
  try {
    const r = execFileSync('node', ['/Users/micahflunker/dev/vibes-night/tools/fetch.mjs', `https://archive.org/download/${id}/page/${p}.jpg`, out]).toString();
    const j = JSON.parse(r); console.log(p, j.status, j.bytes, j.sha256);
    execFileSync('sips', ['-Z', '1100', out, '--out', `${dir}/view/${prefix}-${p}.jpg`], { stdio: 'ignore' });
  } catch (e) { console.log(p, 'FAILED', String(e.stdout || e.message).slice(0, 200)); }
}
