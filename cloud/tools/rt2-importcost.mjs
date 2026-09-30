// Time evaluating the engine's new boot-path modules (vibe defs, icons) under node. Read-only.
const E = '/Users/micahflunker/dev/vibes-night/wt/nat-engine/src/pure/vibes/';
const t0 = performance.now();
await import(E + 'defs/index.js');
const t1 = performance.now();
await import(E + 'defs/v1.js');
const t2 = performance.now();
await import(E + 'icons/v1.js');
const t3 = performance.now();
console.log('defs/index.js ' + (t1 - t0).toFixed(2) + ' ms, defs/v1.js ' + (t2 - t1).toFixed(2) + ' ms, icons/v1.js ' + (t3 - t2).toFixed(2) + ' ms (node, first import incl. parse)');
