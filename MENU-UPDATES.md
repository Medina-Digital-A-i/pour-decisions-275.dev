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
