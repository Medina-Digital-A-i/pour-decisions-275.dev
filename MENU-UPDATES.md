# Updating the Pour Decisions menu (and other everyday changes)

Everything customers see — website menu, TV boards, printed menu, Piña's answers — comes
from **one file: `menu.json`**. Change it there and everything follows.

## 1. Change a price, name, or ingredient
1. Open `menu.json` (GitHub → repo → `menu.json` → pencil icon, or in your editor).
2. Find the item. Each item looks like:
   ```json
   { "id": "happy-hour", "name": "Happy Hour",
     "ingredients": ["strawberry", "pineapple", "mango", "orange juice"],
     "tag": "tropical", "size": "smoothie" }
   ```
   - Drinks don't carry their own price — `"size": "smoothie"` points at the shared
     price table at the top (`sizes.smoothie`, `sizes.juice`, `sizes.shot`, `sizes.meal`).
     **Change a size price once and every drink updates.** Protein smoothies use `smoothie_protein`.
   - Food uses `"price": 11` or `"prices": { "chicken": 12, "salmon": 14 }`.
3. Keep the commas right: every item ends with `},` **except the last one in its list**.
4. Commit to the **`dev`** branch. Wait ~1 minute, check
   https://dev--pour-decisions-juicebar.netlify.app/#/menu
5. Happy? Open a pull request `dev → main` (or `git merge dev` on main) and push.
   Live in ~1 minute at pourdecisionsjuicebar.com.

## 2. Add or remove an item
- Add: copy an existing item block, paste it into the same `items` list, give it a **new
  unique `id`** (lowercase, dashes) and a new name.
- Remove: delete the whole `{ … }` block *and* the comma that separated it.

## 3. Turn online ordering on/off
In the `business` block at the top:
```json
"order_url": "https://www.clover.com/online-ordering/…"
```
- URL set → checkout says **"Continue to secure checkout"** and opens Clover.
- `""` (empty) → checkout says **"Pay at pickup"** and nothing leaves the site.

## 4. Safety net
Every push runs `node scripts/check-menu.js`. If `menu.json` has a typo (missing comma,
bad price, duplicate id) **the deploy fails and the live site stays on the previous
version**. Netlify emails the error; the message tells you the line to fix.
Run it yourself before pushing: `node scripts/check-menu.js`.

## 5. TV boards & printed menu
The website updates itself. The TV boards (`tv-signage/board-pop.html`) read `menu.json`
when opened in a browser. The **printed/phone PDF designs** are generated — after a menu
change run `cd design/menu && python3 build.py` and commit the results.

## 6. Rules that keep us out of trouble
- Work on `dev`, check the preview, then merge to `main`. Never push straight to `main`.
- Never upload files in the Netlify dashboard by hand — the next git deploy erases them.
- Live site is walled behind `coming-soon.html` (`_redirects` on `main`) until launch day.
  To open the doors: delete the `/*  /coming-soon.html  200!` line from `_redirects` on `main`.

## 7. Member accounts & your email list
Accounts live in **Netlify Blobs** (no outside service, included in the Netlify plan).
Code: `netlify/functions/members.mjs`. Passwords are hashed (scrypt); 5 wrong tries = 10-minute lock.

**Download the member/email list** (CSV: email, name, phone, opt-in, joined, points, orders):
1. One-time: Netlify → Site configuration → Environment variables → add `ADMIN_TOKEN`
   (any long random string, 32+ characters — a password manager can generate one). Redeploy once.
2. Then, from any terminal:
   `curl -H "Authorization: Bearer YOUR_ADMIN_TOKEN" https://pourdecisionsjuicebar.com/api/admin/members.csv -o members.csv`
   Without the token the endpoint answers 403. Nobody else can pull the list.

Points: orders placed on the site are **recorded but earn 0 points until they're paid** —
that switch flips when Clover payment confirmation is wired in (next step).

## 8. Spin wheel odds & prizes
The wheel has exactly 10 slices, defined in `menu.json → "wheel"`. Each has a `label`, a `short`
label for the wheel graphic, and a `weight` (the odds — bigger number = more likely). Slices labeled
"Not this time" are losses. `"+50 points"` style labels credit points automatically. Every member
gets **one spin per calendar month**; wins get a 6-character code, good for 30 days. Staff verify
the code in the Owner Dashboard → Members → Mark redeemed.

## 9. Build Your Own Pack
`menu.json → packages.items` entries with `"byo": true`, an `id`, a `count` and a `kind`
(`juice` or `shot`) show up as buildable packs. Change the price there; the site, cart and owner
dashboard follow.

## 10. Owner dashboard — pourdecisionsjuicebar.com/admin.html
Sign in with your normal site account. Only emails listed in the Netlify env var **OWNER_EMAILS**
(comma-separated) get in. Shows members, sign-ups per day, visitors per day, order requests,
purchase history per member, spin prizes to honor, birthdays this month, CSV export.

## 11. New-member email alerts (Gmail, no extra service)
Netlify → Environment variables:
- `GMAIL_USER` = the sending Gmail (e.g. pourdecisionsalb@gmail.com)
- `GMAIL_APP_PASSWORD` = a Gmail **App Password** (Google Account → Security → 2-Step Verification → App passwords; 16 characters)
- `NOTIFY_TO` = who gets the alerts, comma-separated (Migs, Kendu)
- optional `NOTIFY_ORDERS=1` to also get an email per order request
If these aren't set, the site works normally and just doesn't email.
