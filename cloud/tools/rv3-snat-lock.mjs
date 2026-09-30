// rv3-snat-lock — the settings .write in each rule file, read-only.
import { readFileSync } from 'node:fs';
const files = {
  'live (ship-v59) database.rules.json': '/Users/micahflunker/dev/ship-v59/database.rules.json',
  'live (ship-v59) OPTIONAL-LOCK': '/Users/micahflunker/dev/ship-v59/database.rules.OPTIONAL-LOCK.json',
  'proposed OPTIONAL-LOCK (nat-settings)': '/Users/micahflunker/dev/vibes-night/wt/nat-settings/web-patches/database.rules.PROPOSED.OPTIONAL-LOCK.json'
};
for (const [k, f] of Object.entries(files)) {
  const j = JSON.parse(readFileSync(f, 'utf8'));
  const u = j.rules.users.$uid;
  console.log(k + '\n  users/$uid .write: ' + JSON.stringify(u['.write'] || null).slice(0, 300) + '\n  settings .write: ' + JSON.stringify(u.settings['.write']).slice(0, 400));
}
