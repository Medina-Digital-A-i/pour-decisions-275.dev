#!/usr/bin/env bash
# Neon animated menu boards -> MP4 (30s seamless loops + 60-minute versions).
set -euo pipefail
cd "$(dirname "$0")"
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
FRAMES="${FRAMES:-900}"
THEME="${THEME:-dark}"; SUF=""; [ "$THEME" != dark ] && SUF="-$THEME"
OUT="${OUT:-neon-out$SUF}"; mkdir -p "$OUT"
LABEL="Neon"; [ "$THEME" = brand ] && LABEL="Brand"
[ -d node_modules ] || npm install --silent
THEME="$THEME" python3 build-neon.py
ENC="-c:v libx264 -preset medium -crf 19 -pix_fmt yuv420p -movflags +faststart"
for B in ${BOARDS:-A B}; do
  rm -rf "frames$SUF" && mkdir -p "frames$SUF"
  FILE="board-neon-$B$SUF.html" FRAMES="$FRAMES" OUT="$PWD/frames$SUF" node capture-neon.js
  ffmpeg -y -loglevel error -framerate 30 -i "frames$SUF/frame_%04d.png" $ENC "$OUT/neon-$B-loop.mp4"
done
rm -rf "frames$SUF"
# 60-minute versions of each board (seamless: each loop ends where it starts)
for B in A B; do
  printf "file 'neon-$B-loop.mp4'\n%.0s" $(seq 1 120) > "$OUT/list-$B.txt"
  (cd "$OUT" && ffmpeg -y -loglevel error -f concat -safe 0 -i "list-$B.txt" -c copy "$LABEL Menu $B - 60 min.mp4")
done
# alternating show: A(from 1s) -> fade -> B -> fade -> A(first 1s); cycle N+1 continues A exactly
cd "$OUT"
ffmpeg -y -loglevel error -ss 1 -i neon-A-loop.mp4 -i neon-B-loop.mp4 -i neon-A-loop.mp4 \
  -filter_complex "[0:v]format=yuv420p[a];[1:v]format=yuv420p[b];[2:v]trim=duration=1,format=yuv420p[a2];[a][b]xfade=transition=fade:duration=1:offset=28[ab];[ab][a2]xfade=transition=fade:duration=1:offset=57[v]" \
  -map "[v]" $ENC neon-show-cycle.mp4
SC=$(ffprobe -v error -show_entries format=duration -of csv=p=0 neon-show-cycle.mp4 | cut -d. -f1)
printf "file 'neon-show-cycle.mp4'\n%.0s" $(seq 1 $((3600 / SC))) > list-show.txt
ffmpeg -y -loglevel error -f concat -safe 0 -i list-show.txt -c copy "$LABEL Menu Show (A+B) - 60 min.mp4"
ls -la *.mp4 | awk '{print int($5/1048576)" MB  "$9" "$10" "$11" "$12" "$13" "$14" "$15" "$16}'
