#!/bin/bash
set -euo pipefail

# ─── Package SAOS into a distributable zip ───────────────────────────────────
# Run this script to create SAOS-release.zip
# Share the zip link → user downloads, extracts, double-clicks. That's it.
# ─────────────────────────────────────────────────────────────────────────────

cd "$(dirname "$0")"

GREEN='\033[1;32m'
CYAN='\033[1;36m'
BOLD='\033[1m'
NC='\033[0m'

RELEASE_NAME="SAOS-release"
ZIP_FILE="${RELEASE_NAME}.zip"
STAGING_DIR="/tmp/${RELEASE_NAME}"

printf "\n${BOLD}${CYAN}Packaging SAOS for distribution...${NC}\n\n"

# Clean previous build
rm -rf "$STAGING_DIR" "$ZIP_FILE"
mkdir -p "$STAGING_DIR/SAOS"

# Copy project files (exclude heavy/generated stuff)
rsync -a \
  --exclude='node_modules' \
  --exclude='.next' \
  --exclude='.saos-data' \
  --exclude='.env.local' \
  --exclude='.env' \
  --exclude='.DS_Store' \
  --exclude='*.tsbuildinfo' \
  --exclude='next-env.d.ts' \
  --exclude="$ZIP_FILE" \
  ./ "$STAGING_DIR/SAOS/"

# Make start script executable
chmod +x "$STAGING_DIR/SAOS/start-saos.command"

# Create the zip
cd /tmp
zip -r -q "$OLDPWD/$ZIP_FILE" "$RELEASE_NAME"
cd "$OLDPWD"

# Cleanup
rm -rf "$STAGING_DIR"

SIZE=$(du -h "$ZIP_FILE" | cut -f1)

printf "${GREEN}✔ Created: ${BOLD}${ZIP_FILE}${NC} ${GREEN}(${SIZE})${NC}\n"
printf "\n${BOLD}Share this zip file. User just:${NC}\n"
printf "  1. Download & extract the zip\n"
printf "  2. Double-click ${CYAN}SAOS/start-saos.command${NC}\n"
printf "  3. Everything auto-installs & opens in browser\n"
printf "  4. Go to Settings → enter ServiceNow creds → done!\n\n"
