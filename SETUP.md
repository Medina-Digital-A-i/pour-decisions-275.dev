# Pour Decisions — Go-Live Setup (for Phebe)

This is the checklist to make the app **actually store and sync data** for the whole
team. The app code is **done and deployed-ready** — these steps connect it to a
database, texting, and (later) payments. Everything here is done in **dashboards**
(Vercel / Upstash / Twilio / Square) because it needs account logins and secret
keys that the developer tooling can't and shouldn't touch.

---

## 1. Where the information is saved & how it's accessed

- **Database:** a tiny cloud key-value store (**Vercel KV**, powered by Upstash Redis).
  Free tier is plenty for a juice bar. Everything lives here:
  | Data | Key in the store | Who sees it |
  |---|---|---|
  | Customers + Pour Pass stamps | `pd:customers` | Owner dashboard (all) · each customer sees their own |
  | Orders | `pd:orders` | Owner dashboard |
  | Bookings ("book the space") | `pd:bookings` | Owner dashboard |
  | Events | `pd:events` | Owner dashboard (edit) · public calendar (view) |
  | Login codes / sessions | `pd:authcode:*`, `pd:session:*` | system only (auto-expire) |

- **How it's accessed:** the app talks to the store through `/api/*` functions on
  Vercel. Owners open the **Me → Owner / Staff login** dashboard (PIN-gated) to see
  and manage everything live. Customers see their own rewards/orders after signing
  in with their phone. It's automatic — no spreadsheets to keep.

- **One app = website + installable app.** The same URL works as a normal website in
  any browser AND installs to a phone/desktop home screen (PWA). It's mobile-first.

---

## 2. Reconnect auto-deploy  ⚠️ (broken right now)

When the GitHub repo moved to the **Medina-Digital-A-i** org, Vercel lost its link, so
pushing code no longer publishes the site.

1. Vercel dashboard → project **pour-decisions** → **Settings → Git**.
2. If it shows the old repo / "disconnected", click **Connect Git Repository** and pick
   `Medina-Digital-A-i/pour-decisions-275.dev`, branch **main**.
3. Save. Then **Deployments → Redeploy** the latest commit.
4. Verify: visit https://pour-decisions-rho.vercel.app — should load the latest build.

---

## 3. Attach the database (Vercel KV / Upstash)  — the big one

1. Vercel dashboard → project **pour-decisions** → **Storage** tab.
2. **Create Database → KV (Upstash Redis)** → accept free plan → **Connect** it to
   the `pour-decisions` project (Production + Preview).
3. This **auto-adds** `KV_REST_API_URL` and `KV_REST_API_TOKEN` to the project — no
   copy-paste needed.
4. **Redeploy** so the app picks them up.
5. Verify: in the app, **Me → Owner/Staff login → 7687**. The Orders/Loyalty/Bookings
   tabs should now load (empty) instead of "connect the database". Add an event — it
   should persist after a refresh and show on another device.

---

## 4. Turn on text-message login (Twilio)

We already have Twilio. Add these to Vercel → **Settings → Environment Variables**
(Production), then redeploy:

| Variable | Value |
|---|---|
| `TWILIO_ACCOUNT_SID` | from Twilio console |
| `TWILIO_AUTH_TOKEN` | from Twilio console |
| `TWILIO_FROM` | a Twilio phone number we own (e.g. +1518…) |

- Verify: sign in with a real phone → you should get a 6-digit text → enter it → in.
- **Optional shortcut for testing before Twilio is ready:** set `AUTH_DEV_CODE` to a
  fixed value (e.g. `000000`). Then sign-in accepts that code without texting. **Remove
  it before real launch** (it's a master code).

---

## 5. Other keys

| Variable | What it's for | Needed when |
|---|---|---|
| `ADMIN_PIN` | owner dashboard PIN (defaults to `7687` if unset) | recommended now — pick your own |
| `ANTHROPIC_API_KEY` | the Piña chatbot's answers | when you want Piña live |
| `SQUARE_ACCESS_TOKEN` + `SQUARE_LOCATION_ID` | in-app card payments | Phase 3 (payments) |

---

## 6. Point the real domain → pourdecisionjuicebar.com

Goal: the app lives at **pourdecisionjuicebar.com** instead of the `…vercel.app` URL.
The domain currently points to the **Wix** site, so this moves it to the new app.

**Already done by me:** added `pourdecisionjuicebar.com` to the Vercel project
`pour-decisions`. Now the DNS has to point at Vercel.

**Phebe — at wherever the domain's DNS is managed (Wix domain settings, or the
registrar like GoDaddy/Google Domains):**
1. Change/add these records:
   | Type | Name/Host | Value |
   |---|---|---|
   | `A` | `@` (root) | `76.76.21.21` |
   | `CNAME` | `www` | `cname.vercel-dns.com` |
   (Remove the old Wix A/CNAME records for `@` and `www`.)
2. Back in Vercel → project **pour-decisions → Settings → Domains** → the domain
   should flip to **Valid / verified** within minutes–hours; Vercel auto-issues the
   SSL certificate. Confirm the exact records there if Wix shows a conflict.
3. ⚠️ **Do this AFTER steps 2–4** (deploy reconnected + database attached) so the
   domain lands on a working build, not an error page.

Notes:
- This takes the domain **off the Wix site** — the Wix page stops being the live site
  at that address (it still exists in your Wix account, just not at this domain).
- No code change needed — the app uses relative URLs, so it works on any domain.
- The app already installed on the Mac mini points at the old `vercel.app` URL —
  once the domain is live, re-install it from **https://pourdecisionjuicebar.com**.

---

## 7. What's already done (no action needed)

- Customer accounts: phone + SMS-code **sign in / sign out** on the Me page; per-user
  Pour Pass, orders, notifications. No more fake "Migs Money" data.
- Owner dashboard: Events (add/edit/delete → shows on public calendar), Orders,
  Loyalty (adjust/log stamps), Bookings — all wired to the database.
- The whole app is built and pushed to `main`. Once steps 2–4 are done, it's live.

> After this is connected, we do a full walk-through testing every screen, menu, and
> button with real data. Business info (address, email, hours) can be corrected any
> time — it doesn't block launch.
