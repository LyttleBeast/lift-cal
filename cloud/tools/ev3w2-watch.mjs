// Watches the ev3w2 proof chain's output file; prints each new line that
// names a verdict, an exit or an error, and exits once the chalk run ends.
import { readFileSync, existsSync } from 'node:fs';
const f = process.argv[2];
let seen = 0;
const re = /exit|verdict|IDENTICAL|DIFFERENT|INCOMPLETE|UNSTEADY|DIRTY|Error|error|lock: acquired|lock: waiting/;
for (;;) {
  if (existsSync(f)) {
    const lines = readFileSync(f, 'utf8').split('\n');
    for (let i = seen; i < lines.length - 1; i++) if (re.test(lines[i])) console.log(lines[i].slice(0, 300));
    seen = Math.max(seen, lines.length - 1);
    if (lines.some(l => /^chalk exit/.test(l))) process.exit(0);
  }
  await new Promise(r => setTimeout(r, 30000));
}
