#!/bin/bash
set -euo pipefail

# ─── SAOS — One-Click Launcher ───────────────────────────────────────────────
# Double-click this file to start SAOS. It will auto-install everything needed.
# Keep the Terminal window open while using SAOS. Press Control-C to stop.
# ─────────────────────────────────────────────────────────────────────────────

cd "$(dirname "$0")"
export NEXT_TELEMETRY_DISABLED=1
url="http://127.0.0.1:3000"

# ── Pretty output ────────────────────────────────────────────────────────────

GREEN='\033[1;32m'
CYAN='\033[1;36m'
YELLOW='\033[1;33m'
RED='\033[1;31m'
BOLD='\033[1m'
NC='\033[0m'

on_error() {
  printf "\n  ${RED}✖ Startup stopped on line %s.${NC}\n" "$1"
  read -r -p "Press Return to close..." _
}
trap 'on_error $LINENO' ERR

step()  { printf "\n${CYAN}▸ %s${NC}\n" "$1"; }
ok()    { printf "  ${GREEN}✔ %s${NC}\n" "$1"; }
warn()  { printf "  ${YELLOW}⚠ %s${NC}\n" "$1"; }
fail()  { printf "\n  ${RED}✖ %s${NC}\n" "$1"; read -r -p "Press Return to close..." _; exit 1; }

printf "\n${BOLD}${GREEN}"
cat << 'BANNER'
  ╔═══════════════════════════════════════╗
  ║     SAOS — Starting Up...            ║
  ║     ServiceNow Review Workspace      ║
  ╚═══════════════════════════════════════╝
BANNER
printf "${NC}\n"

# ── Already running? ─────────────────────────────────────────────────────────

if curl --silent --fail --max-time 2 "$url/api/state" | /usr/bin/grep -q '"twinVersion"'; then
  ok "SAOS is already running at $url"
  if [[ "${SAOS_NO_OPEN:-0}" != "1" ]]; then open "$url"; fi
  exit 0
fi

if lsof -nP -iTCP:3000 -sTCP:LISTEN >/dev/null 2>&1; then
  fail "Port 3000 is already in use. Close the other app and try again."
fi

# ── Check / Install: Node.js ────────────────────────────────────────────────

if ! command -v node >/dev/null 2>&1; then
  step "Node.js not found. Installing..."
  if command -v brew >/dev/null 2>&1; then
    brew install node
  elif [[ "$OSTYPE" == "darwin"* ]]; then
    warn "Node.js is missing. Downloading official installer..."
    curl -fsSL https://nodejs.org/dist/v20.18.0/node-v20.18.0.pkg -o /tmp/node-installer.pkg
    open /tmp/node-installer.pkg
    fail "Node.js installer launched. Please complete the installation, then re-run this script."
  else
    fail "Node.js is missing. Please install Node.js 20+ from https://nodejs.org then run this script again."
  fi
  ok "Node.js $(node -v) installed"
else
  ok "Node.js $(node -v) found"
fi

# ── Check / Install: pnpm runner ────────────────────────────────────────────

PNPM_CMD=""
if command -v pnpm >/dev/null 2>&1; then
  PNPM_CMD="pnpm"
  ok "pnpm $(pnpm -v) found"
elif command -v corepack >/dev/null 2>&1 && corepack enable 2>/dev/null && command -v pnpm >/dev/null 2>&1; then
  PNPM_CMD="pnpm"
  ok "pnpm activated via corepack"
else
  step "Configuring pnpm runner (zero-sudo)..."
  PNPM_CMD="npx -y pnpm"
  ok "pnpm ready via npx"
fi

# ── Install dependencies & build ────────────────────────────────────────────

if [[ ! -x node_modules/.bin/next ]]; then
  step "Installing dependencies (first time takes a minute)..."
  $PNPM_CMD approve-builds --all 2>/dev/null || true
  $PNPM_CMD install --frozen-lockfile 2>/dev/null || $PNPM_CMD install || npm install
  ok "Dependencies installed"
fi

if [[ ! -f .next/BUILD_ID ]]; then
  step "Building SAOS (one-time, please wait)..."
  $PNPM_CMD run build || npx next build
  ok "Build complete"
fi

# ── Create Desktop shortcut ─────────────────────────────────────────────────

desktop_shortcut="$HOME/Desktop/Start SAOS.command"
if [[ ! -f "$desktop_shortcut" ]]; then
  saos_dir="$(pwd)"
  cat > "$desktop_shortcut" << SHORTCUT
#!/bin/bash
exec "$saos_dir/start-saos.command"
SHORTCUT
  chmod +x "$desktop_shortcut"
  ok "Desktop shortcut created → 'Start SAOS.command'"
fi

# ── Start the server ────────────────────────────────────────────────────────

step "Starting SAOS..."
./node_modules/.bin/next start -H 127.0.0.1 -p 3000 &
app_pid=$!
trap 'kill "$app_pid" 2>/dev/null || true' EXIT INT TERM

ready=0
for attempt in {1..100}; do
  if curl --silent --fail --max-time 1 "$url/api/state" | /usr/bin/grep -q '"twinVersion"'; then
    ready=1
    break
  fi
  if ! kill -0 "$app_pid" 2>/dev/null; then break; fi
  sleep 0.2
done

if [[ "$ready" != "1" ]]; then
  fail "SAOS did not start. Check the error above and try again."
fi

# ── Done! ────────────────────────────────────────────────────────────────────

printf "\n${BOLD}${GREEN}"
cat << 'READY'
  ╔═══════════════════════════════════════╗
  ║  ✔  SAOS is ready!                   ║
  ║                                       ║
  ║  → Open Settings to connect your      ║
  ║    ServiceNow instance               ║
  ║  → Enter your credentials            ║
  ║  → Load records & start reviewing    ║
  ╚═══════════════════════════════════════╝
READY
printf "${NC}\n"

if [[ "${SAOS_NO_OPEN:-0}" != "1" ]]; then open "$url"; fi
printf "  ${CYAN}Running at: ${BOLD}$url${NC}\n"
printf "  ${YELLOW}Keep this window open. Press Control-C to stop.${NC}\n\n"
wait "$app_pid"
