# archive/api-v1 — the June 2026 backend (unused)

This folder is the **June 2026 Vercel-functions backend** that shipped with the
first version of the Pour Decisions app. It is kept for reference only — nothing
on the live site uses it.

## What it was

Serverless functions (one file per route, deployed as Vercel `api/*.js`):

| File | Purpose |
|---|---|
| `orders.js` | Place / list / update pickup orders |
| `loyalty.js` | Pour Pass loyalty (stamps, members) — stored in Redis (`_store.js`) |
| `auth.js` | Phone sign-in via Twilio Verify |
| `pay.js` + `_square.js` | Square payment config / charges |
| `bookings.js`, `events.js` | Event-space booking requests and the public events list |
| `pina.js` | Server side of the Piña chatbot |
| `_store.js` | Redis (ioredis) storage helper shared by the routes |

`SETUP.md` and `ADMIN.md` are the original setup and owner-admin docs for this
backend (env vars, Vercel deploy, admin PIN, endpoint table).

## Why it is archived

The **July 2026 front-end rewrite** (the current `index.html`) is a purely
static PWA hosted on Netlify. It never called any of these routes — orders,
loyalty and sign-in were all replaced by on-device / Netlify-forms flows, so the
backend has been dead code since then.

## If we ever do a "full app" phase

Keep this as the starting point. Before reviving it:

- Swap **Square for Clover** (the shop's actual POS) in `pay.js` / `_square.js`.
- Re-provision Redis, Twilio Verify and the admin PIN (see `SETUP.md`).
- Move it off Vercel to Netlify Functions, or host separately — the live site is
  on Netlify and there is no `vercel.json` / `package.json` at the repo root
  any more.
