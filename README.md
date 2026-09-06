# Pour Decisions — website

The customer-facing site for Pour Decisions juice bar (348 Loudon Plaza, Albany NY).
It is a **static, installable PWA** hosted on **Netlify** at
**https://pourdecisionsjuicebar.com**. There is no server: everything is in
this repo, and Netlify publishes whatever is on the `main` branch.

## Repo layout

```
index.html        the whole app (home, menu, cart, Pour Pass, events, event space + packages, Piña chat)
menu.json         THE MENU — single source of truth for items, prices, sizes, add-ons, cleanses, memberships
support.js        runtime the app is built on (do not edit)
sw.js             service worker (offline / install)
manifest.json     PWA manifest
offline.html      offline fallback page
assets/           logos, icons, og-image, light-theme.css
tv-signage/       the in-store TV loop (see tv-signage/README.md)
archive/api-v1/   the old June 2026 backend — not used by the site (see its README)
```

## How to change the menu

1. Edit `menu.json` (items, ingredients, prices, sizes, add-ons, cleanses, memberships).
   Keep it valid JSON — a trailing comma will break the menu.
2. Commit and push to the **`dev`** branch.
3. Open the Netlify **deploy preview** for `dev` and check the Menu screen and Piña.
4. Merge `dev` → `main`. Netlify auto-deploys `main` to the live site within a minute or two.

The app reads `menu.json` on every load, so a menu change needs nothing else.
`index.html` also carries an embedded copy (`MENU_DATA`) as its instant/offline
fallback; it is refreshed automatically by the fetch, but if you want the very
first paint to match too, paste the new `menu.json` contents over `MENU_DATA`.

Categories the site knows: `smoothies`, `juices`, `shots`, `salads`,
`wraps-paninis`, `bowls-breakfast`. Drink prices come from the shared `sizes`
table (16 / 24 oz, 2 oz shots); food items use `price` or a `prices` map of
variants (chicken / salmon / tuna, cup / bowl, plain / loaded…).

## Branch rules

- **`main` = live.** Whatever is on `main` is on pourdecisionsjuicebar.com.
- **`dev` = work.** Do all edits on `dev`, check the preview, then merge to `main`.
- Never push straight to `main`; never force-push.

## Never upload files to Netlify by hand

The repo is the only source of the site. Drag-and-drop or manual uploads in the
Netlify dashboard get silently overwritten by the next git deploy, and the
change is lost for good (this already happened once — the Aug 2026 event-space
version and `light-theme.css` had to be rescued back into the repo). If it is
not committed, it is not real.

## TV signage

The looping in-store TV animation lives in `tv-signage/`. The finished video is
`tv-signage/pour-decisions-tv-loop.mp4` — copy it to a USB stick and play it on
repeat. `tv-signage/README.md` explains how to re-render or tweak it.

## Local preview

```bash
python3 -m http.server 8080     # then open http://localhost:8080
```
