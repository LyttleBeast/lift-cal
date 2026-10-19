#!/usr/bin/env node
//
// Verifier for reordering exercises (v65).
//
//   node tools-check/reorder.mjs
//
// The decision it protects: reordering is a PERMUTATION of the exercise objects
// already in `exercises`. No stored field is added, so the record, the routine
// and database.rules.json are untouched. It imports the real blocks.js (the
// module both screens and the native port share) and reads workout.js,
// routines.js and ui.js as text to pin that the buttons go through it.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const src = f => readFileSync(join(HERE, '..', f), 'utf8');
const B = await import(pathToFileURL(join(HERE, '..', 'blocks.js')).href);

let pass = 0, fail = 0;
const out = [];
const check = (name, ok, detail) => {
  if (ok) { pass++; out.push('  ok   ' + name); }
  else { fail++; out.push('  FAIL ' + name + (detail ? '\n         ' + detail : '')); }
};
const J = x => JSON.stringify(x);

// A fat exercise: every kind of data a move must carry.
const ex = (id, block, extra) => ({
  exId: id, name: id.toUpperCase(), group: 'chest', equipment: 'barbell',
  ...(block ? { block } : null),
  sets: [
    { w: '135', r: '10', type: 'W', done: true },
    { w: '185', r: '8', type: 'N', done: true, rir: 2 },
    { w: '185', r: '6', type: 'D', done: true, dp: 1 },
    { w: '135', r: '8', type: 'N', done: false, tw: '135', tr: '8', tl: true }
  ],
  note: 'keep elbows in ' + id,
  ...extra
});
const ids = s => s.exercises.map(e => e.exId).join(',');
const blk = s => s.exercises.map(e => e.block || 0).join(',');
const sess = (exercises, blocks) => ({ exercises, ...(blocks ? { blocks } : null) });

/* ---- A. ungrouped list: bounds, single item, plain swaps ---- */
{
  const s = sess([ex('a'), ex('b'), ex('c')]);
  check('A: first cannot move up', !B.canMoveExercise(s, 0, -1));
  check('A: last cannot move down', !B.canMoveExercise(s, 2, 1));
  check('A: a refused move returns the same array', B.moveExercise(s, 0, -1).exercises === s.exercises);
  check('A: middle can move both ways', B.canMoveExercise(s, 1, -1) && B.canMoveExercise(s, 1, 1));
  check('A: b up -> b,a,c', ids(B.moveExercise(s, 1, -1)) === 'b,a,c');
  check('A: b down -> a,c,b', ids(B.moveExercise(s, 1, 1)) === 'a,c,b');
  check('A: input not mutated', ids(s) === 'a,b,c');
  const one = sess([ex('solo')]);
  check('A: a single exercise has no move either way',
    !B.canMoveExercise(one, 0, -1) && !B.canMoveExercise(one, 0, 1));
  check('A: empty / bad index / bad dir are no-ops',
    B.moveExercise(sess([]), 0, 1).exercises.length === 0 &&
    B.moveExercise(s, 9, 1).exercises === s.exercises &&
    B.moveExercise(s, 1, 2).exercises === s.exercises);
  // repeated moves walk an item to the end and stop
  let t = s;
  for (let i = 0; i < 5; i++) t = B.moveExercise(t, ids(t).split(',').indexOf('a'), 1);
  check('A: walking a down stops at the end', ids(t) === 'b,c,a');
}

/* ---- B. data preserved exactly ---- */
{
  const s = sess([ex('a'), ex('b'), ex('c')]);
  const before = J(s.exercises);
  const t = B.moveExercise(B.moveExercise(s, 2, -1), 0, 1);
  const byId = x => Object.fromEntries(x.exercises.map(e => [e.exId, J(e)]));
  const was = Object.fromEntries(JSON.parse(before).map(e => [e.exId, J(e)]));
  const now = byId(t);
  check('B: every exercise is byte-identical after moves (sets, rir, dp, tl, warm-ups, note)',
    Object.keys(was).every(k => was[k] === now[k]));
  check('B: moved exercises are the same objects, not copies',
    t.exercises.every(e => s.exercises.includes(e)));
  check('B: same count', t.exercises.length === 3);
}

/* ---- C. within a block ---- */
{
  const s = sess([ex('a', 1), ex('b', 1), ex('c', 1), ex('x')], [1]);
  check('C: first of block cannot move up (stays in block)', !B.canMoveExercise(s, 0, -1));
  check('C: last of block cannot move down (stays in block)', !B.canMoveExercise(s, 2, 1));
  const t = B.moveExercise(s, 1, 1);
  check('C: b down inside block -> a,c,b,x', ids(t) === 'a,c,b,x');
  check('C: block membership unchanged', blk(t) === '1,1,1,0');
  check('C: blocks array is [1]', J(t.blocks) === '[1]');
  check('C: the block stays contiguous', B.sessionLayout(t.exercises, t.blocks).map(r => r.kind).join() === 'block,ex');
}

