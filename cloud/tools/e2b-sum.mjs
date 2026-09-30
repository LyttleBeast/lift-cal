// e2b-sum.mjs <summary.json...> — print each zone's pass/total, syntax and failures.
import { readFileSync } from 'node:fs';
for (const f of process.argv.slice(2)) {
  const s = JSON.parse(readFileSync(f, 'utf8'));
  console.log('== ' + f + ' (' + s.repo + ', started ' + s.startedAt + ')');
  for (const [z, r] of Object.entries(s.zones || {})) {
    console.log(`  ${z}: syntax ${r.syntaxTotal - (r.syntaxFail || []).length}/${r.syntaxTotal}, verifiers ${r.pass}/${r.total}` +
      ((r.fail || []).length ? '  FAIL ' + JSON.stringify(r.fail) : '') + ((r.syntaxFail || []).length ? '  SYNTAXFAIL ' + JSON.stringify(r.syntaxFail) : ''));
    for (const k of Object.keys(r)) if (!['syntaxTotal', 'syntaxFail', 'total', 'pass', 'fail', 'ms'].includes(k)) console.log('    ' + k + ': ' + JSON.stringify(r[k]).slice(0, 300));
  }
  for (const k of Object.keys(s)) if (!['kind', 'repo', 'startedAt', 'zones'].includes(k)) console.log('  ' + k + ': ' + JSON.stringify(s[k]).slice(0, 300));
}
