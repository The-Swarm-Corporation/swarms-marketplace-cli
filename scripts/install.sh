#!/usr/bin/env bash
# Swarms Marketplace CLI installer.
#
#   curl -fsSL https://swarms.world/install.sh | bash
#
# Installs the `swarms` / `swarms-market` CLI globally via npm.
#
# Environment variables:
#   SWARMS_VERSION   Pin to a specific npm version (default: latest).
#   SWARMS_NO_SUDO   Set to "1" to never escalate with sudo.
#
# Flags:
#   --version <v>    Same as SWARMS_VERSION.
#   --help           Show this help.

set -euo pipefail

PKG="swarms-market"
BIN="swarms"
MIN_NODE_MAJOR=18

VERSION="${SWARMS_VERSION:-latest}"

# ---- output helpers ---------------------------------------------------------
if [ -t 1 ] && [ -z "${NO_COLOR:-}" ]; then
  CYAN=$'\033[36m'; BOLD=$'\033[1m'; DIM=$'\033[2m'
  RED=$'\033[31m'; GREEN=$'\033[32m'; YELLOW=$'\033[33m'; RESET=$'\033[0m'
else
  CYAN=""; BOLD=""; DIM=""; RED=""; GREEN=""; YELLOW=""; RESET=""
fi

step() { printf "%s%s==>%s %s%s%s\n" "$CYAN" "$BOLD" "$RESET" "$BOLD" "$*" "$RESET"; }
note() { printf "%s    %s%s\n" "$DIM" "$*" "$RESET"; }
warn() { printf "%s%s!!%s %s\n" "$YELLOW" "$BOLD" "$RESET" "$*" >&2; }
fail() { printf "%s%s!!%s %s\n" "$RED" "$BOLD" "$RESET" "$*" >&2; exit 1; }
ok()   { printf "%s%sOK%s  %s\n" "$GREEN" "$BOLD" "$RESET" "$*"; }

usage() {
  sed -n '2,15p' "$0" | sed 's/^# \{0,1\}//'
}

# ---- args -------------------------------------------------------------------
while [ "$#" -gt 0 ]; do
  case "$1" in
    --version)
      [ "$#" -ge 2 ] || fail "--version requires a value"
      VERSION="$2"; shift 2 ;;
    --version=*)
      VERSION="${1#--version=}"; shift ;;
    -h|--help)
      usage; exit 0 ;;
    *)
      fail "Unknown argument: $1 (try --help)" ;;
  esac
done

# ---- preflight --------------------------------------------------------------
step "Checking your environment"

OS="$(uname -s 2>/dev/null || echo unknown)"
case "$OS" in
  Darwin|Linux) note "OS: $OS" ;;
  *)
    warn "Unsupported OS detected: $OS"
    warn "Windows users: install via 'npm install -g $PKG' from PowerShell or WSL."
    ;;
esac

if ! command -v node >/dev/null 2>&1; then
  cat >&2 <<EOF

${RED}${BOLD}Node.js is required but was not found on your PATH.${RESET}

Install Node.js >= ${MIN_NODE_MAJOR}, then re-run this installer.

  macOS (Homebrew):   brew install node
  Linux (nvm):        curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
                      nvm install --lts
  Or download:        https://nodejs.org/

EOF
  exit 1
fi

NODE_VERSION="$(node -p 'process.versions.node')"
NODE_MAJOR="${NODE_VERSION%%.*}"
if [ "$NODE_MAJOR" -lt "$MIN_NODE_MAJOR" ]; then
  fail "Node >= $MIN_NODE_MAJOR required (found $NODE_VERSION). Upgrade Node and re-run."
fi
note "Node: v$NODE_VERSION"

if ! command -v npm >/dev/null 2>&1; then
  fail "npm not found. It usually ships with Node.js — try reinstalling Node."
fi
note "npm:  v$(npm --version)"

# ---- decide whether sudo is needed ------------------------------------------
NPM_PREFIX="$(npm config get prefix 2>/dev/null || echo /usr/local)"
SUDO=""
if [ "${SWARMS_NO_SUDO:-0}" != "1" ] && [ "$(id -u)" -ne 0 ] && [ ! -w "$NPM_PREFIX" ]; then
  if command -v sudo >/dev/null 2>&1; then
    SUDO="sudo"
    note "npm prefix '$NPM_PREFIX' is not writable; will use sudo for the global install."
  else
    warn "npm prefix '$NPM_PREFIX' is not writable and sudo is unavailable."
    warn "Consider switching to a user-writable prefix, e.g.:"
    warn "  npm config set prefix \"\$HOME/.npm-global\""
    warn "  export PATH=\"\$HOME/.npm-global/bin:\$PATH\""
    fail "Cannot write to npm global prefix."
  fi
fi

# ---- install ----------------------------------------------------------------
step "Installing $PKG@$VERSION"
$SUDO npm install -g "$PKG@$VERSION"

# ---- verify -----------------------------------------------------------------
step "Verifying installation"
if ! command -v "$BIN" >/dev/null 2>&1; then
  warn "'$BIN' was installed but is not on your PATH."
  warn "npm global bin: $(npm bin -g 2>/dev/null || echo "$NPM_PREFIX/bin")"
  warn "Add it to your shell profile, e.g.:"
  warn "  export PATH=\"$(npm bin -g 2>/dev/null || echo "$NPM_PREFIX/bin"):\$PATH\""
  exit 1
fi

INSTALLED_VERSION="$("$BIN" --version 2>/dev/null || echo "unknown")"
ok "$BIN $INSTALLED_VERSION installed"

cat <<EOF

${BOLD}Next steps:${RESET}
  1. Get an API key:        ${CYAN}$BIN api-key${RESET}
  2. Export it:             ${CYAN}export SWARMS_API_KEY="sk-…"${RESET}
  3. Verify auth:           ${CYAN}$BIN login${RESET}
  4. See all commands:      ${CYAN}$BIN --help${RESET}

Docs: https://github.com/The-Swarm-Corporation/swarms-marketplace-cli
EOF
