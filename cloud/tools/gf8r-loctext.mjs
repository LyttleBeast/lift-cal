// gf8r-loctext.mjs — critic-round gap fill (08a/09). Fetch any loc.gov page with ?fo=json (a §14 host) and print
// text snippets matching a regex (HTML stripped). Usage: node gf8r-loctext.mjs <loc.gov url> <regex> [ctx]
const [u0, pat = '.', ctxA = '300'] = process.argv.slice(2);
const url = new URL(u0);
if (!url.hostname.endsWith('loc.gov')) throw new Error('host');
if (!url.searchParams.has('fo')) url.searchParams.set('fo', 'json');
const r = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 RackVibesResearch' } });
let t = await r.text();
console.log('HTTP', r.status, url.href, t.length);
t = t.replace(/\\u003c/g, '<').replace(/\\u003e/g, '>').replace(/\\n/g, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
const re = new RegExp(pat, 'gi'); let m, n = 0; const ctx = Number(ctxA);
while ((m = re.exec(t)) && n < 30) { n++; console.log('~ ' + t.slice(Math.max(0, m.index - ctx), m.index + ctx)); }
