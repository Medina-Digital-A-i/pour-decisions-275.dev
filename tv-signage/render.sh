#!/usr/bin/env bash
# Render the Pour Decisions TV loop to MP4s.
# Requirements: Node, Google Chrome, ffmpeg.
#   ./render.sh            -> 12s loop @ 30fps
#   FRAMES=600 ./render.sh -> 20s loop
set -euo pipefail
cd "$(dirname "$0")"

FRAMES="${FRAMES:-360}"          # 360 = 12s @ 30fps
OUT="${OUT:-.}"                  # where the finished MP4s land

command -v ffmpeg >/dev/null || { echo "ffmpeg not found"; exit 1; }
[ -d node_modules ] || npm install

mkdir -p frames && rm -f frames/*.png
FRAMES="$FRAMES" node capture.js

# 1) clean seamless loop
ffmpeg -y -framerate 30 -i frames/frame_%04d.png \
  -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p -movflags +faststart \
  "$OUT/pour-decisions-tv-loop.mp4"

# 2) ~5min continuous version for TVs without a "repeat" setting
ffmpeg -y -stream_loop 24 -i "$OUT/pour-decisions-tv-loop.mp4" \
  -c copy -movflags +faststart "$OUT/pour-decisions-tv-5min.mp4"

echo "Done -> $OUT/pour-decisions-tv-loop.mp4  (+ -5min.mp4)"
