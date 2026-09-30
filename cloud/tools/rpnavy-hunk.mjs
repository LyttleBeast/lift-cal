// rpnavy: is the navy-polish colourless-preset hunk in verify-vibe-parity.mjs
// byte-identical to the one vibes/ledger carries? Also prints theme.js's tag handling.
import { execFileSync } from 'node:child_process';
const git = (...a) => execFileSync('git', ['-C', '/Users/micahflunker/dev/rack-mobile', ...a], { encoding: 'utf8', maxBuffer: 64 << 20 });
const grab = src => { const i = src.indexOf('  /* Engine v3\'s two colourless presets'); if (i < 0) return null; const j = src.indexOf('  };\n', i); return src.slice(i, j + 5); };
const a = grab(git('show', 'vibes/navy-polish:tools/verify-vibe-parity.mjs'));
const b = grab(git('show', 'vibes/ledger:tools/verify-vibe-parity.mjs'));
console.log('navy hunk found', !!a, 'ledger hunk found', !!b, 'identical', a === b);
if (a !== b) { console.log('--- navy\n' + a + '\n--- ledger\n' + b); }
const th = git('show', 'vibes/navy-polish:src/theme.js').split('\n');
th.forEach((l, i) => { if (/\btag\b|COLOURLESS|colourless|pill/.test(l)) console.log('theme.js:' + (i + 1) + ': ' + l.slice(0, 200)); });
