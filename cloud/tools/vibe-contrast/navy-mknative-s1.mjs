// navy-mknative-s1.mjs — native.mjs reads colors.rack with a regex over the
// definition's source, and Navy's is a constant (rack: NAVY). Write a copy
// that takes it from the imported module instead. Nothing else changes.
import { readFileSync, writeFileSync } from 'node:fs';
const dir = '/Users/micahflunker/dev/vibes-night/tools/vibe-contrast/';
let s = readFileSync(dir + 'native.mjs', 'utf8');
const from = "const rackHex = (defSrc.match(/\\brack:\\s*'(#[0-9a-fA-F]{3,8})'/) || [])[1];";
if (!s.includes(from)) throw new Error('native.mjs changed: the rack line is not there');
s = s.replace(from, "const rackHex = (await import(join(ROOT, 'src/pure/vibes/defs', (VIBE || 'v1') + '.js'))).default.colors.rack;");
writeFileSync(dir + 'navy-native-s1.mjs', s);
console.log('wrote navy-native-s1.mjs');
