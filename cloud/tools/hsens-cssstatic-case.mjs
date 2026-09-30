// Verifier cases for css-static.mjs (the harness's text comparison, a393ffb):
// changes a browser renders differently that compareSheets() counts as equal.
import { compareSheets } from '/Users/micahflunker/dev/vibes-night/wt/web-harness/report/btn-44/css-static.mjs';
const root = ':root { --chalk: #f2f0eb; }\n';
const cases = [
  ['content string, case only', '.x::before { content: "Rack"; }', '.x::before { content: "rack"; }'],
  ['content string, inner whitespace', '.x::after { content: "a  b"; white-space: pre; }', '.x::after { content: "a b"; white-space: pre; }'],
  ['animation-name, case only (keyframes names are case-sensitive)', '@keyframes coachPulse { 0% { opacity: 0 } }\n.x { animation: coachPulse 1s; }', '@keyframes coachPulse { 0% { opacity: 0 } }\n.x { animation: coachpulse 1s; }'],
  ['url(), case only (a different file on a case-sensitive host)', '.x { background-image: url(img/Grain.png); }', '.x { background-image: url(img/grain.png); }'],
  ['inside a block no scene enters (@media (min-width: 900px))', '@media (min-width: 900px) { .x::before { content: "Rack"; } }', '@media (min-width: 900px) { .x::before { content: "RACK"; } }'],
  ['control: a real colour change', '.x { color: #f2f0eb; }', '.x { color: #f2f0ec; }']
];
let bad = 0;
for (const [name, a, b] of cases) {
  const r = compareSheets({ 'rack.css': root + a }, { 'rack.css': root + b });
  const counted = r.count;
  console.log((counted ? 'counted ' + counted : 'EQUAL (not counted)') + ' — ' + name + (counted ? '' : ': A ' + JSON.stringify(a) + ' B ' + JSON.stringify(b)));
  if (!counted && !name.startsWith('control')) bad++;
}
console.log(bad + ' of ' + (cases.length - 1) + ' rendered changes are equal to the text comparison');
