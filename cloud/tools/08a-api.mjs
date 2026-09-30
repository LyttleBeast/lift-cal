// 08a-api.mjs — polite Commons API GET with spacing + backoff (shared by the 08a scripts).
const ua = 'RackVibesResearch/0.1 (personal research script; low volume) node-fetch';
let last = 0;
const sleep = ms => new Promise(r => setTimeout(r, ms));
export async function commonsGet(params) {
  const u = 'https://commons.wikimedia.org/w/api.php?' + new URLSearchParams({ format: 'json', maxlag: '5', ...params });
  if (new URL(u).hostname !== 'commons.wikimedia.org') throw new Error('host');
  for (let attempt = 0; attempt < 6; attempt++) {
    const wait = Math.max(0, last + 2500 - Date.now());
    if (wait) await sleep(wait);
    last = Date.now();
    const r = await fetch(u, { headers: { 'user-agent': ua, 'api-user-agent': ua } });
    const txt = await r.text();
    if (r.ok && txt.startsWith('{')) {
      const j = JSON.parse(txt);
      if (j.error?.code === 'maxlag') { await sleep(5000); continue; }
      return j;
    }
    await sleep(10000 * (attempt + 1));
  }
  throw new Error('rate-limited: ' + u);
}
