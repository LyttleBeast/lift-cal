// Track 5: assemble research/05-typography.md = _05-body.md + a Sources section built from what was actually opened.
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
const RF = '/Users/micahflunker/dev/vibes-night/research/fonts';
const body = readFileSync(`${RF}/_05-body.md`, 'utf8').trimEnd();
const web = [
  'https://openfontlicense.org/ofl-faq/',
  'https://www.925studios.co/blog/ai-slop-design-tells',
  'https://www.theadpharm.com/insights/claude-design-without-the-ai-slop-look',
  'https://www.developersdigest.tech/blog/ai-design-slop-and-how-to-spot-it',
  'https://developer.mozilla.org/en-US/docs/Web/CSS/@font-face/size-adjust',
  'https://developer.mozilla.org/en-US/docs/Web/CSS/@font-face/ascent-override',
  'https://developer.mozilla.org/en-US/docs/Web/CSS/@font-face/font-weight',
  'https://developer.mozilla.org/en-US/docs/Web/CSS/font-variation-settings',
  'https://developer.mozilla.org/en-US/docs/Web/CSS/font-variant-numeric',
  'https://developer.mozilla.org/en-US/docs/Web/CSS/font-synthesis',
  'https://caniuse.com/mdn-css_at-rules_font-face_ascent-override',
  'https://caniuse.com/mdn-css_at-rules_font-face_size-adjust',
  'https://reactnative.dev/docs/text-style-props',
  'https://docs.expo.dev/develop/user-interface/fonts/',
  'https://github.com/expo/expo/issues/50557',
  'https://en.wikipedia.org/wiki/Clarendon_(typeface)',
  'https://en.wikipedia.org/wiki/Alternate_Gothic',
  'https://en.wikipedia.org/wiki/Didone_(typography)',
  'https://developers.google.com/fonts/docs/css2',
  'https://developer.apple.com/design/human-interface-guidelines/typography (opened; body did not render, nothing used)',
];
const direct = [
  'https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,300..900&display=swap',
  'https://fonts.googleapis.com/css2?family=Archivo:wght@400;700',
  'https://fonts.googleapis.com/css2?family=Besley:wght@900&family=League+Gothic:wdth@75&family=Sofia+Sans:wght@800',
  'https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@75,800;125,800&family=Saira:wdth,wght@75,700',
  'https://fonts.gstatic.com/s/archivo/v25/k3k6o8UDI-1M0wlSV9XAw6lQkqWY8Q82sJaRE-NWIDdgffTTNDNp8A.ttf',
  'https://fonts.gstatic.com/s/archivo/v25/k3k6o8UDI-1M0wlSV9XAw6lQkqWY8Q9osJaRE-NWIDdgffTTtDRp8A.ttf',
  'https://fonts.gstatic.com/s/besley/v22/PlIhFlO1MaNwaNGWUC92IOH_mtG4fR_GSdQ.ttf',
  'https://fonts.gstatic.com/s/sofiasans/v20/Yq6E-LCVXSLy9uPBwlAThu1SY8Cx8rlT69D6t63t.ttf',
  'https://fonts.gstatic.com/s/leaguegothic/v13/qFdR35CBi4tvBz81xy7WG7ep-BQAY7Krj7feOboZ_-am.ttf',
  'https://github.com/indestructible-type/Besley/raw/HEAD/fonts/ttf/Besley-Black.ttf (→ raw.githubusercontent.com/indestructible-type/Besley/99d5b97fcb863c4a667571ac8f86f745c345d3ab/…)',
  'https://github.com/indestructible-type/Besley/raw/HEAD/fonts/ttf/Besley-ExtraBold.ttf',
  'https://github.com/indestructible-type/Besley/raw/HEAD/fonts/ttf/BesleyCondensed-Black.ttf',
  'https://github.com/indestructible-type/Besley/raw/HEAD/fonts/variable/Besley%5Bwdth,wght%5D.ttf',
  'https://github.com/indestructible-type/Besley/raw/HEAD/OFL.txt',
];
const trees = { besley: 'indestructible-type/Besley', saira: 'Omnibus-Type/Saira', 'sofia-sans': 'lettersoup/Sofia-Sans', 'schibsted-grotesk': 'schibsted/schibsted-grotesk',
  overpass: 'RedHatOfficial/Overpass', 'league-gothic': 'theleagueof/league-gothic', bodoni: 'indestructible-type/Bodoni', 'libre-caslon': 'thundernixon/Libre-Caslon',
  doto: 'oliverlalan/Doto', handjet: 'rosettatype/handjet', 'atkinson-hyperlegible-next': 'googlefonts/atkinson-hyperlegible-next', 'national-park': 'benhoepner/National-Park',
  chivo: 'Omnibus-Type/Chivo', vollkorn: 'FAlthausen/Vollkorn-Typeface', big_shoulders: 'xotypeco/big_shoulders', caveat: 'googlefonts/caveat', 'martian-mono': 'evilmartians/mono',
  alumni: 'googlefonts/alumni', 'source-serif': 'adobe-fonts/source-serif', 'league-gothic-sursly': 'sursly/league-gothic' };
