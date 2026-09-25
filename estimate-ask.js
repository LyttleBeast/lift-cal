// "Which one?" — the client half of the estimator's ask (v55).
//
// On 24 Sep Micah logged "Panda Express 3.5 teriyaki chicken, side fried
// rice". The fried rice came off the menu; the teriyaki went to the model,
// because Panda publishes two teriyaki chicken rows and the bare phrase could
// be either. Guessing is a wrong number, and paying the model to guess is a
// wrong number that costs money. So a text estimate now says it can take a
// question back (`ask: 1`, ai.js), and when every part of the order the free
// path could not price is one of those phrases, the Worker answers with the
// choices instead: free, and exact once he picks.
//
// THE CONTRACT is copied whole into NEXT-NATIVE-V55.md, and it is word for
// word the one the Worker builds to. This module is the part of the client's
// half that is pure: whether a reply's ask can be drawn at all, where a pick
// goes, and the words on a chip. It imports nothing and reads nothing — no
// clock, no store, no formatting — so the native port copies it verbatim and
// drives it from its own reply. food.js draws the question.

// At most two such segments in one order, and two to four options each.
export const ASKS_MAX = 2;
export const OPTIONS_MIN = 2;
export const OPTIONS_MAX = 4;

// The one chip the client writes whole, and the plain words under it: it
// re-sends the sentence without `ask`, which is today's paid estimate.
export const NONE_LABEL = 'None of these, estimate it';
export const NONE_NOTE = 'Uses one of today’s estimates';

const str = v => (typeof v === 'string' ? v.trim() : '');
const isObj = v => !!v && typeof v === 'object' && !Array.isArray(v);
const num = v => (typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN);

// A row the sheet can show as it shows any other: a name, and calories that
// read as a number. The contract sends it complete, already at the segment's
// quantity; the client never multiplies it and never fills it in.
function rowOk(item) {
  return isObj(item) && !!str(item.name) && Number.isFinite(num(item.cal)) && num(item.cal) >= 0;
}

/* What a reply asks, read.

     { kind: 'none' }           it asks nothing — no `ask` at all. The reply is
                                drawn exactly as a reply always was.
     { kind: 'ask', asks }      every part of it can be drawn.
     { kind: 'bad', why }       it asks, and some part of it cannot be drawn:
                                no options, one option, an option without a
                                row, an `at` that is not a place in the list,
                                more than two asks. NONE of it is drawn — not
                                even the parts that read — and the client goes
                                back to today's path, the sentence re-sent
                                without `ask`, as if it had never been sent.
                                A question with nothing under it is never shown.

   `at` is where the pick goes: the index in `items` it is inserted before,
   with the asks answered in order, so for the k-th ask it is 0 to
   items.length + k, inclusive. */
export function readAsk(res) {
  const r = isObj(res) ? res : {};
  if (r.ask == null) return { kind: 'none' };
  const bad = why => ({ kind: 'bad', why });
  if (!Array.isArray(r.ask) || !r.ask.length) return bad('the ask is not a list of questions');
  if (r.ask.length > ASKS_MAX) return bad('more than ' + ASKS_MAX + ' questions');
  if (!Array.isArray(r.items)) return bad('no items');
  const asks = [];
  for (let k = 0; k < r.ask.length; k++) {
    const a = r.ask[k];
    if (!isObj(a)) return bad('question ' + (k + 1) + ' is not a question');
    const question = str(a.question);
    if (!question) return bad('question ' + (k + 1) + ' has no words');
    const options = Array.isArray(a.options) ? a.options : [];
    if (options.length < OPTIONS_MIN || options.length > OPTIONS_MAX) {
      return bad('question ' + (k + 1) + ' has ' + options.length + (options.length === 1 ? ' option' : ' options'));
    }
    if (!options.every(o => isObj(o) && str(o.label) && rowOk(o.item))) {
      return bad('question ' + (k + 1) + ' has an option without a label or a row');
    }
    if (!Number.isInteger(a.at) || a.at < 0 || a.at > r.items.length + k) {
      return bad('question ' + (k + 1) + ' puts its pick at ' + JSON.stringify(a.at));
    }
    asks.push({ seg: str(a.seg), at: a.at, question,
                options: options.map(o => ({ id: str(o.id), label: str(o.label), item: o.item })) });
  }
  return { kind: 'ask', asks };
}

/* The reply once he has picked: each pick's row put into `items` at its
   `at`, the asks in order, and the question taken off, so the result screen
   reads it as the free answer it now is — every picked row a menu row like
   the rest. `picks` is one option index per ask. Null when a pick is not one
   of its question's options; nothing handed in is changed. */
export function withPicks(res, asks, picks) {
  const r = isObj(res) ? res : {};
  const list = Array.isArray(asks) ? asks : [];
  if (!Array.isArray(picks) || picks.length !== list.length || !list.length) return null;
  const items = (Array.isArray(r.items) ? r.items : []).slice();
  for (let k = 0; k < list.length; k++) {
    const o = Number.isInteger(picks[k]) ? list[k].options[picks[k]] : null;
    if (!o) return null;
    items.splice(list[k].at, 0, { ...o.item });
  }
  const { ask, ...rest } = r;
  return { ...rest, items };
}

/* A chip's words: the option's own label and its row's calories, as the
   result row will show them — `cal` is that row's number through the result
   screen's own formatter, handed in: "Grilled teriyaki chicken · 963 cal". */
export function optionText(label, cal) {
  return str(label) + ' · ' + String(cal) + ' cal';
}
