// Pweb round-2 review: unit cases against the harness's own css-static.mjs
// (imported read-only from the harness worktree). Each pair below renders
// differently in any browser; the comparator should report count > 0.
const H = process.argv[2] || '/Users/micahflunker/dev/vibes-night/wt/web-harness/report/btn-44/css-static.mjs';
const { compareSheets } = await import(H);

const cases = [
  { name: 'in-rule order: shorthand after its longhand (later declaration wins)',
    why: 'A paints the border blue (border-color after border); B paints it red (border after border-color).',
    A: '.x { border: 1px solid red; border-color: blue; }',
    B: '.x { border-color: blue; border: 1px solid red; }' },
  { name: 'custom property names are case-sensitive; the comparator folds them',
    why: 'In B, --a is red and --A is a different property; .x is red in B, #f0be1e in A.',
    A: ':root { --a: #f0be1e; } .x { color: var(--a); }',
    B: ':root { --a: red; --A: #f0be1e; } .x { color: var(--a); }' },
  { name: 'strings are case-sensitive; the comparator lowercases values',
    why: "A draws 'A' in ::before, B draws 'a'.",
    A: ".x::before { content: 'A'; }",
    B: ".x::before { content: 'a'; }" },
  { name: 'animation-name is a case-sensitive ident; the comparator lowercases it',
    why: 'B names a @keyframes that does not exist (setflash), so .x does not animate.',
    A: '@keyframes setFlash { 0% { opacity: 0; } } .x { animation: setFlash 1s; }',
    B: '@keyframes setFlash { 0% { opacity: 0; } } .x { animation: setflash 1s; }' },
  { name: 'control: a real value change is caught',
    why: 'sanity',
    A: '.x { color: red; }', B: '.x { color: blue; }' },
];
let missed = 0;
for (const c of cases) {
  const r = compareSheets({ 'rack.css': c.A }, { 'rack.css': c.B });
  const caught = r.count > 0;
  if (!caught && !/^control/.test(c.name)) missed++;
  console.log((caught ? 'CAUGHT ' : 'MISSED ') + c.name + ' (count ' + r.count + ')');
  console.log('   ' + c.why);
  console.log('   A: ' + c.A + '\n   B: ' + c.B);
}
console.log(missed + ' of ' + (cases.length - 1) + ' cases missed');