// batch downloads, from the fetch log
const log = readFileSync(`${RF}/_fetchlog.jsonl`, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
const gf = new Map(), other = [], failed = [];
for (const r of log) {
  const u = r.url;
  if (r.failed || (r.status && r.status >= 400)) { failed.push(`${u} (HTTP ${r.status || '?'})`); continue; }
  const m = u.match(/^https:\/\/raw\.githubusercontent\.com\/google\/fonts\/main\/(ofl|apache)\/([^/]+)\/(.+)$/);
  if (m) { const k = `${m[1]}/${m[2]}`; if (!gf.has(k)) gf.set(k, new Set()); gf.get(k).add(m[3]); }
  else other.push(`${u}${r.finalUrl && r.finalUrl !== u ? ` (→ ${r.finalUrl})` : ''}`);
}
// DESCRIPTION / ARTICLE files fetched by t5-desc.mjs
for (const d of readdirSync(RF)) {
  if (d.startsWith('_') || !statSync(`${RF}/${d}`).isDirectory()) continue;
  const k = `ofl/${d}`;
  const add = f => { if (!gf.has(k)) gf.set(k, new Set()); gf.get(k).add(f); };
  if (existsSync(`${RF}/${d}/DESCRIPTION.en_us.html`)) add('DESCRIPTION.en_us.html');
  if (existsSync(`${RF}/${d}/ARTICLE.en_us.html`)) { add('article/ARTICLE.en_us.html'); failed.push(`https://raw.githubusercontent.com/google/fonts/main/ofl/${d}/DESCRIPTION.en_us.html (HTTP 404, then article/ARTICLE.en_us.html)`); }
}
let s = '\n\n---\n\n## Sources\n\nEvery URL opened for this track. Search-result snippets are not listed. `research/fonts/_fetchlog.jsonl` holds each batch download with its final URL, size and sha256.\n\n';
s += '### Pages read (WebFetch)\n\n' + web.map(u => `- ${u}`).join('\n') + '\n\n';
s += '### Downloaded with `tools/fetch.mjs`: Google Fonts API, gstatic, upstream Besley\n\n' + direct.map(u => `- ${u}`).join('\n') + '\n\n';
s += '### GitHub repo trees (API, via `tools/fetch.mjs`)\n\n' + Object.values(trees).map(r => `- https://api.github.com/repos/${r}/git/trees/HEAD?recursive=1`).join('\n') + '\n\n';
s += '### Upstream licences and static TTFs (via `tools/fetch.mjs`)\n\n' + other.map(u => `- ${u}`).join('\n') + '\n\n';
s += '### google/fonts files (base `https://raw.githubusercontent.com/google/fonts/main/`; brackets and commas URL-encoded)\n\n';
for (const [k, set] of [...gf.entries()].sort()) s += `- \`${k}/\`: ${[...set].sort().join(' · ')}\n`;
s += '\n### Requested but not found (404: the family is not under `ofl/`, or the file does not exist)\n\n' + [...new Set(failed)].map(u => `- ${u}`).join('\n') + '\n';
writeFileSync('/Users/micahflunker/dev/vibes-night/research/05-typography.md', body + s);
console.log('written', (body + s).length, 'chars;', gf.size, 'google/fonts dirs;', other.length, 'upstream;', failed.length, 'failed');
