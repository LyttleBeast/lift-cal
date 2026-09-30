// Re-download every icon original named in Iron Age's icons/PROVENANCE.json
// through fetch.mjs and compare to the recorded original_sha256.
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const ic = JSON.parse(readFileSync('/Users/micahflunker/dev/vibes-night/wt/web-v-iron-age/vibes/iron-age/icons/PROVENANCE.json'));
const seen = new Map();
for (const e of ic.entries) if (!seen.has(e.download_url)) seen.set(e.download_url, e);
let i = 0;
for (const [url, e] of seen) {
  const out = `/Users/micahflunker/dev/vibes-night/proof/prov-rs9/re-icon-${i++}.jp2`;
  try {
    const r = JSON.parse(execFileSync('node', ['/Users/micahflunker/dev/vibes-night/tools/fetch.mjs', url, out], { encoding: 'utf8' }).trim().split('\n').pop());
    console.log(r.sha256 === e.original_sha256 ? 'MATCH' : 'MISMATCH', e.drawings.join('+'), r.status, r.bytes, r.sha256);
  } catch (err) { console.log('ERR', e.drawings.join('+'), err.message.slice(0, 200)); }
}
