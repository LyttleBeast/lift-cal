// Iron Age fix round gates-1-rs9: copy the web definition byte for byte into
// the native tree and re-pin its sha256 in tools/verify-vibes-verbatim.mjs.
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const WEB = '/Users/micahflunker/dev/vibes-night/wt/web-v-iron-age/vibes/defs/iron-age.js';
const NAT = '/Users/micahflunker/dev/vibes-night/wt/nat-v-iron-age/src/pure/vibes/defs/iron-age.js';
const PIN = '/Users/micahflunker/dev/vibes-night/wt/nat-v-iron-age/tools/verify-vibes-verbatim.mjs';
const buf = readFileSync(WEB);
writeFileSync(NAT, buf);
const sha = createHash('sha256').update(buf).digest('hex');
const pin = readFileSync(PIN, 'utf8');
const re = /('defs\/iron-age\.js': ')([0-9a-f]{64})(')/;
const old = re.exec(pin)[2];
writeFileSync(PIN, pin.replace(re, `$1${sha}$3`));
console.log('copied', buf.length, 'bytes; pin', old, '->', sha, '; identical:', readFileSync(NAT).equals(buf));
