// r02-shots.mjs — research track 2 (V59 §4): pull an app's iPhone App Store screenshots
// for study only. Parses a page already saved by fetch.mjs, then downloads each image
// THROUGH fetch.mjs (the night's only downloader), and writes sources.txt beside them.
// Usage: node r02-shots.mjs <refs/app dir> <app store page url> [max]
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

const [dir, pageUrl, maxArg] = process.argv.slice(2);
const max = Number(maxArg || 8);
const html = readFileSync(join(dir, 'appstore.html'), 'utf8');
const re = /https:\/\/is\d-ssl\.mzstatic\.com\/image\/thumb\/[^"'\s)\\,]+/g;
const order = [];
const sizes = new Map();
for (const u of html.match(re) || []) {
  const i = u.lastIndexOf('/');
  const base = u.slice(0, i), leaf = u.slice(i + 1);
  if (/Placeholder\.mill|AppIcon|Features\d|PreviewImage|Simulator_Screenshot.*Watch/i.test(base)) continue;
  const m = leaf.match(/^(\d+)x(\d+)/);
  if (!m) continue;
  const w = +m[1], h = +m[2];
  if (!(h / w > 1.7 && w >= 150)) continue; // portrait phone shots only
  if (!sizes.has(base)) { sizes.set(base, []); order.push(base); }
  sizes.get(base).push([w, h]);
}
const picks = order.slice(0, max);
const lines = [`# Study-only App Store screenshots (V59 §4). Never copied into either tree, the gallery or any vibe asset.`,
  `# App Store page: ${pageUrl}`, `# Retrieved: ${new Date().toISOString()}`];
picks.forEach((base, k) => {
  const [w, h] = sizes.get(base).sort((a, b) => b[0] - a[0])[0];
  const url = `${base}/${w}x${h}bb.jpg`;
  const out = join(dir, `shot-${String(k + 1).padStart(2, '0')}.jpg`);
  if (existsSync(out)) { lines.push(`${out.split('/').pop()}\t${url}\t(already present)`); return; }
  try {
    const r = execFileSync('node', ['/Users/micahflunker/dev/vibes-night/tools/fetch.mjs', url, out], { encoding: 'utf8' });
    const j = JSON.parse(r.trim().split('\n').pop());
    lines.push(`${out.split('/').pop()}\t${url}\tbytes=${j.bytes}\tsha256=${j.sha256}`);
  } catch (e) {
    lines.push(`FAILED\t${url}\t${String(e.message).slice(0, 120)}`);
  }
});
writeFileSync(join(dir, 'sources.txt'), lines.join('\n') + '\n');
console.log(dir.split('/').pop(), 'candidates', order.length, 'saved', picks.length);
