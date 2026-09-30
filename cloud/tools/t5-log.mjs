// Track 5: print fetch-log rows whose out path matches a regex: out, finalUrl, bytes, sha256.
import { readFileSync } from 'node:fs';
const re = new RegExp(process.argv[2] || '.');
for (const l of readFileSync('/Users/micahflunker/dev/vibes-night/research/fonts/_fetchlog.jsonl', 'utf8').split('\n')) {
  if (!l.trim()) continue;
  const r = JSON.parse(l);
  if (!re.test(r.out || r.url)) continue;
  console.log(`${(r.out || '').replace('/Users/micahflunker/dev/vibes-night/research/fonts/', '')} | ${r.finalUrl || r.url} | ${r.bytes} | ${r.sha256 ? r.sha256.slice(0, 16) : r.status}`);
}
