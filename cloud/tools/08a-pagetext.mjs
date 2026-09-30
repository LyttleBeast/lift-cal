// 08a-pagetext.mjs — fetch a loc.gov / archive.org / commons page (§14 hosts only), strip tags, print text around keywords.
// Usage: node 08a-pagetext.mjs <url> <keyword> [keyword...]
const [url, ...kws] = process.argv.slice(2);
const h = new URL(url).hostname;
if (!['loc.gov', 'archive.org', 'wikimedia.org'].some(d => h === d || h.endsWith('.' + d))) throw new Error('host not allowed');
const r = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36' } });
const html = await r.text();
const text = html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#39;|&rsquo;/g, "'").replace(/&quot;|&ldquo;|&rdquo;/g, '"').replace(/\s+/g, ' ');
console.log('status', r.status, 'chars', text.length);
for (const k of kws) {
  let i = -1, n = 0;
  while ((i = text.indexOf(k, i + 1)) !== -1 && n < 4) { console.log(`[${k}] …${text.slice(Math.max(0, i - 300), i + 700)}…\n`); n++; }
}
