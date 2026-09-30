// r3: verifier cases against the harness's css-static.mjs (aa3faa2): pairs of
// stylesheets that style a real page differently, which compareSheets() must
// count. Prints each case's count (0 = missed).
import { compareSheets } from '/Users/micahflunker/dev/vibes-night/wt/web-harness/report/btn-44/css-static.mjs';
const root = ':root { --a: #f0be1e; --b: #f0be1e; }\n';
const cases = [
  // Selectors: whitespace inside an attribute value is part of the value.
  ['attr value ", " vs ","', '[title="Log food, now"] { color: red; }', '[title="Log food,now"] { color: red; }'],
  ['attr value " > " vs ">"', '[aria-label="a > b"] { color: red; }', '[aria-label="a>b"] { color: red; }'],
  ['attr value " + " vs "+"', '[data-k="1 + 1"] { color: red; }', '[data-k="1+1"] { color: red; }'],
  ['attr value double space', '[title="a  b"] { color: red; }', '[title="a b"] { color: red; }'],
  // Sanity: must be counted
  ['class name case', '.Foo { color: red; }', '.foo { color: red; }'],
  ['colour', '.x { color: #f0be1e; }', '.x { color: #f0be1f; }'],
  // Round-2 regressions (R2-2/R2-6): must be counted now
  ['R2: declaration order in a rule', '.x { border: 1px solid red; border-color: blue; }', '.x { border-color: blue; border: 1px solid red; }'],
  ['R2: custom property name case', '.x { --Q: red; color: var(--Q); }', '.x { --q: red; color: var(--Q); }'],
  ['R2: string case', '.x::after { content: "a"; }', '.x::after { content: "A"; }'],
  ['R2: whitespace inside a string', '.x::after { content: "a  b"; }', '.x::after { content: "a b"; }'],
  ['R2: url() body case', '.x { background: url(a.png); }', '.x { background: url(A.png); }'],
  ['R2: animation name case', '.x { animation: viewIn 1s; }', '.x { animation: viewin 1s; }'],
  ['R2: 900px rule order vs top level', '.s { border-radius: 18px; } @media (min-width: 900px) { .s { border-radius: 18px; } }', '@media (min-width: 900px) { .s { border-radius: 18px; } } .s { border-radius: 18px; }'],
  ['!important moved', '.x { color: red !important; }', '.x { color: red; }'],
  ['keyframe offset', '@keyframes k { 50% { opacity: .5; } }', '@keyframes k { 40% { opacity: .5; } }'],
  ['var() fallback only B uses', '.x { color: red; }', '.x { color: var(--nope, red); }'],
  // Controls: must stay equal
  ['control: token copy', '.x { color: var(--a); }', '.x { color: var(--b); }'],
  ['control: combinator spacing', '.a > .b { color: red; }', '.a>.b { color: red; }'],
];
for (const [name, a, b] of cases) {
  const r = compareSheets({ 'rack.css': root + a }, { 'rack.css': root + b });
  console.log((r.count ? 'COUNTED ' + r.count : 'MISSED (0)') + '  ' + name + '   A: ' + a + '   B: ' + b);
}