/* ---- D. across blocks and rows ---- */
{
  // x, [1: a b], y, [2: c d], z
  const s = sess([ex('x'), ex('a', 1), ex('b', 1), ex('y'), ex('c', 2), ex('d', 2), ex('z')], [1, 2]);
  const t1 = B.moveExercise(s, 0, 1); // x hops the whole of block 1
  check('D: ungrouped x down hops a whole block -> a,b,x,y,...', ids(t1) === 'a,b,x,y,c,d,z', ids(t1));
  check('D: x stays ungrouped, block still intact', blk(t1) === '1,1,0,0,2,2,0');
  const t2 = B.moveExercise(s, 3, -1); // y up hops block 1
  check('D: ungrouped y up hops block 1 -> x,y,a,b,...', ids(t2) === 'x,y,a,b,c,d,z' && blk(t2) === '0,0,1,1,2,2,0');
  const t3 = B.moveBlock(s, 1, 1); // block 1 down past y
  check('D: block 1 down past y -> x,y,a,b', ids(t3) === 'x,y,a,b,c,d,z' && blk(t3) === '0,0,1,1,2,2,0');
  const t4 = B.moveBlock(B.moveBlock(s, 2, -1), 1, 1);
  check('D: block 2 up past y then ... renumbers 1..N by position',
    J(B.blockOrder(t4.exercises)) === '[1,2]' && J(t4.blocks) === '[1,2]');
  const t5 = B.moveBlock(sess([ex('a', 1), ex('b', 2)], [1, 2]), 2, -1);
  check('D: swapping two adjacent blocks renumbers (old 2 becomes 1)',
    ids(t5) === 'b,a' && blk(t5) === '1,2' && J(t5.blocks) === '[1,2]');
  check('D: block 1 is not first row, so it can move up', B.canMoveBlock(s, 1, -1));
  const edge = sess([ex('a', 1), ex('b', 2)], [1, 2]);
  check('D: first block cannot move up', !B.canMoveBlock(edge, 1, -1));
  check('D: last block cannot move down', !B.canMoveBlock(edge, 2, 1));
  check('D: unknown block is a no-op', B.moveBlock(edge, 9, 1).exercises === edge.exercises);
  // data carried through block moves
  check('D: a block move carries every exercise exactly',
    t3.exercises.every(e => s.exercises.some(o => J({ ...o, block: 0 }) === J({ ...e, block: 0 }))));
  // exercise inside a block never crosses into the next block
  const u = sess([ex('a', 1), ex('b', 1), ex('c', 2)], [1, 2]);
  check('D: last of block 1 cannot move down into block 2', !B.canMoveExercise(u, 1, 1));
  check('D: first of block 2 cannot move up into block 1', !B.canMoveExercise(u, 2, -1));
}

/* ---- E. empty blocks and a block-less session ---- */
{
  const s = sess([ex('a'), ex('b')], [1]); // block 1 exists but is empty
  const t = B.moveExercise(s, 1, -1);
  check('E: an empty block is kept through a move', J(t.blocks) === '[1]' && ids(t) === 'b,a');
  check('E: an empty block has no move', !B.canMoveBlock(s, 1, 1) && !B.canMoveBlock(s, 1, -1));
  const plain = sess([ex('a'), ex('b')]);
  check('E: a block-less session stays block-less after a move',
    !('block' in B.moveExercise(plain, 0, 1).exercises[0]) && J(B.moveExercise(plain, 0, 1).blocks) === '[]');
  const rt = { exercises: [ex('a', 1), ex('b', 1)] }; // a stored routine: no blocks array
  check('E: a routine-shaped input (no blocks array) works', ids(B.moveExercise(rt, 0, 1)) === 'b,a');
}

/* ---- F. persisted order survives save / reload ---- */
{
  const s0 = sess([ex('x'), ex('a', 1), ex('b', 1), ex('y')], [1]);
  const moved = B.moveExercise(B.moveExercise(s0, 3, -1), 2, 1); // y hops block; b down in block
  // A routine is stored as the exercises with `block` annotations, no blocks
  // array (AGENTS.md), through JSON; a record is the same through the database.
  const stored = JSON.parse(J({ name: 'R', exercises: moved.exercises }));
  check('F: the stored routine carries no blocks key', !('blocks' in stored));
  check('F: reloaded order equals saved order', ids(stored) === ids(moved));
  check('F: reloaded data equals saved data', J(stored.exercises) === J(moved.exercises));
  check('F: blocks reconstruct from the annotations', J(B.sessionBlocks(stored)) === J(moved.blocks));
  const again = B.moveExercise(stored, 0, 1);
  check('F: a reloaded routine can be reordered again', ids(again) !== ids(stored));
  // the live session's localStorage copy keeps blocks too
  const ls = JSON.parse(J(moved));
  check('F: a live session restored from localStorage is identical', J(ls) === J(moved));
  // moving back restores the original order (a move is its own inverse)
  const inv = B.moveExercise(B.moveExercise(s0, 1, 1), 2, -1);
  check('F: down then up is the identity', J(inv.exercises) === J(s0.exercises));
}

/* ---- G. wiring: the screens go through the model ---- */
{
  const W = src('workout.js'), R = src('routines.js'), U = src('ui.js'), C = src('rack.css');
  check('G: workout.js moves exercises through moveExercise', /commitBlocks\(moveExercise\(session, exIdx, dir\)\)/.test(W));
  check('G: workout.js moves blocks through moveBlock', /commitBlocks\(moveBlock\(session, n, dir\)\)/.test(W));
  check('G: routine editor moves exercises through moveExercise', /commit\(moveExercise\(draft, xi, dir\)\)/.test(R));
  check('G: routine editor moves blocks through moveBlock', /commit\(moveBlock\(draft, n, dir\)\)/.test(R));
  check('G: the buttons are labelled for screen readers', /'Move ' \+ what \+ ' ' \+ word/.test(U));
  check('G: each move button is at least 44px square',
    /\.mv-btn \{[^}]*width: 44px[^}]*height: 44px/.test(C) && /\.mv-btn \{[^}]*min-height: 44px/.test(C));
  check('G: the model is the only place order is computed (no splice-based move in the screens)',
    !/moveEx\w*\s*=\s*\(/.test(W) && !/moveEx\w*\s*=\s*\(/.test(R));
}

console.log('\nreordering exercises — a permutation of what is already stored\n');
console.log(out.join('\n'));
console.log('\n' + pass + ' passed, ' + fail + ' failed\n');
process.exit(fail ? 1 : 0);
