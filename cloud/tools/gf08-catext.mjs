// gf08-catext.mjs — fetch the OCR text of one Chronicling America page (loc.gov) and print lines around a pattern.
// Usage: node gf08-catext.mjs <loc.gov resource url ?sp=N> <regex> [context-chars]
const [page, pat, ctxArg = '300'] = process.argv.slice(2);
const ctx = Number(ctxArg);
const ua = { headers: { 'user-agent': 'Mozilla/5.0 RackVibesResearch' } };
async function get(u, asText) {
  if (!new URL(u).hostname.endsWith('loc.gov')) throw new Error('host ' + u);
  for (let i = 0; i < 4; i++) {
    try { const r = await fetch(u, ua); if (!r.ok) return null; return asText ? await r.text() : await r.json(); }
    catch (e) { await new Promise(s => setTimeout(s, 1500)); }
  }
  return null;
}
const ju = page.replace('http://', 'https://') + (page.includes('?') ? '&' : '?') + 'fo=json&at=resource,page';
const j = await get(ju);
if (!j) { console.log('no json', ju); process.exit(1); }
const res = j.resource || {};
let txtUrl = res.fulltext_file || '';
if (!txtUrl && Array.isArray(j.page)) {
  for (const p of j.page) if (p.mimetype === 'text/plain' || /\.txt$/.test(p.url || '')) { txtUrl = p.url; break; }
}
if (!txtUrl) { console.log('no text url; resource keys:', Object.keys(res).join(','), JSON.stringify(j.page || '').slice(0, 800)); process.exit(1); }
let t = await get(txtUrl, true);
if (!t) { console.log('no text at', txtUrl); process.exit(1); }
if (process.env.RAW) console.log('RAW', t.slice(0, 600));
if (t.trim().startsWith('{')) {
  try { const o = JSON.parse(t); t = Object.values(o).map(v => (v && v.full_text) || (typeof v === 'string' ? v : '')).join(' '); } catch {}
} else if (t.startsWith('<')) {
  // ALTO: pull CONTENT attributes
  t = [...t.matchAll(/CONTENT="([^"]*)"/g)].map(m => m[1]).join(' ');
}
t = t.replace(/\s+/g, ' ');
console.log('TEXT', txtUrl, t.length, 'chars');
const re = new RegExp(pat, 'gi');
let m, n = 0;
while ((m = re.exec(t)) && n < 12) {
  n++;
  console.log('...' + t.slice(Math.max(0, m.index - ctx), m.index + ctx) + '...\n');
}
if (!n) console.log('no match');
