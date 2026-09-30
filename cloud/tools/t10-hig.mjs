// t10-hig.mjs — track 10 research helper. Downloads an Apple HIG page's DocC JSON
// (through fetch.mjs, so §14's host list applies) and prints its prose as text.
// Usage: node t10-hig.mjs <slug> [filter-regex]
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const [slug, filt] = process.argv.slice(2);
const url = `https://developer.apple.com/tutorials/data/design/human-interface-guidelines/${slug}.json`;
const out = `/Users/micahflunker/dev/vibes-night/research/refs/10/hig-${slug}.json`;
execFileSync('node', ['/Users/micahflunker/dev/vibes-night/tools/fetch.mjs', url, out]);
const j = JSON.parse(readFileSync(out, 'utf8'));
const refs = j.references || {};
function inl(a) {
  return (a || []).map(n => {
    if (n.type === 'text') return n.text;
    if (n.type === 'codeVoice') return '`' + n.code + '`';
    if (n.type === 'strong' || n.type === 'emphasis') return inl(n.inlineContent);
    if (n.type === 'reference') return (refs[n.identifier] && refs[n.identifier].title) || '';
    if (n.type === 'image') return '[image]';
    return inl(n.inlineContent);
  }).join('');
}
const lines = [];
function walk(nodes, depth = 0) {
  for (const n of nodes || []) {
    if (n.type === 'heading') lines.push('\n## ' + n.text);
    else if (n.type === 'paragraph') lines.push(inl(n.inlineContent));
    else if (n.type === 'unorderedList' || n.type === 'orderedList') for (const it of n.items) { const before = lines.length; walk(it.content, depth + 1); if (lines.length > before) lines[before] = '- ' + lines[before]; }
    else if (n.type === 'table') for (const r of n.rows) lines.push('| ' + r.map(c => c.map(p => inl(p.inlineContent)).join(' ')).join(' | ') + ' |');
    else if (n.type === 'aside') { lines.push('> ' + (n.name || n.style) + ':'); walk(n.content, depth + 1); }
    else if (n.type === 'row') for (const c of n.columns) walk(c.content, depth);
    else if (n.type === 'tabNavigator') for (const t of n.tabs) { lines.push('[tab ' + t.title + ']'); walk(t.content, depth); }
    else if (n.content) walk(n.content, depth);
  }
}
for (const s of j.primaryContentSections || []) walk(s.content);
let text = lines.join('\n');
if (filt) {
  const re = new RegExp(filt, 'i');
  text = lines.filter(l => re.test(l) || l.startsWith('\n## ')).join('\n');
}
console.log(text);
