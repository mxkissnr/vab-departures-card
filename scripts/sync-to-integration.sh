#!/usr/bin/env bash
# Copies vab-departures-card.js into ha-vab-integration's bundled www/ folder.
# The card ships inside ha-vab-integration and is registered automatically as
# a Lovelace resource on setup (see ha-vab-integration#27). Run this as part
# of every vab-departures-card release, then bump+release ha-vab-integration
# too so the cache-busting version query param actually changes.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CARD_REPO="$(cd "$SCRIPT_DIR/.." && pwd)"
INTEGRATION_REPO="${1:-$CARD_REPO/../ha-vab-integration}"
DEST="$INTEGRATION_REPO/custom_components/vab/www/vab-departures-card.js"

if [ ! -d "$INTEGRATION_REPO/custom_components/vab" ]; then
  echo "error: '$INTEGRATION_REPO' doesn't look like the ha-vab-integration repo (pass its path as \$1)" >&2
  exit 1
fi

mkdir -p "$(dirname "$DEST")"
cp "$CARD_REPO/vab-departures-card.js" "$DEST"
echo "synced vab-departures-card.js -> $DEST"
echo "next: bump ha-vab-integration's manifest.json version and release it too"
