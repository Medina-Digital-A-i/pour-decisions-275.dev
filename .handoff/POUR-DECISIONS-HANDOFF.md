# Pour Decisions — Ops Handoff (Sep 11, 2026)

Paste this into any new Claude task, or point Claude at it. Everything below is current as of Fri Sep 11, 2026, 11:45 AM ET.

## The business, fixed facts
- Pour Decisions Juice Bar — 359 Northern Blvd, Albany NY 12204 (Loudon Plaza). Owners: Migs (Miguel Medina) + Kendu, 50/50.
- Hours 8 AM – 5 PM every day. Phone (838) 261-9233. Email pourdecisionsalb@gmail.com.
- Soft opening now (drinks only). Food coming soon. GRAND OPENING Sat Sept 19, 2026.
- Site pourdecisionsjuicebar.com (Netlify, repo Medina-Digital-A-i/pour-decisions-275.dev, main = live, dev = preview). menu.json is the single source of truth.
- Online ordering: pourdecisionsjuicebar.cloveronline.com (Clover). Clover merchant HKWWW72RHCZG1, MID 526740284884.
- Instagram @pourdecisions_juicebar. Google Business Profile under pourdecisionsalb@gmail.com (listing id 8711237918837172840).
- Brand colors: Pour Blue #156490, Cup Teal #29909C, Lemon Orange #F09028, Ink #303030. No emojis in copy. Not a liquor-bar look; bar-pun drink names stay.
- Prices are settled — never propose price changes. Smoothies/juices 16 oz $9.50 / 24 oz $12.50, shots $4.50, Protein & Oats $11/$14.

## Machines
- Mac mini (user miguelmedina) = the always-on engine. Linked to the ORIGINAL task ("Pour Decisions ops", pinned). Chrome there runs the Claude extension (browser id 71878a7c…), logged into Instagram.
- Photo library on the mini: ~/3-MEDIA/Photos/Pour Decisions/ — 01 Product, 02 Interior, 03 Brand & Logo, 04 Not for posting (never post), 05 People, 06 Video, 07 Instagram ready (pre-cropped 4:5 day2…day9 files).
- Repo clone on the mini: ~/pour-decisions-275.dev (git push via osascript shell; gh logged in as totalpropertysolutionspro-del). Laptop clone: ~/Desktop/pour-decisions.
- Photos go on Google + Instagram ONLY — not the website, TV menus, or printed menu unless Migs says so.

## Instagram (running)
- Bio, category (Smoothie & Juice Bar), email/phone contact buttons — set. Pitaya post pinned. "Order online" link → Clover store.
- Posting pipeline that works: stage the photo from the mini → Chrome extension → New post → file_upload → 4:5 → caption → Share → hashtags as first comment.
- Schedule (7:30 AM ET, one a day, all pre-approved by Migs):
  - Fri 9/11 strawberry-mint — DONE instagram.com/p/DdJT3bIoPhQ
  - Sat 9/12 juice bottles + office packages · Sun 9/13 swing bench · Mon 9/14 carrot-ginger · Tue 9/15 protein · Wed 9/16 mango "3 days" · Thu 9/17 pitchers · Fri 9/18 family "tomorrow" · Sat 9/19 live crowd shot from Migs's phone.
- Still phone-only: Highlights (Menu / Events / Pour Pass). No Instagram location tag exists for the shop until the Facebook page gets the address (359 Northern Blvd). Do NOT use the "Cafe Madison Loudon Plaza" tag (it's Loudon, Tennessee).
- A Meta boosted post is running ($54 budget, ~$0.34 spent, ends ~9/13) — Migs said no money right now; end it if he confirms.

## Google Business Profile
- Category Juice shop (live), description with event space, hours 8–5, phone 838, Instagram link, 20 owner photos, posts: Grand Opening event, We're open, Book the space, Juice for the whole office (Call now).
- Open: add crcp183@gmail.com + Kendu as owners; products (21 drinks); Q&As; parking attribute; cover/logo pending review.

## Corporate packages (approved "add it everywhere")
- Morning Shift 12 juices $94.50 · The Whole Floor 24 juices $178 · Shot Round 24 shots $84 · Meeting Bar from $8.50/person (10+, space included) · Cleanse Club $45/$120.
- With food (later): Working Lunch $18/person, Breakfast Meeting $14.50/person.
- Live on the site (Juice Packs → For the Office, v3.9.36), Google post, IG 9/12 post. Flyer artifact "Pour Decisions Corporate Packages" + PDF.
- TODO: add The Whole Floor + Shot Round to Clover items (category Juice Packs) AND assign to the Online menu (id VMKVJGT7DT8KA); imported modifiers need "show online" on.

## Uber Eats
- New merchant account created by Migs (merchants.ubereats.com, store "Pour Decisions Juice Bar", contact pourdecisionsalb@gmail.com / 838). Orders via Clover (done). Menu syncing from Clover.
- Paused at Pricing: Lite 20% delivery/7% pickup vs Plus 0% for 30 days then 25%/7% (recommended Plus). Migs picks + clicks Submit (merchant agreement). Then banking, tax/EIN, verification docs, 2-step security — his. Then Claude: Clover Online Ordering → partners hookup.
- Skip OrderOut ($89–129/mo; ticket 3554 open — close it politely).

## TV menus
- Pop board is the main menu (light, pastel). Loops only now (no 60-min files): tv-signage/pop-out/*loop.mp4, neon-out/, neon-out-brand/. Copy to the USB sticks when plugged into the mini; TV player set to Repeat.

## Other open items
- Dev branch has photo swaps on the website that Migs does NOT want — leave unmerged or roll back.
- DR trip Sept 15–20 (EWR→STI, Monte Cristi side): Casa Colonial vs BlueBay Villas Doradas — conflicts with the 9/19 grand opening, unresolved.
- Laptop task: start from the Claude desktop app on the laptop with the laptop selected; both tasks share memory.
