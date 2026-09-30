// 08a-speed.mjs — stream a §14-host URL for up to N seconds and report throughput (nothing saved).
const [u, secs = '20'] = process.argv.slice(2);
const h = new URL(u).hostname;
if (!(h.endsWith('loc.gov') || h.endsWith('archive.org'))) throw new Error('host');
const t0 = Date.now(); let n = 0;
const ac = new AbortController(); setTimeout(() => ac.abort(), Number(secs) * 1000);
try {
  const r = await fetch(u, { signal: ac.signal, headers: { 'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36' } });
  for await (const c of r.body) n += c.length;
  console.log('complete', n, `${Date.now() - t0}ms`);
} catch (e) { console.log('stopped', e.name, n, 'bytes in', `${Date.now() - t0}ms`, Math.round(n / ((Date.now() - t0) / 1000)), 'B/s'); }
