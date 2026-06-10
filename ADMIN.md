# Pour Decisions — Owner Dashboard & Data

The app has a built-in **Owner Dashboard** (no separate website to log into — it's
the same app, on phone or desktop) and a small backend that **keeps all your data**
and syncs it to every customer's device.

## Getting into the dashboard

1. Open the app → bottom nav **Me** (Account).
2. Tap **Owner Tools** → enter the **staff PIN**.
3. Default PIN is **`7687`** ("POUR"). Change it by setting the `ADMIN_PIN`
   environment variable (see below).

Inside you get four tabs:

- **🧾 Orders** — every order placed in the app lands here live with the
  customer's name/phone, items, total, and time. Tap **Mark ready → picked up**
  to move it through the queue. A badge shows how many are new.
- **⭐ Loyalty** — every Pour Pass member, their stamp count, lifetime pours and
  spend. Use **+ / −** to adjust someone's stamps, or the **"+1 Stamp"** form to
  log an in-store/cash sale by phone number (creates the member if new). This is
  how you control stars even though the pass lives on the customer's phone — the
  stamps live on the server, the phone just displays them.
- **📅 Events** — publish, list, and delete events. Published events appear
  instantly on the public **calendar** and **home feed**.
- **📩 Bookings** — every "Book the Space" request lands here with the guest's
  name, contact, date/time, party size, and notes. Tap **Call/Email back** or
  **Archive**.

### How loyalty & purchase tracking works

- A customer starts a **Pour Pass** with their **name + phone** (Pour Pass tab),
  or just enters their phone at checkout. That phone number *is* their identity.
- Every in-app order **auto-awards one stamp** and records the purchase, so your
  Orders + Loyalty tabs build the customer's history automatically.
- For walk-ins/cash, you add the stamp yourself from the Loyalty tab.
- 9 stamps = the 10th pour free; reaching 9 banks a **free pour** the customer
  sees on their pass.
- Each customer's pass shows a **QR code** (their phone) that staff can scan/read
  at the counter to find them fast.

A status chip shows where data lives: **☁️ Cloud sync on** or **📱 On-device**.

## How data is kept

The app is **cloud-first with an on-device fallback**:

| State | What happens |
| --- | --- |
| **No cloud attached (default)** | Events, bookings, orders & loyalty save in the browser (localStorage). Works fully on one device. Good for testing — but the owner can't see customers' data, because it never leaves their phones. |
| **Cloud attached** | Everything saves to a shared store via the `/api/*` routes. Owner posts show on **every** customer's phone; orders, bookings and Pour Pass stamps sync centrally so you control and see them all. |

> **Important:** central purchase tracking and owner-controlled stamps only work
> once the cloud store is attached (next section). Until then it's a realistic
> single-device demo.

It auto-detects which mode it's in — no code change needed when you attach the cloud.

## Turn on cloud sync (one-time, ~3 minutes)

The backend talks to a **Vercel KV** (Redis) store using the REST API. No extra
npm packages required.

1. In **Vercel → your project → Storage → Create Database → KV**.
2. **Connect** it to this project. Vercel automatically adds the
   `KV_REST_API_URL` and `KV_REST_API_TOKEN` environment variables.
3. (Recommended) Add an env var **`ADMIN_PIN`** with your private staff PIN.
4. **Redeploy.** The dashboard chip will flip to **☁️ Cloud sync on**.

That's it — events and bookings are now persistent and shared across all devices.

> Prefer a different store (Supabase, Upstash direct, Postgres)? Only
> `api/_store.js` needs to change — `readList(key)` / `writeList(key, list)` are
> the only two functions the rest of the code depends on.

## API surface

| Method | Route | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/api/events` | public | List events (also reports `configured`) |
| POST | `/api/events` | `x-admin-pin` | Publish an event |
| DELETE | `/api/events?id=…` | `x-admin-pin` | Remove an event |
| POST | `/api/bookings` | public | Submit a space-booking request |
| GET | `/api/bookings` | `x-admin-pin` | List booking requests (inbox) |
| DELETE | `/api/bookings?id=…` | `x-admin-pin` | Archive a request |
| POST | `/api/orders` | public | Place an order (auto-awards a stamp) |
| GET | `/api/orders` | `x-admin-pin` | List orders (owner queue) |
| PATCH | `/api/orders?id=…` | `x-admin-pin` | Update order status |
| GET | `/api/loyalty?phone=…` | public | Read one customer's own pass |
| GET | `/api/loyalty` | `x-admin-pin` | List all Pour Pass members |
| POST | `/api/loyalty` | `x-admin-pin` | Adjust stamps / log an in-store sale |

## Custom domain

Point your own `.com` at the Vercel project (**Settings → Domains**). The app —
and the install-to-home-screen flow — then run on your branded URL. HTTPS is
automatic, which is what lets phones install it as an app.
