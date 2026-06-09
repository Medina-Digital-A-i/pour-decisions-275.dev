# Pour Decisions — Customer PWA

Mobile-first, installable Progressive Web App for Pour Decisions juice bar.
359 Northern Boulevard, Albany NY 12204 · brand-locked teal `#1F4860` / gold `#E8B547` / cream `#FFF8EC`.

> **Status:** v1.0 — May 2026 demo build. All UI is shipped. Mock data for cart, loyalty, orders, account, notifications. Real payment, backend, and push notifications are stubbed and ready to wire.

---

## What's in here

```
app/
├── index.html          ← single-file React app (Babel-in-browser, Tailwind CDN)
├── manifest.json       ← PWA manifest with shortcuts + maskable icon
├── sw.js               ← Service worker (precache shell + SWR for runtime)
├── offline.html        ← Branded offline fallback page
├── README.md           ← You are here
└── assets/             ← Icons (16/32/48/180/256/512), logos, OG image, brand styles
```

## Screens shipped (9)

1. **Home** — hero, today's pours, Pour Pass teaser, hours/map/directions, social
2. **Menu** — 20 items (juices, smoothies, shots, salads, wraps), 5 category filters, combo deals, item detail sheet
3. **Item Detail** — bottom-sheet with size, qty, special requests, benefits chips, add-to-cart
4. **Order (Cart)** — line items, qty steppers, subtotal/tax/tip/total, "add more" link
5. **Checkout** — name/phone, pickup time slots, payment method picker (Apple/Google/Card/In-store)
6. **Order Confirmation** — order # + pickup ETA + stamps earned
7. **Pour Pass** — 9-stamp punch card, points balance, perks grid, 4 redeemable rewards
8. **Account** — profile (editable), order stats, saved favorites carousel, recent orders, settings/info menu
9. **Notifications** — 3 preference toggles + recent feed (order ready, specials, events)

Plus three persistent UI elements:

- **Pina chatbot** — pineapple FAB bottom-right, opens a sheet with scripted responses (hours, menu, loyalty, allergens, payment, events, etc.) and quick-chip suggestions
- **Splash screen** — branded teal-gold-leaf gradient with the P mark, fades after ~1.4s
- **Bottom nav** — Home / Menu / Order / Pass / Account with cart badge

---

## Preview locally

The app is a static SPA — any local server works.

```bash
cd ~/Documents/Businesses/Pour-Decisions/app
python3 -m http.server 8080
# then open http://localhost:8080
```

Or with Node:

```bash
npx serve .
```

> **Service workers require HTTPS or `localhost`.** Both `localhost` and `127.0.0.1` are treated as secure contexts so the SW will register fine in local dev.

### What you'll see on desktop

- The app renders inside a phone shell (~420px wide, rounded corners, drop shadow) on viewports ≥ 768px
- On mobile widths it goes full-bleed and behaves like a real app
- Splash overlays for ~1.4 seconds on first paint

### What you'll see on mobile

- Native bottom-nav, safe-area aware (notch + home indicator)
- Pina FAB pulses gold above the nav bar
- All sheets slide up smoothly

---

## Install on iOS (Add to Home Screen)

1. Open the URL in **Safari** (not Chrome — iOS only allows Safari to install PWAs)
2. Tap the **Share** button
3. Tap **Add to Home Screen**
4. Confirm — the app appears on the home screen with the gold-on-teal "P" icon, runs full-screen with no Safari chrome

## Install on Android (or desktop Chrome / Edge)

1. Open the URL in **Chrome / Edge / Brave**
2. Browser shows an "Install Pour Decisions" banner OR open menu → **Install app**
3. App opens in its own window, no browser UI
4. Add the **Order Ahead**, **Pour Pass**, and **Browse Menu** shortcuts (long-press the icon on Android, right-click on desktop)

---

## Deploy options

This is a static site — drop the `app/` folder anywhere that serves HTTPS:

| Host | Cost | Notes |
|---|---|---|
| **Vercel** | free | `vercel deploy` from `app/` — instant HTTPS |
| **Netlify** | free | drag `app/` to dashboard, or `netlify deploy --prod -d app` |
| **Cloudflare Pages** | free | connect git, set output dir to `app` |
| **GitHub Pages** | free | enable Pages on `/app` directory |
| **AWS S3 + CloudFront** | pennies | for full control |

After deploy, ship the URL to social bios + add a **QR code** at the counter that points to it. People will install in 10 seconds.

---

## Verify installability

In Chrome DevTools:

1. **Application** tab → **Manifest** — should show name, theme color, icons, no errors
2. **Application** tab → **Service Workers** — should show `sw.js` as activated
3. **Lighthouse** → run **PWA** audit — should pass:
   - Manifest is valid (`name`, `short_name`, `start_url`, `icons` 192+512, `display: standalone`)
   - Service worker controls page
   - HTTPS (or localhost)
   - Maskable icon present
   - Themed splash + apple-touch-icon

Expected Lighthouse PWA score on a real deploy: **≥ 95**.

---

## What still needs Migs

Everything UI is done. These are the production-readiness items:

| Item | What it needs |
|---|---|
| **Real payment** | Square or Stripe — wire `CheckoutView` `placeOrder()` to a payment intent. Apple Pay / Google Pay tokens go through the same SDK. |
| **Order backend** | An endpoint to receive `lastOrder` payload (items + customer + pickup time). Could be a simple Vercel function + Postgres, or Square Order API. |
| **POS sync** | When orders arrive at the bar (Square/Toast/Clover), staff needs a screen to mark "ready" — that triggers the order-ready push. |
| **Push notifications** | Generate VAPID keys → store user subscriptions server-side → send via Web Push protocol. SW already has the `push` and `notificationclick` handlers in place. |
| **SMS fallback** | For users who don't enable push, send the "ready for pickup" via Twilio when the order is marked ready. |
| **Pina v2** | Current scripted bot covers the top 12 intents. Wire to OpenAI/Claude API for open-ended Q&A — keep the same FAB + sheet UI. |
| **Real order history** | Replace `MOCK_ORDERS` with API call. The shape already matches: `{ id, date, items[], total, status }`. |
| **Subscriptions / Gift cards** | Account menu items go to `console.log` today — wire to Stripe Subscriptions + Square Gift Cards. |
| **Auth** | No login today (it's order-as-guest). Add Sign in with Apple / Google when subscriptions and order history go live. |
| **Domain + HTTPS** | Point `app.pourdecisions.com` (or similar) at the deploy. PWAs need real HTTPS to install on mobile. |

---

## Tech notes

- **Single-file React via Babel-in-browser** — zero build step, ships in seconds. For v2 when bundle size matters, switch to Vite + `npm run build`.
- **Tailwind via CDN** — same trade-off. Production should use the Tailwind CLI to purge unused classes.
- **State persists to `localStorage`** — cart, stamps, favorites, profile, notification prefs, Pina chat history. Survives reload + app close.
- **Hash routing** for PWA shortcuts — `#/menu`, `#/order`, `#/pass` jump straight to that tab when launched from the home-screen shortcut.
- **Service worker strategy** — precache shell on install, stale-while-revalidate for runtime, network-first for navigations with offline.html fallback.

---

## One-liner pitch

> **A juice-bar app that opens, orders, and rewards in three taps — installs from a QR code, no app-store gatekeeping.**

Made with love (and probably too much caffeine) for Pour Decisions, Albany NY.
