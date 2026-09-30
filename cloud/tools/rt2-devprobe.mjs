// Probe: does React under rn-render print dev warnings (a keyless list) to console.error?
const R = await import('/Users/micahflunker/dev/vibes-night/wt/nat-base/tools/lib/rn-render.mjs');
const { createRoot } = R.React.version ? (await import('node:module')).createRequire('/Users/micahflunker/dev/vibes-night/wt/nat-base/package.json')('react-dom/client') : {};
const box = globalThis.document.createElement('div'); globalThis.document.body.appendChild(box);
const root = createRoot(box);
const list = ['a', 'b'].map(x => R.h('span', null, x));
await R.act(async () => { root.render(R.h('div', null, list)); });
console.log('ERRS after keyless list: ' + R.ERRS.length + ' ' + JSON.stringify(R.ERRS.slice(0, 1)).slice(0, 200));
