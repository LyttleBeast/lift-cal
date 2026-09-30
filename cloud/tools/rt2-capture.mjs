/* rt2-capture — a --import preload for the Pnat runtime review, round 2.
 * Captures every console.error / console.warn / console.log call made in the
 * process (rn-render reassigns console.error; the setter below keeps this
 * capture in place and still hands each message to whatever it assigned), and
 * writes them as JSON to process.env.RT2_OUT when the process exits. Read-only
 * with respect to every tree: it only writes RT2_OUT. */
import { writeFileSync } from 'node:fs';
const OUT = process.env.RT2_OUT;
const MSGS = [];
const fmt = a => a.map(x => {
  if (x instanceof Error) return 'Error: ' + x.message;
  if (typeof x === 'string') return x;
  try { return JSON.stringify(x); } catch { return String(x); }
}).join(' ');
for (const k of ['error', 'warn', 'log', 'info']) {
  let inner = console[k].bind(console);
  const mine = (...a) => { MSGS.push({ k, m: fmt(a).slice(0, 1200) }); if (k === 'error' || k === 'warn') return; return inner(...a); };
  Object.defineProperty(console, k, { configurable: true, enumerable: true, get: () => mine, set: v => { inner = v; } });
}
process.on('exit', () => { if (OUT) { try { writeFileSync(OUT, JSON.stringify(MSGS, null, 1)); } catch {} } });
