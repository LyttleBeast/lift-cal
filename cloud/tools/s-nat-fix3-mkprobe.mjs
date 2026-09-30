// S (native) fixer round 3: make s-nat-fix3-probe.mjs, a copy of the reviewer's rv3-snat-probe.mjs
// with ONE change. Its inApp() signed in and waited for the root layout to put the vibe on; the
// fix makes the (app) layout open the app (appOpened) and put the vibe on after a live sign-in
// (initVibe), and the probe has no (app) layout, so its inApp now plays that part, as
// verify-vibe-setting's does. Everything else is the reviewer's, byte for byte.
import fs from 'node:fs';
const SRC = '/Users/micahflunker/dev/vibes-night/tools/rv3-snat-probe.mjs';
const DST = '/Users/micahflunker/dev/vibes-night/tools/s-nat-fix3-probe.mjs';
const s = fs.readFileSync(SRC, 'utf8');
const from = "  await signIn();\n  await until(() => BARS.length > 0 && V.vibe() === V.resolveVibe(id)";
const to = "  await signIn();\n  await R.act(async () => { if (typeof VA.appOpened === 'function') VA.appOpened(); await VA.initVibe(); });   // fix3: the (app) layout's part\n  await until(() => BARS.length > 0 && V.vibe() === V.resolveVibe(id)";
if (s.split(from).length !== 2) { console.log('the inApp text was not found exactly once'); process.exit(1); }
fs.writeFileSync(DST, s.replace(from, to).replace('rv3-snat-probe — adversarial', 's-nat-fix3-probe (from rv3-snat-probe, inApp plays the (app) layout) — adversarial')
  .replace("process.env.RV3_SNAT_CHILD !== '1'", "process.env.RV3_SNAT_CHILD !== '1'"));
console.log('wrote ' + DST);
