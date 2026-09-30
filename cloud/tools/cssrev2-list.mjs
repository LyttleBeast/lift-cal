// cssrev2-list.mjs [filterRegex] — list the tokenised declarations from proof/cssrev2/resolve.json
import fs from 'node:fs';
const { report } = JSON.parse(fs.readFileSync('/Users/micahflunker/dev/vibes-night/proof/cssrev2/resolve.json', 'utf8'));
const re = process.argv[2] ? new RegExp(process.argv[2]) : null;
const mode = process.argv[3] || 'full';
const props = new Map();
for (const t of report.tokenised) {
  const line = `${t.f}:${t.lineB} ${t.rule} { ${t.prop}${t.imp ? ' !important' : ''}: ${t.base}  =>  ${t.eng} }${t.unresolvedB.length ? ' UNRES ' + t.unresolvedB : ''}`;
  if (re && !re.test(line)) continue;
  props.set(t.prop, (props.get(t.prop) || 0) + 1);
  if (mode === 'full') console.log(line);
}
console.log('props:', JSON.stringify([...props].sort((a, b) => b[1] - a[1])));
