// fetch.mjs — the night's only downloader (V59 §0 "Network", §14 hosts).
// Refuses any host not on §14's list. Writes under ~/dev/vibes-night only.
// Usage: node fetch.mjs <url> <outfile> [--purpose asset|tool|ref]
//   Prints JSON: {url, finalUrl, out, bytes, sha256, status, contentType}
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { createHash } from 'node:crypto';

const ROOT = '/Users/micahflunker/dev/vibes-night';
const ASSET = ['loc.gov', 'wikimedia.org', 'archive.org', 'babel.hathitrust.org',
  'metmuseum.org', 'si.edu', 'rijksmuseum.nl', 'github.com', 'raw.githubusercontent.com',
  'githubusercontent.com', 'fonts.googleapis.com', 'fonts.gstatic.com'];
// wikimedia.org covers commons. and upload.; metmuseum.org covers images. and collectionapi.;
// si.edu covers api. and ids.; archive.org covers ia*.us.archive.org.
// githubusercontent.com is only here for GitHub's release/objects redirect of github.com downloads.
const TOOL = ['registry.npmjs.org', 'storage.googleapis.com'];
const REF = ['apps.apple.com', 'mzstatic.com', 'strong.app', 'hevyapp.com', 'macrofactorapp.com',
  'whoop.com', 'strava.com', 'apple.com', 'gentler.app', 'fitbod.me', 'alphaprogression.com',
  'boostcamp.app', 'liftosaur.com', 'flightyapp.com', 'culturedcode.com', 'teenage.engineering',
  'apolloapp.io', 'tapbots.com', 'overcast.fm'];
// Rijksmuseum's API returns images on lh3.googleusercontent.com.
const RIJKS_IMG = ['googleusercontent.com'];

function hostOk(h, list) { return list.some(d => h === d || h.endsWith('.' + d)); }
function allowed(u) {
  const h = new URL(u).hostname.toLowerCase();
  if (h === 'fonts.googleapis.com' && !new URL(u).pathname.startsWith('/css2')) return false;
  return hostOk(h, ASSET) || hostOk(h, TOOL) || hostOk(h, REF) || hostOk(h, RIJKS_IMG);
}

const [url, outArg] = process.argv.slice(2);
if (!url || !outArg) { console.error('usage: node fetch.mjs <url> <outfile>'); process.exit(2); }
if (!allowed(url)) { console.error(`REFUSED host not on V59 §14 list: ${new URL(url).hostname}`); process.exit(3); }
const out = resolve(outArg);
if (!out.startsWith(ROOT + '/')) { console.error(`REFUSED: output must be under ${ROOT}`); process.exit(4); }

const ua = process.env.UA || 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36';
let res = await fetch(url, { redirect: 'manual', headers: { 'user-agent': ua } });
let hops = 0, cur = url;
while (res.status >= 300 && res.status < 400 && res.headers.get('location') && hops < 8) {
  const next = new URL(res.headers.get('location'), cur).href;
  if (!allowed(next)) { console.error(`REFUSED redirect to host not on V59 §14 list: ${new URL(next).hostname}`); process.exit(3); }
  cur = next; hops++;
  res = await fetch(cur, { redirect: 'manual', headers: { 'user-agent': ua } });
}
const buf = Buffer.from(await res.arrayBuffer());
if (!res.ok) { console.log(JSON.stringify({ url, finalUrl: cur, status: res.status, bytes: buf.length })); process.exit(5); }
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, buf);
console.log(JSON.stringify({ url, finalUrl: cur, out, status: res.status, bytes: buf.length,
  sha256: createHash('sha256').update(buf).digest('hex'), contentType: res.headers.get('content-type') }));
