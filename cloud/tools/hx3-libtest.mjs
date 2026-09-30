// hx3-libtest: checks harness-lib's lock and bind-error paths in isolation (V59 §7.1, not committed).
// HARNESS_HOME points the lib at a scratch directory, so the night's real lock is never touched.
//   HARNESS_HOME=/Users/micahflunker/dev/vibes-night/tmp/harness3/libtest node hx3-libtest.mjs
import net from 'node:net';
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
if (!process.env.HARNESS_HOME || !process.env.HARNESS_HOME.includes('/vibes-night/tmp/')) throw new Error('set HARNESS_HOME to a scratch dir under vibes-night/tmp');
const lib = await import('/Users/micahflunker/dev/vibes-night/wt/web-harness/report/btn-44/harness-lib.mjs');
const { LOCK, NIGHT, acquireLock, startServer } = lib;
mkdirSync(NIGHT, { recursive: true });
const results = [];
const ok = (name, pass, detail = '') => { results.push((pass ? 'PASS ' : 'FAIL ') + name + (detail ? ' — ' + detail : '')); };

// 1. A bind error is loud: something already listens on the port.
const srv = net.createServer().listen(8799, '127.0.0.1');
await new Promise(r => srv.once('listening', r));
try { await startServer('/Users/micahflunker/dev/vibes-night/wt/web-base', 8799); ok('bind error', false, 'startServer did not throw'); }
catch (e) { ok('bind error', /BIND ERROR/.test(e.message), e.message.slice(0, 120)); }
srv.close();

// 2. A lock left by a dead pid is reclaimed, and ours is released on request.
writeFileSync(LOCK, '999999');
const logs = [];
const release = await acquireLock({ waitMs: 5000, log: m => logs.push(m) });
ok('stale lock reclaimed', readFileSync(LOCK, 'utf8').trim() === String(process.pid) && logs.some(l => /reclaiming/.test(l)), logs.join(' | '));
release();
ok('lock released', !existsSync(LOCK));

// 3. A lock held by a live pid is waited on, then refused after waitMs.
writeFileSync(LOCK, String(process.ppid));
const t0 = Date.now();
try { await acquireLock({ waitMs: 3000, log: () => {} }); ok('live lock refused', false, 'acquired a live lock'); }
catch (e) { ok('live lock refused', /held by live pid/.test(e.message) && Date.now() - t0 >= 3000, e.message.slice(0, 120)); }
ok('live lock left alone', readFileSync(LOCK, 'utf8').trim() === String(process.ppid));

console.log(results.join('\n'));
process.exit(results.every(r => r.startsWith('PASS')) ? 0 : 1);
