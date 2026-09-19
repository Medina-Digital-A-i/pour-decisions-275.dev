#!/usr/bin/env bash
# Pop TV boards -> screen-recorded MP4s: LEFT, RIGHT, ONE TV (alternating), each as a seamless loop (set LOOPS_ONLY=1 to skip the 60-min files; TV on Repeat).
set -euo pipefail
cd "$(dirname "$0")"
export PATH="$HOME/.nvm/versions/node/v22.22.1/bin:/opt/homebrew/bin:/usr/local/bin:$PATH"
OUT=pop-out; mkdir -p "$OUT"; SECS=${SECS:-62}
ENC="-c:v libx264 -preset medium -crf 19 -pix_fmt yuv420p -r 30 -movflags +faststart -an"
python3 build-pop.py
for B in left right; do
  FILE=pop-$B.html SECS=$SECS OUT=$OUT/raw-$B.webm NODE_PATH=node_modules node capture-pop.js
  ffmpeg -y -loglevel error -i "$OUT/raw-$B.webm" $ENC "$OUT/pop-$B-raw.mp4"
  # seamless cycle: 0-59s fading into its own first second -> ends where it starts
  ffmpeg -y -loglevel error -i "$OUT/pop-$B-raw.mp4" -i "$OUT/pop-$B-raw.mp4" -filter_complex \
    "[0:v]trim=0:59,setpts=PTS-STARTPTS,format=yuv420p[a];[1:v]trim=0:1,setpts=PTS-STARTPTS,format=yuv420p[b];[a][b]xfade=transition=fade:duration=1:offset=58[v]" \
    -map "[v]" $ENC "$OUT/pop-$B-cycle.mp4"
  cp "$OUT/pop-$B-cycle.mp4" "$OUT/Pop Menu $( [ $B = left ] && echo LEFT || echo RIGHT ) TV - loop.mp4"
  if [ -z "${LOOPS_ONLY:-}" ]; then
    printf "file 'pop-$B-cycle.mp4'\n%.0s" $(seq 1 62) > "$OUT/list-$B.txt"
    (cd "$OUT" && ffmpeg -y -loglevel error -f concat -safe 0 -i "list-$B.txt" -c copy "Pop Menu $( [ $B = left ] && echo LEFT || echo RIGHT ) TV - 60 min.mp4")
  fi
done
# ONE TV: left (0-59) -> fade -> right (0-59) -> fade -> left first second
ffmpeg -y -loglevel error -i "$OUT/pop-left-raw.mp4" -i "$OUT/pop-right-raw.mp4" -i "$OUT/pop-left-raw.mp4" -filter_complex \
  "[0:v]trim=0:59,setpts=PTS-STARTPTS,format=yuv420p[a];[1:v]trim=0:59,setpts=PTS-STARTPTS,format=yuv420p[b];[2:v]trim=0:1,setpts=PTS-STARTPTS,format=yuv420p[c];[a][b]xfade=transition=fade:duration=1:offset=58[ab];[ab][c]xfade=transition=fade:duration=1:offset=116[v]" \
  -map "[v]" $ENC "$OUT/pop-show-cycle.mp4"
cp "$OUT/pop-show-cycle.mp4" "$OUT/Pop Menu ONE TV (alternating) - loop.mp4"
if [ -z "${LOOPS_ONLY:-}" ]; then
  SC=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUT/pop-show-cycle.mp4" | cut -d. -f1)
  printf "file 'pop-show-cycle.mp4'\n%.0s" $(seq 1 $((3600 / SC))) > "$OUT/list-show.txt"
  (cd "$OUT" && ffmpeg -y -loglevel error -f concat -safe 0 -i list-show.txt -c copy "Pop Menu ONE TV (alternating) - 60 min.mp4")
fi
rm -f "$OUT"/raw-*.webm
ls -la "$OUT"/*.mp4 | awk '{print int($5/1048576)" MB  "$9" "$10" "$11" "$12" "$13" "$14" "$15" "$16" "$17}'
echo POP_RENDER_DONE
