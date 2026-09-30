// run-verifiers.mjs — the night's verifier runner (V59 §3: every verifier, three zones).
// No shell: spawns node directly, logs every verifier's output to a file.
//
//   node run-verifiers.mjs <web|nat> <repoDir> <outDir> [zones=America/New_York,UTC,Pacific/Auckland] [jobs=1]
//
// web: the CLAUDE.md loop — `node --check --input-type=module < f` for every root *.js
//      (plus any vibes/**/*.js), then every tools-check/*.mjs, cwd = repo root.
// nat: every tools/verify-*.mjs plus tools/rules/{prove,verify-delete-coalescing,verify-generator-level}.mjs,
//      cwd = repo root (the NIGHT-LOG loop).
// Writes <outDir>/<zoneSlug>/<name>.log and <outDir>/summary.json; prints a one-line summary per zone.
import { spawn } from 'node:child_process';
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from 'node:fs';
import { join, basename } from 'node:path';

const [kind, repo, outDir, zoneArg, jobsArg] = process.argv.slice(2);
if (!kind || !repo || !outDir) { console.error('usage: run-verifiers.mjs <web|nat> <repoDir> <outDir> [zones] [jobs]'); process.exit(2); }
const ZONES = (zoneArg || 'America/New_York,UTC,Pacific/Auckland').split(',');
const JOBS = +(jobsArg || 1);
const TIMEOUT = 9 * 60e3;
mkdirSync(outDir, { recursive: true });

// The machine is an 8 GB M1: at most SLOTS full suites at once, night-wide.
// A slot is a lock file holding its owner's pid; a dead owner's slot is reclaimed.
const NIGHT = '/Users/micahflunker/dev/vibes-night';
const SLOTS = +(process.env.VERIFY_SLOTS || 2);
const alive = pid => { try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; } };
let slotFile = null;
const { openSync, closeSync, unlinkSync } = await import('node:fs');
for (let waited = 0; !slotFile; waited++) {
  for (let i = 1; i <= SLOTS && !slotFile; i++) {
    const f = join(NIGHT, `verify-slot-${i}.lock`);
    if (existsSync(f)) {
      const pid = +readFileSync(f, 'utf8').trim();
      if (pid && alive(pid)) continue;
      try { unlinkSync(f); } catch {}
    }
    try { const fd = openSync(f, 'wx'); writeFileSync(fd, String(process.pid)); closeSync(fd); slotFile = f; } catch {}
  }
  if (!slotFile) { if (waited % 12 === 0) console.log(`[run-verifiers] waiting for a verify slot (${SLOTS} in use)…`); await new Promise(r => setTimeout(r, 5000)); }
}
const release = () => { try { if (readFileSync(slotFile, 'utf8').trim() === String(process.pid)) unlinkSync(slotFile); } catch {} };
process.on('exit', release);
process.on('SIGINT', () => process.exit(130));
process.on('SIGTERM', () => process.exit(143));

function run(args, { cwd, tz, input, logFile }) {
  return new Promise(resolve => {
    const t0 = Date.now();
    const p = spawn(process.execPath, args, { cwd, env: { ...process.env, TZ: tz }, stdio: ['pipe', 'pipe', 'pipe'] });
    let out = '';
    p.stdout.on('data', d => { out += d; });
    p.stderr.on('data', d => { out += d; });
    const timer = setTimeout(() => { out += '\n[run-verifiers] TIMEOUT'; p.kill('SIGKILL'); }, TIMEOUT);
    if (input != null) p.stdin.end(input); else p.stdin.end();
    p.on('close', code => {
      clearTimeout(timer);
      if (logFile) writeFileSync(logFile, out);
      resolve({ code: code ?? -1, ms: Date.now() - t0, out });
    });
  });
}

function listJs(dir, rel = '') {
  const res = [];
  for (const f of readdirSync(join(dir, rel))) {
    const p = join(rel, f);
    const st = statSync(join(dir, p));
    if (st.isDirectory()) res.push(...listJs(dir, p));
    else if (f.endsWith('.js')) res.push(p);
  }
  return res;
}

let checks = [];
let syntax = [];
if (kind === 'web') {
  syntax = readdirSync(repo).filter(f => f.endsWith('.js')).sort();
  if (existsSync(join(repo, 'vibes'))) syntax.push(...listJs(repo, 'vibes').sort());
  checks = readdirSync(join(repo, 'tools-check')).filter(f => f.endsWith('.mjs')).sort().map(f => 'tools-check/' + f);
} else if (kind === 'nat') {
  checks = readdirSync(join(repo, 'tools')).filter(f => /^verify-.*\.mjs$/.test(f)).sort().map(f => 'tools/' + f);
  checks.push('tools/rules/prove.mjs', 'tools/rules/verify-delete-coalescing.mjs', 'tools/rules/verify-generator-level.mjs');
} else { console.error('kind must be web or nat'); process.exit(2); }

const BATTERIES = /coach-prog|coach-overlap|coach-ready|coach-fuel|finish\.mjs|coach-volume/;
const summary = { kind, repo, startedAt: new Date().toISOString(), zones: {} };
for (const tz of ZONES) {
  const slug = tz.replace(/\//g, '_');
  const zdir = join(outDir, slug);
  mkdirSync(zdir, { recursive: true });
  const z = { syntaxTotal: syntax.length, syntaxFail: [], total: checks.length, pass: 0, fail: [], ms: {}, batteries: {} };
  for (const f of syntax) {
    const r = await run(['--check', '--input-type=module'], { cwd: repo, tz, input: readFileSync(join(repo, f)) });
    if (r.code !== 0) { z.syntaxFail.push(f); writeFileSync(join(zdir, 'SYNTAX-' + f.replace(/\//g, '_') + '.log'), r.out); }
  }
  const queue = [...checks];
  const worker = async () => {
    while (queue.length) {
      const f = queue.shift();
      const r = await run([f], { cwd: repo, tz, logFile: join(zdir, basename(f) + '.log') });
      z.ms[f] = r.ms;
      if (r.code === 0) z.pass++; else z.fail.push({ f, code: r.code, tail: r.out.trim().split('\n').slice(-6).join('\n') });
      if (BATTERIES.test(f)) z.batteries[f] = r.out.trim().split('\n').filter(l => /ok|miss|wrong|\d+\/\d+\/\d+|pass|fail/i.test(l)).slice(-6);
    }
  };
  await Promise.all(Array.from({ length: JOBS }, worker));
  z.fail.sort((a, b) => a.f.localeCompare(b.f));
  summary.zones[tz] = z;
  console.log(`${kind} ${tz}: syntax ${syntax.length - z.syntaxFail.length}/${syntax.length}, verifiers ${z.pass}/${z.total}` +
    (z.fail.length ? ' FAIL ' + z.fail.map(x => basename(x.f) + '=' + x.code).join(' ') : '') +
    (z.syntaxFail.length ? ' SYNTAX-FAIL ' + z.syntaxFail.join(' ') : ''));
  writeFileSync(join(outDir, 'summary.json'), JSON.stringify(summary, null, 1));
}
summary.finishedAt = new Date().toISOString();
writeFileSync(join(outDir, 'summary.json'), JSON.stringify(summary, null, 1));
