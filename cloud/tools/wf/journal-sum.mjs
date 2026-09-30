// journal-sum.mjs — one line per agent of a workflow run: label, state (running/done/FAILED), and for
// gates/reviews pass + must-fix titles, for builds/fixes the commit + complete flag. Keeps the orchestrator's
// context small.   node journal-sum.mjs <runId> [sessionId]
import { readFileSync, existsSync } from 'node:fs';
const [run, sess = 'a17eac98-c779-495e-b9f2-54be1cf67d7a'] = process.argv.slice(2);
const f = `/Users/micahflunker/.claude/projects/-Users-micahflunker-dev-ship-v59/${sess}/subagents/workflows/${run}/journal.jsonl`;
if (!existsSync(f)) { console.log('no journal', f); process.exit(1); }
const lab = {}, state = {}, res = {}, order = [];
for (const l of readFileSync(f, 'utf8').split('\n').filter(Boolean)) {
  const x = JSON.parse(l);
  if (x.type === 'started') { if (!(x.key in state)) order.push(x.key); lab[x.key] = x.label; state[x.key] = 'running'; }
  if (x.type === 'result') { state[x.key] = 'done'; res[x.key] = typeof x.result === 'string' ? (() => { try { return JSON.parse(x.result); } catch { return x.result; } })() : x.result; }
  if (x.type === 'failed') state[x.key] = 'FAILED';
}
const cut = (s, n) => { s = String(s ?? ''); return s.length > n ? s.slice(0, n) + '…' : s; };
for (const k of order) {
  const r = res[k]; let extra = '';
  if (r && typeof r === 'object') {
    if ('pass' in r) extra = `pass=${r.pass} must=${(r.must_fix || []).length} ${(r.must_fix || []).map(m => '[' + cut(m.title, 90) + ']').join(' ')}`;
    else if ('verdict' in r) extra = `${r.verdict} ${r.confidence}`;
    else if ('commit' in r) extra = `complete=${r.complete} commit=${cut(r.commit, 110)} left=${(r.left || []).length}`;
    else if ('spec_file' in r) extra = `spec=${r.spec_file} winner=${cut(r.winner, 60)} asks=${(r.engine_asks || []).length}`;
    else if ('file' in r) extra = `file=${r.file}`;
    else if ('pick' in r) extra = `pick=${r.pick}`;
  }
  console.log(`${state[k].padEnd(7)} ${lab[k]} ${extra}`);
}
