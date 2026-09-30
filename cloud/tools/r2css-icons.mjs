// Pweb round-2 review: iconHtml()/icon() output vs the literal markup rack-v58
// wrote at each site. Minimal DOM stub records createElementNS/setAttribute
// order and innerHTML so icon() can be compared with the base's svgEl builds.
const ENG = process.argv[2];
const vibe = await import(ENG + '/vibe.js');

const base = {
  foodGear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' +
    '<circle cx="12" cy="12" r="3"/>' +
    '<path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>' +
    '</svg>',
  stepsGear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' +
    '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
  youGear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4z"/>' +
    '<path d="M19.5 14.6a1.5 1.5 0 0 0 .3 1.7l.1.1a1.9 1.9 0 1 1-2.7 2.7l-.1-.1a1.5 1.5 0 0 0-2.6 1.1v.2a1.9 1.9 0 1 1-3.8 0v-.1a1.5 1.5 0 0 0-2.6-1.1l-.1.1a1.9 1.9 0 1 1-2.7-2.7l.1-.1a1.5 1.5 0 0 0-1.1-2.6h-.2a1.9 1.9 0 1 1 0-3.8h.1a1.5 1.5 0 0 0 1.1-2.6l-.1-.1a1.9 1.9 0 1 1 2.7-2.7l.1.1a1.5 1.5 0 0 0 2.6-1.1v-.2a1.9 1.9 0 1 1 3.8 0v.1a1.5 1.5 0 0 0 2.6 1.1l.1-.1a1.9 1.9 0 1 1 2.7 2.7l-.1.1a1.5 1.5 0 0 0 1.1 2.6h.2a1.9 1.9 0 1 1 0 3.8h-.1a1.5 1.5 0 0 0-1.4.9z"/>' +
    '</svg>',
  calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' +
    '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
};
const eng = {
  foodGear: vibe.iconHtml('gear'),
  stepsGear: vibe.iconHtml('gear'),
  youGear: vibe.iconHtml('gearYou', { ariaHidden: true }),
  calendar: vibe.iconHtml('calendar'),
};
let bad = 0;
for (const k of Object.keys(base)) {
  const same = base[k] === eng[k];
  if (!same) bad++;
  console.log(k, same ? 'IDENTICAL' : 'DIFFERENT');
  if (!same) { console.log('  A', base[k]); console.log('  B', eng[k]); }
}

// icon(): stub DOM
const log = [];
function mk(tag) {
  const node = { tag, attrs: [], kids: [], html: null,
    setAttribute(k, v) { this.attrs.push([k, String(v)]); },
    appendChild(c) { this.kids.push(c); return c; },
    set innerHTML(h) { this.html = h; }, get innerHTML() { return this.html; } };
  return node;
}
globalThis.document = { createElementNS: (ns, tag) => mk(tag), documentElement: { dataset: {} } };
const ser = n => '<' + n.tag + n.attrs.map(([k, v]) => ' ' + k + '="' + v + '"').join('') + '>' + (n.html != null ? n.html : n.kids.map(ser).join('')) + '</' + n.tag + '>';
// base food.js icon(): svgEl('svg', {viewBox, fill, stroke, 'stroke-width': width||'1.8', linecap, linejoin}) + paths
const ICON_PATHS = {
  plus:    ['M12 5v14', 'M5 12h14'],
  camera:  ['M4 9a2 2 0 0 1 2-2h1.5l1.2-2h6.6l1.2 2H18a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z',
            'M12 16.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4z'],
  pen:     ['M4 20h4L18.5 9.5a2.6 2.6 0 0 0-3.7-3.7L4 16.3z', 'M13.6 7.1l3.7 3.7'],
  barcode: ['M3 6v12', 'M6.5 6v12', 'M10 6v8', 'M13.5 6v12', 'M17 6v8', 'M20.5 6v12'],
  keypad:  ['M4 5h16v14H4z', 'M8 9h.01', 'M12 9h.01', 'M16 9h.01', 'M8 13h.01', 'M12 13h.01', 'M16 13h.01', 'M8.5 17h7'],
  book:    ['M5 5a2 2 0 0 1 2-2h12v18H7a2 2 0 0 1-2-2z', 'M5 17h14'],
  stack:   ['M12 3l8 4.3-8 4.3-8-4.3z', 'M4 11.8L12 16l8-4.2', 'M4 16.2L12 20.5l8-4.3'],
  spark:   ['M12 3.5l1.7 4.6 4.6 1.7-4.6 1.7L12 16.1l-1.7-4.6L5.7 9.8l4.6-1.7z']
};
function baseIcon(name, width) {
  const s = mk('svg');
  for (const [k, v] of Object.entries({ viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': width || '1.8', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' })) s.setAttribute(k, v);
  (ICON_PATHS[name] || []).forEach(d => { const p = mk('path'); p.setAttribute('d', d); s.appendChild(p); });
  return s;
}
for (const name of [...Object.keys(ICON_PATHS), 'nosuch']) for (const w of [undefined, '2.6', 2.6, '2', 1.8]) {
  const a = ser(baseIcon(name, w));
  const b = ser(vibe.icon(name, w ? { stroke: w } : undefined));
  if (a !== b) { bad++; console.log('icon', name, w, 'DIFFERENT'); console.log('  A', a); console.log('  B', b); }
}
// coach marks
function baseMark(inner) {
  const s = mk('svg');
  for (const [k, v] of [['viewBox', '0 0 24 24'], ['fill', 'none'], ['stroke', 'currentColor'], ['stroke-width', '1.9'], ['stroke-linecap', 'round'], ['stroke-linejoin', 'round'], ['aria-hidden', 'true']]) s.setAttribute(k, v);
  s.innerHTML = inner; return s;
}
const marks = {
  bubble: baseMark('<path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9.9 9.9 0 0 1-2.6-.3L3 21l1.4-4.1A8.1 8.1 0 0 1 3 11.5 8.4 8.4 0 0 1 12 3a8.4 8.4 0 0 1 9 8.5z"/>'),
  lock: baseMark('<rect x="4" y="10.5" width="16" height="10" rx="2"/>' + '<path d="M8 10.5V7a4 4 0 0 1 8 0v3.5"/>'),
  unlock: baseMark('<rect x="4" y="10.5" width="16" height="10" rx="2"/>' + '<path d="M8 10.5V7a4 4 0 0 1 7.5-1.9"/>'),
};
for (const [k, n] of Object.entries(marks)) {
  const a = ser(n), b = ser(vibe.icon(k, { ariaHidden: true, innerHTML: true }));
  console.log('mark', k, a === b ? 'IDENTICAL' : 'DIFFERENT');
  if (a !== b) { bad++; console.log('  A', a); console.log('  B', b); }
}
console.log('food icon() cases compared:', Object.keys(ICON_PATHS).length + 1, 'x 5 widths');
console.log(bad ? 'DIFFERENCES ' + bad : 'ALL IDENTICAL');
