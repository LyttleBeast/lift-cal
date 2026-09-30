#!/usr/bin/env node
// Review helper: which custom properties the Vibes tile rules spend, and
// whether each is one the tile sets inline (vibes-sheet.js PROPS) or one it
// inherits from <html> (the vibe worn). Also: rack.css :root custom
// properties defined in terms of other custom properties (derived at :root,
// inherited as computed values, so a tile's inline token cannot reach them).
import { readFileSync } from 'node:fs';
const WT = process.argv[2] || '/Users/micahflunker/dev/vibes-night/wt/web-settings';
const IDX = await import(WT + '/vibes/defs/index.js');
const PROPS = IDX.ROLES.filter(r => typeof r.web === 'string' && r.web.startsWith('--') && !r.fixed).map(r => r.web);
const FIXED = IDX.ROLES.filter(r => typeof r.web === 'string' && r.web.startsWith('--') && r.fixed).map(r => r.web);
const css = readFileSync(WT + '/rack.css', 'utf8');
const at = css.indexOf('/* ---------- Look → Vibes');
const mine = css.slice(at).replace(/\/\*[\s\S]*?\*\//g, '');
const rules = [...mine.matchAll(/([^{}]+)\{([^}]*)\}/g)].map(m => [m[1].trim(), m[2]]);
for (const [sel, body] of rules) {
  const vars = [...body.matchAll(/var\((--[\w-]+)/g)].map(m => m[1]);
  if (!vars.length) continue;
  const inside = /\.vibe-(in|sample|thumb|num|accent|words|name|feel|exp|check)\b/.test(sel);
  console.log((inside ? 'IN TILE  ' : 'CHROME   ') + sel.padEnd(44) + vars.map(v => v + (PROPS.includes(v) ? '[inline]' : FIXED.includes(v) ? '[fixed, inherited]' : '[NOT A ROLE, inherited]')).join(' '));
}
const root = css.slice(0, css.indexOf('}', css.indexOf(':root')) + 1);
const derived = [...root.matchAll(/(--[\w-]+)\s*:\s*([^;]*var\(--[^;]*);/g)].map(m => m[1] + ': ' + m[2].trim());
console.log('\nrack.css :root custom properties defined through var(): ' + (derived.length ? '\n  ' + derived.join('\n  ') : 'none'));
console.log('\nroles set inline on a tile: ' + PROPS.length + '; fixed roles: ' + FIXED.join(' '));
