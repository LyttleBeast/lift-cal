// resume-check.mjs — V59 §3.1 resume checks that need the filesystem or sockets.
// index.lock in each repo and each of its worktree git dirs; the night's own lock files
// (with owner pid liveness); whether ports 8765/9333 are free.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import net from 'node:net';

const NIGHT = '/Users/micahflunker/dev/vibes-night';
const repos = { web: '/Users/micahflunker/dev/ship-v59/.git', nat: '/Users/micahflunker/dev/rack-mobile/.git' };
const out = { indexLocks: [], nightLocks: [], ports: {} };
for (const [k, g] of Object.entries(repos)) {
  if (existsSync(join(g, 'index.lock'))) out.indexLocks.push(join(g, 'index.lock'));
  const wt = join(g, 'worktrees');
  if (existsSync(wt)) for (const w of readdirSync(wt)) if (existsSync(join(wt, w, 'index.lock'))) out.indexLocks.push(join(wt, w, 'index.lock'));
}
const alive = pid => { try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; } };
for (const f of readdirSync(NIGHT).filter(f => f.endsWith('.lock'))) {
  const pid = +readFileSync(join(NIGHT, f), 'utf8').trim();
  out.nightLocks.push({ f, pid, alive: pid ? alive(pid) : false });
}
const free = port => new Promise(res => { const s = net.createServer(); s.once('error', e => res(e.code)); s.once('listening', () => s.close(() => res('free'))); s.listen(port, '127.0.0.1'); });
for (const p of [8765, 9333]) out.ports[p] = await free(p);
console.log(JSON.stringify(out, null, 1));
