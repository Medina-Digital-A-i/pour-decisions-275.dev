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
3. This **auto-adds** a `REDIS_URL` connection string to the project (Upstash also
   exposes it as `REDIS_TLS_URL` / `KV_URL` — the app accepts any of the three). No
   copy-paste needed. *(The app talks to Redis over `ioredis`, so it needs the
   `redis(s)://…` URL, not the old `KV_REST_API_URL` / `KV_REST_API_TOKEN` REST pair.)*
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

---

## 5b. Take card payments at checkout (Square)

Until these are set, checkout shows **"Pay at pickup"** and nothing is charged.
Add all four (from your Square Developer dashboard → your app → **Credentials**),
then redeploy:

| Variable | Value | Secret? |
|---|---|---|
| `SQUARE_ACCESS_TOKEN` | Access token for the chosen environment | **yes** |
| `SQUARE_LOCATION_ID` | the location ID money is taken for | no |
| `SQUARE_APPLICATION_ID` | the app's Application ID (the browser needs it) | no |
| `SQUARE_ENVIRONMENT` | `sandbox` (test cards) or `production` (real money) | no |

- **Test first:** set `SQUARE_ENVIRONMENT=sandbox` with your **Sandbox** token +
  app ID + a sandbox location, and pay with Square's test card
  `4111 1111 1111 1111`, any future expiry, any CVV/ZIP. No real money moves.
- **Go live:** switch all four to your **Production** values and set
  `SQUARE_ENVIRONMENT=production`. Real cards are now charged when an order is placed.
- The card is collected by Square in the browser (PCI-safe — the raw card number
  never touches our server); we only ever receive a one-time token to charge.
- The order is recorded and the Pour Pass stamp is awarded **only after** the card
  clears. A declined card shows the customer an error and creates no order.

---

## 6. Point the real domain → pourdecisionsjuicebar.com

**Correct domain (plural): `pourdecisionsjuicebar.com`.** (Not the singular
"pourdecision…".) Its DNS is managed by **Wix** (nameservers ns8/ns9.wixdns.net).

**What's already true (you did this):** the Wix DNS already has Vercel's IP
`76.76.21.21` on the root. ✅

**Two fixes needed — both in the Vercel/Wix dashboards (the CLI can't, it reports
"no access" to this domain — it's owned by your main Vercel account):**

1. **Wix DNS → remove the leftover Wix record.** The root (`@`) currently has BOTH
   `76.76.21.21` (Vercel ✅) **and** `185.230.63.107` (old Wix). Delete the Wix one so
   only `76.76.21.21` remains. Also add `CNAME  www → cname.vercel-dns.com`.
2. **Vercel dashboard → attach the domain to the right project.** `pourdecisionsjuicebar.com`
   is currently assigned to a **different Vercel project**. Open Vercel → the project
   that should serve the app (the one connected to GitHub `Medina-Digital-A-i/
   pour-decisions-275.dev`) → **Settings → Domains → Add** `pourdecisionsjuicebar.com`
   (Vercel will offer to move it from the other project — accept). It should then show
   **Valid** and auto-issue SSL.

⚠️ Do this **after** the deploy + database are working (§2–§4), so the domain lands on
a live build, not an error.

Notes:
- This takes the domain **off the Wix site** (the Wix page still exists, just not at
  this address).
- No code change needed — the app works on any domain.
- The app installed on the Mac mini points at the old `vercel.app` URL — once the
  domain is live, re-install it from **https://pourdecisionsjuicebar.com**.

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
