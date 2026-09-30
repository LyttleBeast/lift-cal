// 08a-locjsontext.mjs — fetch a loc.gov page as ?fo=json and print its text around keywords (loc.gov only).
// Usage: node 08a-locjsontext.mjs <loc.gov url> <keyword> [...]
const [url, ...kws] = process.argv.slice(2);
if (!new URL(url).hostname.endsWith('loc.gov')) throw new Error('host');
const u = url + (url.includes('?') ? '&' : '?') + 'fo=json';
const r = await fetch(u, { headers: { 'user-agent': 'Mozilla/5.0 RackVibesResearch' } });
const raw = await r.text();
const text = raw.replace(/\\u003c/g, '<').replace(/\\u003e/g, '>').replace(/\\n/g, ' ').replace(/<[^>]+>/g, ' ').replace(/\\"/g, '"').replace(/\s+/g, ' ');
console.log('status', r.status, 'chars', text.length);
for (const k of kws) {
  let i = -1, n = 0;
  while ((i = text.indexOf(k, i + 1)) !== -1 && n < 3) { console.log(`[${k}] …${text.slice(Math.max(0, i - 400), i + 800)}…\n`); n++; }
}
