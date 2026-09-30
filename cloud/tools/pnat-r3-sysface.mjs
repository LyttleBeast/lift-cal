// Round-3: the sentinel definition plus a system face, so every Text that takes
// T.systemFace draws 'Zz_SysFace'. Writes sentinel-sys-def.json beside the other.
import { readFileSync, writeFileSync } from 'node:fs';
const DIR = '/Users/micahflunker/dev/vibes-night/tmp/pnat-r3/sent';
const d = JSON.parse(readFileSync(DIR + '/sentinel-def.json', 'utf8'));
d.chrome.systemFace = 'Zz_SysFace';
writeFileSync(DIR + '/sentinel-sys-def.json', JSON.stringify(d, null, 1));
console.log('ok');
