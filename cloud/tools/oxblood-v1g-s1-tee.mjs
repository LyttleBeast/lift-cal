// Run a node tool and keep its stdout+stderr in a file (the hook forbids
// shell redirects). Usage: node oxblood-v1g-s1-tee.mjs <outFile> <script> [args…]
import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const [out, ...args] = process.argv.slice(2);
const r = spawnSync(process.execPath, args, { encoding: 'utf8', maxBuffer: 256 << 20 });
const txt = (r.stdout || '') + (r.stderr ? '\n--- stderr ---\n' + r.stderr : '') + '\nexit ' + r.status + '\n';
writeFileSync(out, txt);
console.log(txt.length > 5000 ? txt.slice(0, 2500) + '\n…\n' + txt.slice(-2500) : txt);
