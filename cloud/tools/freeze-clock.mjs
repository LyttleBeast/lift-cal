// freeze-clock.mjs — a node --import preload that pins the clock for seed.mjs (V59 §7.1).
//   TZ=America/New_York SEED_OUT=<file> node --import /Users/micahflunker/dev/vibes-night/tools/freeze-clock.mjs report/btn-44/seed.mjs
// Date.now() and `new Date()` return FREEZE_NOW (default 2026-09-25T19:30:00-04:00,
// a Friday evening — the same NOW the proof harness injects into the page).
// `new Date(x)`, Date.parse and Date.UTC are untouched.
const NOW = Date.parse(process.env.FREEZE_NOW || '2026-09-25T19:30:00-04:00');
if (!Number.isFinite(NOW)) throw new Error('freeze-clock: FREEZE_NOW does not parse');
const RealDate = Date;
function FrozenDate(...a) {
  if (!new.target) return new RealDate(NOW).toString();
  return a.length ? new RealDate(...a) : new RealDate(NOW);
}
FrozenDate.prototype = RealDate.prototype;
FrozenDate.now = () => NOW;
FrozenDate.parse = RealDate.parse;
FrozenDate.UTC = RealDate.UTC;
globalThis.Date = FrozenDate;
process.env.FREEZE_NOW_MS = String(NOW);
