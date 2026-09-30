// gf08-ht.mjs — probe babel.hathitrust.org (a §14 host): full-text search or any babel URL.
// Usage: node gf08-ht.mjs <babel url> [regex-to-print] [ctx]
const [u, pat = '', ctxArg = '200'] = process.argv.slice(2);
if (new URL(u).hostname !== 'babel.hathitrust.org') throw new Error('host');
const r = await fetch(u, { headers: { 'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36', 'accept': 'text/html,application/json' } });
const t = await r.text();
console.log('HTTP', r.status, r.headers.get('content-type'), t.length, 'chars');
if (!pat) { console.log(t.replace(/\s+/g, ' ').slice(0, 3000)); process.exit(0); }
const s = t.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
const re = new RegExp(pat, 'gi'); let m, n = 0; const ctx = Number(ctxArg);
while ((m = re.exec(s)) && n < 40) { n++; console.log('~ ' + s.slice(Math.max(0, m.index - ctx), m.index + ctx)); }
