#!/bin/bash
set -euo pipefail

# ─── SAOS One-Line Setup & Launcher ──────────────────────────────────────────
# Installs SAOS and creates a double-clickable Desktop shortcut
# ─────────────────────────────────────────────────────────────────────────────

GREEN='\033[1;32m'
CYAN='\033[1;36m'
YELLOW='\033[1;33m'
RED='\033[1;31m'
BOLD='\033[1m'
NC='\033[0m'

printf "\n${BOLD}${CYAN}"
cat << 'BANNER'
  ╔═══════════════════════════════════════╗
  ║     SAOS — Automated Installer        ║
  ║     ServiceNow Review Workspace       ║
  ╚═══════════════════════════════════════╝
BANNER
printf "${NC}\n"

INSTALL_DIR="$HOME/SAOS"
REPO_URL="https://github.com/workbhaveshpandey-create/saos.git"
ZIP_URL="https://github.com/workbhaveshpandey-create/saos/archive/refs/heads/main.zip"

printf "${CYAN}▸ Setting up SAOS in: ${BOLD}%s${NC}\n" "$INSTALL_DIR"

# 1. Download or update code
if command -v git >/dev/null 2>&1; then
  if [[ -d "$INSTALL_DIR/.git" ]]; then
    printf "  Updating existing installation via git...\n"
    git -C "$INSTALL_DIR" pull --ff-only || true
  else
    printf "  Cloning repository via git...\n"
    git clone "$REPO_URL" "$INSTALL_DIR"
  fi
else
  printf "  Git not detected. Downloading package directly from GitHub...\n"
  TMP_ZIP="/tmp/saos-main.zip"
  TMP_DIR="/tmp/saos-extract"
  rm -rf "$TMP_ZIP" "$TMP_DIR"
  curl -fsSL "$ZIP_URL" -o "$TMP_ZIP"
  mkdir -p "$TMP_DIR"
  unzip -q "$TMP_ZIP" -d "$TMP_DIR"
  mkdir -p "$INSTALL_DIR"
  rsync -a "$TMP_DIR/saos-main/" "$INSTALL_DIR/"
  rm -rf "$TMP_ZIP" "$TMP_DIR"
fi

# 2. Make scripts executable
chmod +x "$INSTALL_DIR/start-saos.command" 2>/dev/null || true

# 3. Create Desktop shortcut
DESKTOP_FILE="$HOME/Desktop/Start SAOS.command"
cat > "$DESKTOP_FILE" << 'EOF'
#!/bin/bash
exec "$HOME/SAOS/start-saos.command"
EOF

chmod +x "$DESKTOP_FILE"
xattr -d com.apple.quarantine "$DESKTOP_FILE" 2>/dev/null || true

printf "\n${GREEN}✔ Installation successful!${NC}\n"
printf "  ${BOLD}Desktop icon created:${NC} ${CYAN}%s${NC}\n" "$DESKTOP_FILE"
printf "  ${YELLOW}You can double-click 'Start SAOS.command' on your Desktop anytime to launch.${NC}\n\n"

# 4. Launch immediately
if [[ "${OSTYPE:-}" == "darwin"* ]]; then
  printf "${CYAN}▸ Launching SAOS on your Desktop...${NC}\n"
  open "$DESKTOP_FILE"
else
  printf "${CYAN}▸ Starting SAOS...${NC}\n"
  exec "$INSTALL_DIR/start-saos.command"
fi
