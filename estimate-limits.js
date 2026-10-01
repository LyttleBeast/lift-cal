// What a description may be, how long the app waits for an estimate, and the
// line printed under one.
//
// Pure: it imports nothing and reads no clock, store or screen. It is copied
// into the native tree verbatim (src/pure/estimate-limits.js), like
// estimate-ask.js and estimate-origin.js, so the phone and the browser refuse
// the same text, wait the same time and print the same line.
// tools-check/estimate-limits.mjs drives it, and ai.js through it.

/* ---------- how long a description may be ----------
   600 characters, the Worker's MAX_TEXT. Both apps used to CUT to 600 before
   sending -- `(text || '').slice(0, 600)` -- and the Worker cut again, so the
   Worker could never see that anything was missing and nobody was told. The
   tail of a long day simply never reached the estimator, the logged total came
   out short, and a cut inside the last item priced what was left of it
   ("…250g chicken" for "250g chicken breast, and a large apple"). P7 audit
   CL-02 / C4-01 / F2-04.

   Now it is REFUSED, never cut: the box counts as it fills, Estimate says so
   instead of sending, and ai.js refuses before any request as the backstop.

   Counted the way the Worker counts: the TRIMMED string's .length, which is
   UTF-16 code units, so an emoji is two. Deliberately NOT a maxlength on the
   box: a browser -- and React Native's TextInput -- quietly truncates a paste
   to fit maxlength, which is the same silent cut one step earlier. */
export const MAX_DESCRIBE = 600;
export const COUNT_FROM   = 450;   // the counter appears from here; a short note stays quiet

export function describeLength(text) {
  return String(text == null ? '' : text).trim().length;
}

/* What the counter under a box says. `show` is false for anything short, so
   the counter is only on screen when the limit is near enough to matter. */
export function describeCount(text) {
  const n = describeLength(text);
  const over = n > MAX_DESCRIBE;
  return {
    n,
    max: MAX_DESCRIBE,
    over,
    show: over || n >= COUNT_FROM,
    line: n + ' / ' + MAX_DESCRIBE + (over ? ' — ' + (n - MAX_DESCRIBE) + ' over. Split it into two.' : '')
  };
}

export const TOO_LONG = 'That is longer than ' + MAX_DESCRIBE + ' characters, so it was not sent. ' +
                        'Split it into two descriptions.';

/* ---------- how long the app waits ----------
   LONGER THAN THE WORKER CAN TAKE, so the Worker's own answer -- a result, or
   "Claude did not answer in time" with the request already settled -- always
   arrives first. The phone used to give up at 60 s while one request could run
   ~4 minutes: it blamed the connection, threw away an answer that was still
   being paid for, and its "Try again" paid a second time. The browser waited
   forever, behind a busy sheet that cannot be dismissed. P7 audit CL-03 / F2-01.

   THE RULE: WAIT_MS >= the Worker's longest request + 25 s. With the P7 cost
   guard the Worker makes at most two calls of at most 60 s each (a residual
   call and its whole-order fallback; 45 s when a lookup is attached), plus a
   few seconds of KV, so ~125 s. 150 s covers that and a slow upload. When the
   Worker's per-call timeouts or its call count change, this changes with them,
   in the same ship. */
export const WAIT_MS = 150000;

export const TIMED_OUT = 'No answer after two and a half minutes, so Rack stopped waiting. ' +
                         'It may still count as one of today’s estimates.';

/* ---------- the line under an answer ----------
   What is left today, for everyone. The dollar figure, for the owner only: to
   anybody else "$0.0517 of credit" reads as a charge they are paying (P7 audit
   CL-06; LAUNCH-TEXT-AUDIT §1 #9). A reply whose usage carries no dollar NUMBER
   says nothing about money -- it never prints "$0.0000", which would claim the
   estimate was free. A free answer's real 0 still prints, because it was.

   `res` is a reply, or an error that kept its reply's `usage` and `left`
   (ai.js), so a failed attempt that still used one of today's estimates says
   so. No `usage`, no line -- as before. */
export function costLine(res, owner) {
  if (!res || !res.usage) return '';
  const bits = [];
  const usd = res.usage.usd;
  if (owner && typeof usd === 'number' && isFinite(usd)) bits.push('$' + usd.toFixed(4) + ' of credit');
  const left = res.left;
  if (left && left.day != null) {
    const kind = left.kind === 'photo' ? 'photo' : 'describe';
    bits.push(left.day + ' ' + kind + (left.day === 1 ? '' : 's') + ' left today');
  }
  return bits.join('   ·   ');
}
