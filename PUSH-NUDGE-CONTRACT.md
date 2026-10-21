# Nudges by phone notification — the contract (written in v68, not built)

v68 ships the nudge as an **in-app** item: a friend taps **Nudge** on your row,
and the next time you open Rack the Friends tab shows *"Bob says you are
slacking off. Get in there."* with a dot on the dock. This file is how a real
phone notification plugs in later **without changing anything that v68
ships**: the nudge node, its rules, its wording and the client code stay
exactly as they are. Push is an extra delivery, added beside them.

It cannot be built yet. iOS delivers web and native push only through
Apple's push service (APNs), and that needs the paid Apple Developer account.
Nothing here should be started until that account exists.

---

## 1. What exists today (v68) and must not change

| Node | Shape | Who writes | Who reads |
|---|---|---|---|
| `social/nudge/{to}/{from}` | `{ v: 0\|1\|2, at: server time }` | `{from}`, a confirmed friend, once a day | `{to}` (the whole box), `{from}` (their own) |
| `social/people/{from}/nudged/{to}` | server time | `{from}`, only in the same write as the nudge, and not again for 24 h | `{from}` |
| `social/people/{to}/nonudge/{from}` | `true` | `{to}` | `{to}` |
| `social/people/{to}/quiet` | `true` | `{to}` | `{to}` |

- The words are `friends-core.js` `NUDGE_LINES[v]` with `{n}` replaced by the
  sender's first name **as the receiver's own list spells it**. No text ever
  travels. A notification must build its text the same way, from `v` and a
  name it looks up. It must never take text from the client.
- One per sender per receiver per day, enforced by the rules on the server's
  clock. Push adds no second sending path, so it cannot add a second nudge.
- The receiver's switches are the only switches. `nonudge/{from}` or `quiet`
  means the write itself is refused, so there is nothing to push.

## 2. Where device tokens live (private)

```
users/{uid}/push/{deviceId}  →  { t, kind, at, v }
```

- `deviceId`: a random id the device makes once and keeps (`[A-Za-z0-9_-]{8,40}`).
- `t`: the token. That is an APNs device token for the native app, or a Web
  Push subscription endpoint plus keys, JSON-encoded, for the PWA (≤ 1000
  chars).
- `kind`: `'apns'` | `'apns-sandbox'` | `'webpush'`.
- `at`: server time of the last refresh. `v`: the build that wrote it
  (`rack-vNN`).

It sits under `users/`, so **no friend can read it**. Only the owner (and the
Worker, with the admin credential it already has for the food estimator's
counters) ever can. A new top-level section under `users/{uid}` needs a rules
change (CLAUDE.md rule 2):

```json
"push": {
  ".write": "auth != null && auth.uid === $uid && (auth.uid === 'aXSDfnZK8IMT9wRVhBbEgkDHpsj2' || root.child('access/approved').child(auth.uid).exists())",
  "$device": {
    ".validate": "$device.matches(/^[A-Za-z0-9_-]{8,40}$/) && newData.hasChildren(['t', 'kind', 'at'])",
    "t":    { ".validate": "newData.isString() && newData.val().length >= 1 && newData.val().length <= 1000" },
    "kind": { ".validate": "newData.val() === 'apns' || newData.val() === 'apns-sandbox' || newData.val() === 'webpush'" },
    "at":   { ".validate": "newData.isNumber() && newData.val() === now" },
    "v":    { ".validate": "newData.isString() && newData.val().matches(/^rack-v[0-9]{1,4}$/)" },
    "$other": { ".validate": false }
  }
}
```

A device deletes its own entry on sign-out and on "Sign out and erase". The
Worker deletes an entry when APNs answers `410 Unregistered`.

## 3. Who sends: one Worker route, triggered by the client after the write

RTDB has no free trigger: Cloud Functions needs the paid Blaze plan, which
the "free only" rule rules out. So the **sender's client** asks the Worker
**after its nudge write has landed**:

```
POST https://<rack worker>/nudge/push
Authorization: Bearer <Firebase ID token of the sender>
Content-Type: application/json

{ "to": "<receiver uid>" }
```

That is the whole body: no text and no variant. The Worker trusts nothing in
it except `to`, and re-reads everything:

1. Verify the ID token (the same check the estimator's routes make), so the sender is `uid`.
2. Read `social/nudge/{to}/{uid}`. It must exist, and its `at` must be
   within the last 2 minutes. That proves the rules accepted a nudge just now,
   which in turn means: friends, under the daily cap, not muted. Otherwise
   `204` and nothing is sent. The rules already decided, so the Worker never
   re-implements them.
3. Read `social/people/{to}/list/{uid}/n` for the name **as the receiver
   knows the sender**, and build `NUDGE_LINES[v]` (a copy of the three strings,
   checked against `friends-core.js` by a verifier in the Worker repo).
4. Read `users/{to}/push/*`, send to each token, and delete any that come back `410`.
5. Idempotency: KV key `np:{to}:{uid}:{at}` with a 2-day TTL. A second call for
   the same nudge is a `204`.

Payload (APNs; Web Push carries the same JSON in `data`):

```json
{
  "aps": { "alert": { "title": "Rack", "body": "Bob says you are slacking off. Get in there." },
           "sound": "default", "thread-id": "nudge", "badge": 1 },
  "rack": { "kind": "nudge", "from": "<sender uid>", "at": 1790000000000 }
}
```

`apns-collapse-id: nudge-<sender uid>`, so a second day's nudge replaces the
first on the lock screen. `apns-push-type: alert`. A tap opens the app on the
Friends tab (`rack.kind === 'nudge'`).

Cost: one Worker request per nudge, capped by the rules at one per friend per
day. That is well inside Cloudflare's free tier. APNs itself is free.

## 4. What the client does now, so nothing changes when push arrives

- `friends-data.js` `sendNudge()` writes `{ v, at }` and the stamp in one
  update, then returns `{ ok: true, v }`. When push exists it adds **one
  line after the write resolves**: a fire-and-forget `POST /nudge/push`
  whose failure is ignored. The in-app nudge has already landed, and push is
  a courtesy on top of it.
- The receiver's app reads `social/nudge/{me}` exactly as today. A push that
  arrives and a nudge already shown in-app are the same record. Dismissing it
  in the app deletes it. The notification needs no state of its own.
- Muting and the per-friend switch already stop the write, so they already
  stop the push. No notification setting has to be added to the rules. The
  phone's own notification permission is the only extra switch, and it lives
  in the OS.
- Nudges expire after 7 days in the app (`NUDGE_TTL`). A notification older
  than that is harmless: tapping it opens a Friends tab with nothing in it.

## 5. Order of work, when the Apple account exists

1. Rules: add `users/{uid}/push` (above) and publish.
2. Native: register for APNs and write `users/{uid}/push/{deviceId}`. The PWA:
   only after iOS Web Push has been tested on Micah's phone in standalone mode.
3. Worker (`~/dev/rack-worker`): the APNs key as a secret, the `/nudge/push`
   route, the KV idempotency key, and a verifier that the three strings match
   `friends-core.js`.
4. Client: the one fire-and-forget call in `sendNudge()`.
5. Check: two phones, friends; one taps Nudge. The other's lock screen shows
   the line, and its Friends tab shows the same nudge. Mute, and nothing
   arrives.
