// 08a-probe.mjs — time the first byte of a §14-host URL (tile.loc.gov / archive.org) with a 30 s abort.
for (const u of process.argv.slice(2)) {
  const h = new URL(u).hostname;
  if (!(h.endsWith('loc.gov') || h.endsWith('archive.org'))) { console.log('skip host', h); continue; }
  const t0 = Date.now();
  try {
    const r = await fetch(u, { signal: AbortSignal.timeout(30000), headers: { 'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36' } });
    console.log(r.status, r.headers.get('content-length'), r.headers.get('content-type'), `${Date.now() - t0}ms`, u);
    await r.body?.cancel();
  } catch (e) { console.log('ERR', e.name, `${Date.now() - t0}ms`, u); }
}
