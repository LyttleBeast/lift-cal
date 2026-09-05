// AI food estimator — the client half.
//
// The app holds no API key. It sends the photo (or the sentence) to the Worker
// in worker/src/index.js along with the Firebase ID token it already has from
// signing in, and the Worker decides whether to spend anything. Everything here
// is about making that round trip cheap and the failures readable.
//
// Cheap matters more than it looks. Claude charges by the 28×28 patch, so an
// untouched 12-megapixel iPhone photo costs roughly twenty times what the same
// plate costs at 1024 px — and reads no better, because a bowl of rice does not
// get more legible past a certain resolution. Every photo is shrunk here,
// before it ever leaves the phone.

import { idToken, LS } from './store.js';
import { AI_PROXY_URL } from './ai-config.js';

const MAX_EDGE   = 1024;     // long edge in px. ~1370 visual tokens, ~$0.003.
const QUALITY    = 0.72;     // JPEG quality to start at
const MAX_B64    = 900000;   // must match the Worker's ceiling
const MIN_QUALITY = 0.4;

/* ---------- where the Worker lives ---------- */

export function proxyUrl() {
  const override = LS.get('aiProxy', '');
  return String(override || AI_PROXY_URL || '').trim().replace(/\/+$/, '');
}
export function setProxyUrl(u) {
  LS.set('aiProxy', String(u || '').trim().replace(/\/+$/, ''));
}
export function hasProxy() { return !!proxyUrl(); }

/* ---------- errors ----------
   Every failure that reaches the UI carries a sentence a person can act on.
   `code` is for us; `message` is what goes on screen. */
export class AiError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}

const NO_PROXY = () => new AiError('no_proxy',
  'The AI estimator isn’t connected yet — add your Worker URL in ⚙ Settings › AI estimator.');

/* ---------- shrink ----------
   Draw through a canvas rather than uploading the file: it resizes, strips the
   EXIF block (which carries the GPS coordinates of wherever you ate), and
   re-encodes as JPEG in one step. Quality steps down until it fits the ceiling
   so a wide panorama can't blow the size limit. */
function loadImage(file) {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload  = () => { URL.revokeObjectURL(url); res(img); };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new AiError('bad_image', 'Couldn’t read that picture.')); };
    img.src = url;
  });
}

export async function shrinkImage(file) {
  if (!file || !/^image\//.test(file.type || '')) {
    throw new AiError('bad_image', 'That file isn’t a picture.');
  }
  const img = await loadImage(file);
  const w0 = img.naturalWidth || img.width;
  const h0 = img.naturalHeight || img.height;
  if (!w0 || !h0) throw new AiError('bad_image', 'Couldn’t read that picture.');

  const scale = Math.min(1, MAX_EDGE / Math.max(w0, h0));
  const w = Math.max(1, Math.round(w0 * scale));
  const h = Math.max(1, Math.round(h0 * scale));

  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const cx = cv.getContext('2d');
  cx.drawImage(img, 0, 0, w, h);

  let q = QUALITY;
  let url = cv.toDataURL('image/jpeg', q);
  while (url.length > MAX_B64 && q > MIN_QUALITY) {
    q = Math.max(MIN_QUALITY, q - 0.12);
    url = cv.toDataURL('image/jpeg', q);
  }
  if (url.length > MAX_B64) throw new AiError('too_large', 'That picture is too big even shrunk. Try another.');

  const data = url.slice(url.indexOf(',') + 1);
  return {
    dataUrl: url,                 // for the on-screen preview
    media_type: 'image/jpeg',
    data,                         // what goes to the Worker
    w, h,
    kb: Math.round(data.length * 0.75 / 1024)
  };
}

/* ---------- the call ---------- */

async function call(path, init) {
  const base = proxyUrl();
  if (!base) throw NO_PROXY();

  const tok = await idToken();
  if (!tok) throw new AiError('no_auth', 'Your session expired — sign in again.');

  let r;
  try {
    r = await fetch(base + path, {
      ...init,
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + tok, ...(init && init.headers) }
    });
  } catch {
    throw new AiError('offline', 'Couldn’t reach the estimator — check your connection.');
  }

  let j = null;
  try { j = await r.json(); } catch {}

  if (!r.ok || !j || j.ok !== true) {
    const code = (j && j.error) || ('http_' + r.status);
    const msg  = (j && j.message) ||
      (r.status === 404 ? 'That Worker URL doesn’t answer — check it in ⚙ Settings.'
                        : 'The estimator failed (' + r.status + ').');
    throw new AiError(code, msg);
  }
  return j;
}

/* Photo, with an optional sentence of context. The sentence is worth a lot —
   it is what turns "some kind of beef bowl" into the right cut and the right
   rice. */
export function estimatePhoto(shot, text) {
  return call('/estimate', {
    method: 'POST',
    body: JSON.stringify({
      mode: 'photo',
      image: { media_type: shot.media_type, data: shot.data },
      text: (text || '').slice(0, 600)
    })
  });
}

/* Words only. Cheaper than a photo for anything you cooked yourself, and
   usually the better answer for it too. Naming a brand or a chain costs more
   than that — the Worker looks the official numbers up rather than recalling
   them — and takes longer, which is what the estimating screen is warning
   about. Worth it: recalled menu macros are confidently wrong. */
export function estimateText(text) {
  return call('/estimate', {
    method: 'POST',
    body: JSON.stringify({ mode: 'text', text: (text || '').slice(0, 600) })
  });
}

/* What the setup screen shows: is it wired up, and how much is left today. */
export function quota() {
  return call('/quota', { method: 'GET' });
}
