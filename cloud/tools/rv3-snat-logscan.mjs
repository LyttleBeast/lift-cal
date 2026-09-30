// rv3-snat-logscan — lines of the orchestrator's log that mention the S (nat)
// review rounds, read-only.
import { readFileSync } from 'node:fs';
const t = readFileSync('/Users/micahflunker/dev/vibes-night/VIBES-LOG.md', 'utf8').split('\n');
t.forEach((l, i) => { if (/rv2|round 2|S1\b|late refusal|last tap|nat-settings|S \(nat\)|s-nat/i.test(l)) console.log((i + 1) + ': ' + l.slice(0, 400)); });
