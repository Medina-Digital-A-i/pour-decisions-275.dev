#!/usr/bin/env bash
# Re-render the Neon (dark) and Brand TV boards as short seamless loops. Sequential on purpose.
cd "$(dirname "$0")"
export PATH="$HOME/.nvm/versions/node/v22.22.1/bin:/opt/homebrew/bin:/usr/local/bin:$PATH"
echo "START $(date)"
LOOPS_ONLY=1 THEME=dark  ./render-neon.sh && echo NEON_OK  || echo NEON_FAIL
LOOPS_ONLY=1 THEME=brand ./render-neon.sh && echo BRAND_OK || echo BRAND_FAIL
echo "ALL_DONE $(date)"
