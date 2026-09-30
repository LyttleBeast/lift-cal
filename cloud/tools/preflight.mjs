// preflight.mjs — V59 §3.4 checks that need the filesystem (no Bash fs tools allowed).
// Usage: node preflight.mjs
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const HOME = '/Users/micahflunker';
const WEB = `${HOME}/dev/ship-v59`;
const NAT = `${HOME}/dev/rack-mobile`;
const out = {};

out.webIndexLock = existsSync(join(WEB, '.git/index.lock'));
out.natIndexLock = existsSync(join(NAT, '.git/index.lock'));

const app = JSON.parse(readFileSync(join(NAT, 'app.json'), 'utf8'));
out.natBuildNumber = app?.expo?.ios?.buildNumber ?? null;
out.natVersion = app?.expo?.version ?? null;

out.chromeApp = existsSync('/Applications/Google Chrome.app');
out.chromeBin = existsSync('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome');

const webChecks = readdirSync(join(WEB, 'tools-check')).filter(f => f.endsWith('.mjs')).sort();
out.webVerifierCount = webChecks.length;
out.webVerifiers = webChecks;
out.webJsCount = readdirSync(WEB).filter(f => f.endsWith('.js')).length;

const natTools = readdirSync(join(NAT, 'tools')).filter(f => /^verify-.*\.mjs$/.test(f)).sort();
out.natVerifyCount = natTools.length;
out.natVerifiers = natTools;
const rulesDir = join(NAT, 'tools/rules');
out.natRulesDir = existsSync(rulesDir) ? readdirSync(rulesDir).sort() : null;

out.vibesNight = readdirSync(`${HOME}/dev/vibes-night`).sort();
out.vibesLogExists = existsSync(`${HOME}/dev/vibes-night/VIBES-LOG.md`);
out.nodeVersion = process.version;

console.log(JSON.stringify(out, null, 1));
