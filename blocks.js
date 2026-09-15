/* ================= LIFTING BLOCKS — the pure model =================
   A lifting block is a CONTAINER, not a new set model. The exercises inside one
   have the ordinary set rows and the ordinary controls; what a block adds is
   one button — duplicate — because this training style repeats the whole block
   rather than adding a fourth set to one exercise.

   In the record a block is an ANNOTATION and nothing more: `block: 1` on the
   exercise objects already in `exercises`. There is no new nesting level, so
   detectPRs, computeVolume, sessionMilestones, history, analytics, stats, the
   published rules and the native port all keep reading the shape they already
   read, and the 219 sessions carrying no annotation keep meaning "ungrouped".
   If this ever grows a level, it has gone wrong.

   The `blocks` array is the one piece of state that is NOT in the record, and
   it exists for one case: an empty block has no exercises to annotate, so
   whatever is holding the thing has to remember it until something is put in
   it. A live workout keeps it on the session in localStorage; the routine
   editor keeps it in memory for as long as the sheet is open and strips it on
   save, because a stored `blocks` array would be a second source of truth for a
   fact the annotations already carry.

   The number stored IS the number on screen. Every structural change renumbers
   1..N by position, so there is no separate id to keep in step with the label.

   Everything here is pure: it takes a plain `{ exercises, blocks }` object and
   returns the next `{ exercises, blocks }` pair, touching no module state and
   no DOM. That is deliberate twice over. The native port copies these functions
   across verbatim and drives them from its own store, rather than
   reimplementing the rule from a description — which is exactly how
   finishWorkout and rebuildHistoryFromLog came to disagree about the same data.
   And nothing in here reads a set's `w`, `r` or `done`: those are session-only
   fields, and a routine's sets are `{ tw, tr, type }` instead. A function that
   peeked at one would serve the workout screen and quietly mangle the routine
   editor. Where that handling is genuinely needed it is the caller's, passed in
   — see `duplicateBlock`.

   `tools-check/blocks.mjs` imports this module directly and is the guardrail
   for all of it. */

// Block numbers in the order they first appear. This is what reconstructs the
// blocks of a past session: the annotation is all there is to go on.
export function blockOrder(exercises) {
  const out = [];
  (exercises || []).forEach(ex => {
    if (ex && ex.block && out.indexOf(ex.block) === -1) out.push(ex.block);
  });
  return out;
}

// A live session carries its blocks explicitly; one restored from an older
// localStorage copy, or reached before any block was made — or a stored
// routine, which never carries them at all — falls back to what the
// annotations say.
export function sessionBlocks(s) {
  return (s && s.blocks) || blockOrder(s && s.exercises);
}

// Renumbers 1..N by position so the stored number and the label are the same
// number. The order is the order the screen reads in — by where each block's
// first exercise sits, with the empty ones, which have no position yet, after
// them. Without that, taking the last exercise out of Block 1 by its own ⋯
// menu leaves "Block 2" sitting above "Block 1".
//
// An exercise whose block is no longer there falls back to ungrouped rather
// than vanishing with it — losing the grouping is a cosmetic failure, losing
// the sets is not.
export function normalizeBlocks(exercises, blocks) {
  const present = blockOrder(exercises).filter(b => (blocks || []).indexOf(b) !== -1);
  const order = present.concat((blocks || []).filter(b => present.indexOf(b) === -1));
  const to = new Map();
  order.forEach((b, i) => to.set(b, i + 1));
  return {
    blocks: order.map((_, i) => i + 1),
    exercises: (exercises || []).map(ex => {
      if (!ex || !ex.block) return ex;
      const n = to.get(ex.block);
      if (!n) { const { block, ...rest } = ex; return rest; }
      return ex.block === n ? ex : { ...ex, block: n };
    })
  };
}

// Where a new member of block `n` goes: straight after the block's last one.
// Keeping a block's exercises contiguous is what makes the array order and the
// order on screen the same order, which in turn is what "sets concatenated in
// session order" means once the same exId is in the session twice.
export function blockEnd(exercises, n) {
  let at = -1;
  (exercises || []).forEach((ex, i) => { if (ex && ex.block === n) at = i; });
  return at === -1 ? (exercises || []).length : at + 1;
}

export function addBlock(s) {
  const blocks = sessionBlocks(s);
  const next = blocks.reduce((m, b) => Math.max(m, b), 0) + 1;
  return normalizeBlocks(s.exercises, blocks.concat(next));
}

export function addToBlock(s, n, added) {
  const exercises = (s.exercises || []).slice();
  exercises.splice(blockEnd(s.exercises, n), 0, ...added.map(ex => ({ ...ex, block: n })));
  return normalizeBlocks(exercises, sessionBlocks(s));
}

// The point of the whole feature. The copy carries the same exercises with
// whatever their sets already say, and lands immediately after the block it
// came from — the same idea as adding a set, which prefills from the set
// before it.
//
// Each set is copied OPAQUELY, which is what lets one function serve both
// callers: the workout screen's sets are `{ w, r, type, done }` and a routine's
// are `{ tw, tr, type }`, and this does not know the difference. Anything
// set-shape-specific is the caller's, passed in as `copySet`:
//
//   - The workout screen passes one, because `done` has to follow the mode
//     rather than being flatly false. collectDone keeps only sets marked done,
//     so an unticked copy made while editing a past session would silently
//     disappear on save. It also drops tw/tr there: a repeat of a block is real
//     work, not a plan for it.
//   - The routine editor passes none, so its target sets come across untouched
//     — which is the whole content of a routine's block.
export function duplicateBlock(s, n, opts) {
  const copySet = (opts && opts.copySet) || (x => ({ ...x }));
  const blocks = sessionBlocks(s);
  const at = blocks.indexOf(n);
  if (at === -1) return { exercises: s.exercises, blocks };
  const next = blocks.reduce((m, b) => Math.max(m, b), 0) + 1;
  const copies = (s.exercises || []).filter(ex => ex && ex.block === n).map(ex => ({
    exId: ex.exId, name: ex.name, group: ex.group, equipment: ex.equipment,
    block: next,
    sets: (ex.sets || []).map(copySet)
  }));
  const exercises = (s.exercises || []).slice();
  exercises.splice(blockEnd(s.exercises, n), 0, ...copies);
  return normalizeBlocks(exercises, blocks.slice(0, at + 1).concat(next, blocks.slice(at + 1)));
}

export function deleteBlock(s, n) {
  return normalizeBlocks(
    (s.exercises || []).filter(ex => !(ex && ex.block === n)),
    sessionBlocks(s).filter(b => b !== n)
  );
}

// The session as rows: one per ungrouped exercise, one per block, in the order
// they appear. A block that holds nothing yet has no appearance to be ordered
// by, so it comes last — which is where it was just created.
export function sessionLayout(exercises, blocks) {
  const rows = [];
  const byBlock = new Map();
  (exercises || []).forEach((ex, i) => {
    const b = ex && ex.block;
    if (!b) { rows.push({ kind: 'ex', index: i }); return; }
    let row = byBlock.get(b);
    if (!row) { row = { kind: 'block', block: b, items: [] }; byBlock.set(b, row); rows.push(row); }
    row.items.push(i);
  });
  (blocks || []).forEach(b => {
    if (!byBlock.has(b)) rows.push({ kind: 'block', block: b, items: [] });
  });
  return rows;
}
