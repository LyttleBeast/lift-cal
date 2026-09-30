// cloud-harness-setup.mjs — the v1 proof harness on a Linux cloud box running Node 22.
// Node 22's WebSocket drops the socket on a CDP message of ~16MB, and prove.mjs's
// __cap.dump() of a big scene (the fixture) is that big, so every scene came back
// "CDP socket closed" and the next boot hung. This copies report/btn-44 to
// /tmp/h/report/btn-44 (outside both trees, so its own output guard still passes)
// and reads those two results in 1.5MB slices instead: transport only, the same
// bytes come back. Run the copy, never the repo's file:
//   node cloud/tools/cloud-harness-setup.mjs
//   HARNESS_HOME=/tmp/vibes-night CHROME=/opt/pw-browsers/chromium-1194/chrome-linux/chrome \
//     node /tmp/h/report/btn-44/prove.mjs --a /tmp/base-web --b <tree> --expect-vibe 200,200 \
//       --run <name> --chrome-flags=--no-sandbox        (add --data-vibe v1 for the P gate)
// (--no-sandbox: Chromium as root. fit/shoot work from the repo's own copy; they send no big messages.)
import { cpSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
const DST = '/tmp/h/report/btn-44';
rmSync(DST, { recursive: true, force: true });
cpSync(new URL('../../report/btn-44', import.meta.url).pathname, DST, { recursive: true });
const sub = (file, a, b) => {
  const s = readFileSync(DST + '/' + file, 'utf8');
  if (!s.includes(a)) throw new Error(file + ': anchor not found: ' + a.slice(0, 60));
  writeFileSync(DST + '/' + file, s.replace(a, b));
};
const EV = '  // Runtime.evaluate with a wall-clock timeout, returning the value.\n';
sub('harness-lib.mjs', EV, `  // Transport only (Node 22's WebSocket drops the socket on a ~16MB CDP message): the same value, read in slices.
  async evBig(expr, timeout = 20000) {
    const n = await this.ev(\`(async () => { const v = await (\${expr}); window.__big = typeof v === 'string' ? v : JSON.stringify(v); return window.__big.length; })()\`, timeout);
    let out = '';
    for (let i = 0; i < n; i += 1500000) out += await this.ev(\`window.__big.slice(\${i}, \${i + 1500000})\`, timeout);
    await this.ev('delete window.__big');
    return out;
  }
` + EV);
sub('prove.mjs', "hashDump(JSON.parse(await c.ev('__cap.dump()', 180000)))", "hashDump(JSON.parse(await c.evBig('__cap.dump()', 180000)))");
sub('prove.mjs', "states[kind] = await c.ev('__cap.quiet(); __cap.stateDump(' + JSON.stringify([...p.force, ...p.subj]) + ', ' + STATE_K + ')', 60000);",
  "states[kind] = JSON.parse(await c.evBig('(__cap.quiet(), __cap.stateDump(' + JSON.stringify([...p.force, ...p.subj]) + ', ' + STATE_K + '))', 60000));");
console.log('patched copy at ' + DST);
