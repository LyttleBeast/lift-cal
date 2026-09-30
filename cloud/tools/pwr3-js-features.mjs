// pwr3 js-lens reviewer: which newer-JS features the engine's new or changed
// app files use that rack-v58's app files never did (an older iPhone that ran
// v58 would then fail to parse or run v59's module graph).
// Usage: node pwr3-js-features.mjs <baseTree> <engineTree>
import fs from 'node:fs';
import path from 'node:path';

const [B, E] = process.argv.slice(2);
const FEATURES = {
  'optional chaining ?.': /\?\.(?![0-9])/,
  'nullish ??': /\?\?(?!=)/,
  'logical assignment ??= ||= &&=': /(\?\?=|\|\|=|&&=)/,
  'Object.hasOwn': /Object\.hasOwn\b/,
  '.at(': /\.at\(/,
  'structuredClone': /structuredClone/,
  'replaceAll': /\.replaceAll\(/,
  'regex lookbehind': /\(\?<[=!]/,
  'named capture groups': /\(\?<[A-Za-z]/,
  'Object.fromEntries': /Object\.fromEntries/,
  'catch without binding': /catch\s*\{/,
  'class static block': /static\s*\{/,
  'private #field': /#[a-zA-Z_]\w*\s*[=;(]/,
  'findLast': /\.findLast(Index)?\(/,
  'Array.prototype.flat/flatMap': /\.(flat|flatMap)\(/,
  'globalThis': /\bglobalThis\b/,
  'top-level await (import await)': /^await\s/m,
  'numeric separator': /\b\d+_\d+/,
  'BigInt literal': /\b\d+n\b/,
  'Promise.allSettled/any': /Promise\.(allSettled|any)\b/,
  'String.prototype.matchAll': /\.matchAll\(/,
  'toSorted/toReversed/with': /\.(toSorted|toReversed|toSpliced)\(/,
};
const files = t => fs.readdirSync(t).filter(f => f.endsWith('.js')).map(f => path.join(t, f));
const engineFiles = [...files(E), ...['vibes/defs/index.js', 'vibes/defs/v1.js', 'vibes/icons/v1.js'].map(f => path.join(E, f))];
const strip = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"\\])\/\/.*$/gm, '$1');
const useIn = list => {
  const r = {};
  for (const f of list) {
    if (!fs.existsSync(f)) continue;
    const s = strip(fs.readFileSync(f, 'utf8'));
    for (const [k, re] of Object.entries(FEATURES)) if (re.test(s)) (r[k] ||= []).push(path.relative(path.dirname(list[0]), f));
  }
  return r;
};
const base = useIn(files(B).filter(f => !f.includes('report/')));
const eng = useIn(engineFiles);
for (const k of Object.keys(FEATURES)) {
  const b = base[k] || [], e = eng[k] || [];
  if (e.length && !b.length) console.log('NEW IN ENGINE ONLY:', k, e);
  else if (e.length) console.log('both:', k, 'base', b.length, 'files; engine', e.length, 'files; engine new-file users:', e.filter(f => /vibe/.test(f)));
}
