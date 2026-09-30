// iainside.mjs — IA "search inside" for a scanned book, via fetch.mjs; prints leaf numbers + snippets.
// Usage: node iainside.mjs <server> <dir> <id> '<query>' <outfile.json>
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
const [server, dir, id, q, out] = process.argv.slice(2);
const u = `https://${server}/fulltext/inside.php?item_id=${id}&doc=${id}&path=${encodeURIComponent(dir)}&q=${encodeURIComponent(q)}`;
try { execFileSync('node', ['/Users/micahflunker/dev/vibes-night/tools/fetch.mjs', u, out], { stdio: 'ignore' }); } catch (e) { console.log('fetch failed'); process.exit(1); }
const j = JSON.parse(readFileSync(out, 'utf8'));
for (const m of (j.matches || []).slice(0, 40)) {
  const pages = (m.par || []).map(p => p.page).join(',');
  console.log(`page ${pages}: ${String(m.text).replace(/\s+/g, ' ').slice(0, 140)}`);
}
