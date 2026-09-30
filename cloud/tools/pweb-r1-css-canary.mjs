// Builds a canary copy of the engine's served files under
// ~/dev/vibes-night/tmp/pweb-r1-css/canary with planted v1 changes that only
// show in states no scene captures, so the probe can be shown to see them.
import { readFileSync, writeFileSync, mkdirSync, cpSync } from 'node:fs';
import { join } from 'node:path';
const SRC = '/Users/micahflunker/dev/vibes-night/wt/web-engine';
const DST = '/Users/micahflunker/dev/vibes-night/tmp/pweb-r1-css/canary';
mkdirSync(DST, { recursive: true });
for (const f of ['index.html', 'auth.css', 'vibe.js']) cpSync(join(SRC, f), join(DST, f));
cpSync(join(SRC, 'vibes'), join(DST, 'vibes'), { recursive: true });
let css = readFileSync(join(SRC, 'rack.css'), 'utf8');
const plant = (from, to, what) => { if (!css.includes(from)) throw new Error('canary anchor missing: ' + what); css = css.replace(from, to); console.log('planted: ' + what); };
plant('.install-x:active { color: var(--chalk); background: var(--raised); }', '.install-x:active { color: var(--chalk); background: var(--raisd); }', ':active rule, a misspelt token (IACVT)');
plant('50%      { background: rgba(var(--accent-rgb),.38); }', '50%      { background: rgba(var(--accent-rgb),.37); }', 'coachPulse 50% keyframe alpha .38 -> .37');
plant('.sheet { max-width: 720px; border-radius: var(--r-sheet); bottom: 24px; }', '.sheet { max-width: 720px; border-radius: var(--r-tile); bottom: 24px; }', '(min-width: 900px) .sheet radius 18px -> 10px');
plant('  --faint:   #333844;', '  --faint:   #333845;', '--faint one step off (a :root split)');
writeFileSync(join(DST, 'rack.css'), css);
let auth = readFileSync(join(SRC, 'auth.css'), 'utf8');
const i = auth.indexOf('@media (max-width: 380px)');
console.log('auth.css 380px block at ' + i);
