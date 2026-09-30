// rv-snat-rules: print the settings block of a rules JSON (reviewer, read-only).
// node rv-snat-rules.mjs <rules.json>
import { readFileSync } from 'node:fs';
const r = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const users = r.rules.users;
const uidKey = Object.keys(users).find(k => k.startsWith('$'));
const s = users[uidKey].settings;
console.log('uid key:', uidKey);
console.log('settings keys:', Object.keys(s));
for (const [k, v] of Object.entries(s)) {
  if (k.startsWith('.')) { console.log(k, '=', JSON.stringify(v)); continue; }
  const ks = v && typeof v === 'object' ? Object.keys(v) : [];
  console.log(k, '->', ks.join(', '), ks.includes('$other') ? ' $other=' + JSON.stringify(v.$other) : '');
}
console.log('vibe:', JSON.stringify(s.vibe));
