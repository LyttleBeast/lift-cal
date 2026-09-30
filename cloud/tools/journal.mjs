// journal.mjs — summarise a workflow run's journal: per agent, label + status + chosen fields.
// Usage: node journal.mjs <runId> [field,field,...] [maxChars]
import { readFileSync } from 'node:fs';
const [run, fieldsArg, maxArg] = process.argv.slice(2);
const base = '/Users/micahflunker/.claude/projects/-Users-micahflunker-dev-ship-v59/9c027bd9-45b4-4e94-9244-8120dca8256c/subagents/workflows/';
const L = readFileSync(base + run + '/journal.jsonl', 'utf8').trim().split('\n').map(l => JSON.parse(l));
const fields = (fieldsArg || '').split(',').filter(Boolean);
const max = +(maxArg || 1500);
const labels = {};
for (const o of L) if (o.type === 'started') labels[o.key] = o.label;
for (const o of L) {
  if (o.type === 'started' || o.type === 'launched') continue;
  const lab = labels[o.key] || o.label || '?';
  if (o.type !== 'result') { console.log(`## ${lab} — ${o.type}`); continue; }
  const r = o.result;
  console.log(`## ${lab} — result`);
  if (!r || typeof r !== 'object') { console.log(String(r).slice(0, max)); continue; }
  const pick = fields.length ? fields.filter(f => f in r) : Object.keys(r);
  for (const f of pick) console.log(`- ${f}: ${JSON.stringify(r[f]).slice(0, max)}`);
}
