// Round-2 review (js lens): custom properties declared OUTSIDE :root (CSS
// rules, inline style attributes, JS setProperty) in base and engine, and
// every var() name each tree reads — so a token the engine introduced cannot
// be shadowed by a local declaration of the same name.
import { readFileSync, readdirSync } from 'node:fs';
const T = { base: '/Users/micahflunker/dev/vibes-night/wt/web-base/', eng: '/Users/micahflunker/dev/vibes-night/wt/web-engine/' };
function scan(dir) {
  const local = [], rootDecl = new Set(), used = new Set();
  for (const f of ['rack.css', 'auth.css']) {
    const src = readFileSync(dir + f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, ' '));
    // walk rules: selector { body }
    const re = /([^{}]+)\{([^{}]*)\}/g; let m;
    for (const m of src.matchAll(re)) {
      const sel = m[1].trim(); const body = m[2];
      for (const d of body.matchAll(/(--[\w-]+)\s*:/g)) {
        if (/^:root$/.test(sel)) rootDecl.add(d[1]); else local.push(f + ' ' + sel.replace(/\s+/g, ' ').slice(-60) + ' => ' + d[1]);
      }
    }
    for (const v of src.matchAll(/var\(\s*(--[\w-]+)/g)) used.add(v[1]);
  }
  for (const f of readdirSync(dir).filter(f => f.endsWith('.js') || f.endsWith('.html'))) {
    const src = readFileSync(dir + f, 'utf8');
    src.split('\n').forEach((l, i) => {
      for (const d of l.matchAll(/setProperty\(\s*['"](--[\w-]+)/g)) local.push(f + ':' + (i + 1) + ' setProperty ' + d[1]);
      for (const d of l.matchAll(/style="[^"]*?(--[\w-]+)\s*:/g)) local.push(f + ':' + (i + 1) + ' style= ' + d[1]);
      for (const d of l.matchAll(/cssText[^;]*?(--[\w-]+)\s*:/g)) local.push(f + ':' + (i + 1) + ' cssText ' + d[1]);
      for (const v of l.matchAll(/var\(\s*(--[\w-]+)/g)) used.add(v[1]);
    });
  }
  return { local, rootDecl, used };
}
const b = scan(T.base), e = scan(T.eng);
console.log('base local declarations:\n  ' + b.local.join('\n  '));
console.log('engine local declarations:\n  ' + e.local.join('\n  '));
const newTokens = [...e.rootDecl].filter(x => !b.rootDecl.has(x));
console.log('new :root tokens (' + newTokens.length + '):', newTokens.join(' '));
const localNames = new Set([...b.local, ...e.local].map(s => s.split(' ').pop()));
console.log('new tokens also declared locally somewhere:', newTokens.filter(t => localNames.has(t)).join(' ') || 'none');
const usedNotRoot = [...e.used].filter(x => !e.rootDecl.has(x));
console.log('engine var() names not in engine :root:', usedNotRoot.join(' '));
const usedNotRootB = [...b.used].filter(x => !b.rootDecl.has(x));
console.log('base var() names not in base :root:', usedNotRootB.join(' '));
