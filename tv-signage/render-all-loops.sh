#!/usr/bin/env bash
# Re-render every TV board as a short seamless LOOP (no 60-min files; set the TV's media player to Repeat).
# Runs the three renders one after another — parallel headless-Chrome captures hang on exit.
cd "$(dirname "$0")"
export PATH="$HOME/.nvm/versions/node/v22.22.1/bin:/opt/homebrew/bin:/usr/local/bin:$PATH"
echo "START $(date)"
LOOPS_ONLY=1 ./render-pop.sh              && echo POP_OK   || echo POP_FAIL
LOOPS_ONLY=1 THEME=dark  ./render-neon.sh && echo NEON_OK  || echo NEON_FAIL
LOOPS_ONLY=1 THEME=brand ./render-neon.sh && echo BRAND_OK || echo BRAND_FAIL
echo "ALL_DONE $(date)"
