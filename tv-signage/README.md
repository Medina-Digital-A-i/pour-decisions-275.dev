# Pour Decisions — TV Signage Loop

Branded looping animation for the in-store TVs (75" / 85"). Grassy textured field,
the shadowed palm trees from the site (with trembling fronds), the Pour Decisions
logo with a warm gold glow + gentle bob, floating sparkles, and a
"COLD-PRESSED · ALBANY NY" tagline. 1920×1080, 30fps, seamless loop.

## Files
- `index.html` — the animation (HTML5 canvas, deterministic frame renderer).
- `capture.js` — renders each frame with headless Chrome.
- `render.sh` — one command: renders frames → encodes the MP4s.
- `logo.png` — the logo used in the animation.
- `pour-decisions-tv-loop.mp4` — the finished 12s seamless loop (drop on a USB).

## Play it on the TV
Copy `pour-decisions-tv-loop.mp4` to a USB stick (format the stick **exFAT** or
**FAT32** if the TV won't read it) and open it from the TV's USB/Media player.
Turn on the player's **Repeat** setting. If the TV has no repeat option, render the
5-minute version (`render.sh` makes `pour-decisions-tv-5min.mp4` too).

## Re-render / customize
Requirements: **Node**, **Google Chrome**, **ffmpeg** (`brew install ffmpeg`).

```bash
cd tv-signage
./render.sh                 # -> pour-decisions-tv-loop.mp4  (+ -5min.mp4)
FRAMES=600 ./render.sh      # longer 20s loop
```

Tweak the look by editing `index.html`:
- **Grass color** — the `drawGrass()` gradient stops.
- **Logo size** — `w=960*breathe` in `drawLogo()`.
- **Palm placement / sway** — the `drawPalm(...)` calls in `drawFrame()`.
- **Tagline** — the `fillText('C O L D - P R E S S E D …')` line.
- Bouncing "signs" existed in an earlier version (`SIGNS` + `drawSigns`); the call is
  removed from `drawFrame()` — re-add `drawSigns(p)` there to bring them back.

Everything is driven by a phase `p = frame / totalFrames`, using integer-cycle
sines / triangle waves, so any speed value stays a **seamless loop**.

## Digital menu board (`menu-board.html`)
The in-store menu for the TVs. Reads `../menu.json` (falls back to an embedded copy),
renders three 1920×1080 screens — Smoothies · Juices + Shots · Food — and rotates
every 14 s. Open it in any browser on the TV (Chromecast, Fire Stick browser, or a
mini PC in kiosk mode) at:

    https://pourdecisionsjuicebar.com/tv-signage/menu-board.html

Options: `?screen=2` pins one screen (one TV per category); `?secs=20` changes the
rotation. It reloads itself every 6 hours so menu.json edits show up on their own.
