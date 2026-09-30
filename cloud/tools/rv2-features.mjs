// Round-2 review (js lens): which newer-than-ES2017 syntax/APIs the engine's
// new browser modules use, against what rack-v58's own browser modules already
// use. A feature only the engine uses would raise the oldest Safari that boots.
import { readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire('/Users/micahflunker/dev/rack-mobile/package.json');
const { parse } = require('@babel/parser');

const BASE = '/Users/micahflunker/dev/vibes-night/wt/web-base/';
const ENG = '/Users/micahflunker/dev/vibes-night/wt/web-engine/';

const API = ['fromEntries', 'globalThis', 'hasOwn', 'at', 'structuredClone', 'replaceAll', 'findLast', 'findLastIndex',
  'toSorted', 'toReversed', 'toSpliced', 'with', 'groupBy', 'allSettled', 'any', 'flatMap', 'flat', 'matchAll', 'trimStart',
  'trimEnd', 'padStart', 'padEnd', 'isFrozen', 'freeze', 'withResolvers', 'hasIndices', 'WeakRef', 'randomUUID', 'canParse'];

function features(file) {
  const src = readFileSync(file, 'utf8');
  const ast = parse(src, { sourceType: 'module', errorRecovery: true, plugins: [] });
  const f = new Set();
  const walk = n => {
    if (!n || typeof n !== 'object') return;
    if (Array.isArray(n)) { n.forEach(walk); return; }
    switch (n.type) {
      case 'OptionalMemberExpression': case 'OptionalCallExpression': f.add('?.'); break;
      case 'LogicalExpression': if (n.operator === '??') f.add('??'); break;
      case 'AssignmentExpression': if (['??=', '||=', '&&='].includes(n.operator)) f.add(n.operator); break;
      case 'ClassProperty': case 'ClassPrivateProperty': f.add('class fields'); break;
      case 'ClassPrivateMethod': case 'PrivateName': f.add('#private'); break;
      case 'StaticBlock': f.add('static block'); break;
      case 'CatchClause': if (!n.param) f.add('optional catch'); break;
      case 'RegExpLiteral':
        if (/\(\?<[=!]/.test(n.pattern)) f.add('regex lookbehind');
        if (/\(\?<[A-Za-z]/.test(n.pattern)) f.add('regex named group');
        if (n.flags.includes('s')) f.add('regex s flag');
        if (n.flags.includes('v')) f.add('regex v flag');
        if (n.flags.includes('d')) f.add('regex d flag');
        break;
      case 'BigIntLiteral': f.add('bigint'); break;
      case 'AwaitExpression': break;
      case 'ObjectExpression': if (n.properties.some(p => p.type === 'SpreadElement')) f.add('object spread'); break;
      case 'ObjectPattern': if (n.properties.some(p => p.type === 'RestElement')) f.add('object rest'); break;
      case 'NumericLiteral': if (n.extra && /_/.test(n.extra.raw)) f.add('numeric separator'); break;
      case 'MemberExpression': case 'OptionalMemberExpression':
        if (!n.computed && n.property && API.includes(n.property.name)) f.add('.' + n.property.name); break;
      case 'Identifier': if (['globalThis', 'structuredClone', 'WeakRef', 'queueMicrotask', 'requestIdleCallback'].includes(n.name)) f.add(n.name); break;
    }
    for (const k of Object.keys(n)) if (k !== 'loc' && k !== 'start' && k !== 'end' && k !== 'extra') walk(n[k]);
  };
  walk(ast.program);
  // top-level await
  for (const s of ast.program.body) if (JSON.stringify(s).includes('"AwaitExpression"') && !['FunctionDeclaration', 'ExportNamedDeclaration'].includes(s.type)) {
    // crude; only flags await directly in module scope statements that are not functions
  }
  return f;
}

const js = dir => readdirSync(dir).filter(f => f.endsWith('.js') && f !== 'sw.js').map(f => dir + f);
const baseAll = new Map();
for (const f of js(BASE)) for (const x of features(f)) { if (!baseAll.has(x)) baseAll.set(x, []); baseAll.get(x).push(f.slice(BASE.length)); }
const engFiles = [...js(ENG), ENG + 'vibes/defs/index.js', ENG + 'vibes/defs/v1.js', ENG + 'vibes/icons/v1.js'];
const engAll = new Map();
for (const f of engFiles) for (const x of features(f)) { if (!engAll.has(x)) engAll.set(x, []); engAll.get(x).push(f.slice(ENG.length)); }
console.log('base features:', [...baseAll.keys()].sort().join(', '));
console.log('engine features:', [...engAll.keys()].sort().join(', '));
for (const [x, files] of engAll) if (!baseAll.has(x)) console.log('ONLY ENGINE:', x, files.join(' '));
for (const x of ['.fromEntries', 'globalThis', 'optional catch', '.flat', '.isFrozen']) console.log(x, 'base:', (baseAll.get(x) || []).join(' ') || '-', '| engine:', (engAll.get(x) || []).join(' '));
