#!/usr/bin/env bash
# Build the CLI for local development and (optionally) link it globally.
#
# Usage:
#   scripts/dev.sh               # install deps, type-check, build, smoke-test
#   scripts/dev.sh --link        # additionally `npm link` so `swarms` resolves locally
#   scripts/dev.sh --watch       # build in watch mode after the initial install
#   scripts/dev.sh --clean       # rm -rf dist + node_modules before building
#
# Exits non-zero on any failure so this is safe to chain with `&&` in your workflow.

set -euo pipefail

cd "$(dirname "$0")/.."

CYAN='\033[36m'; BOLD='\033[1m'; DIM='\033[2m'; RED='\033[31m'; RESET='\033[0m'
step() { printf "${CYAN}${BOLD}==>${RESET} ${BOLD}%s${RESET}\n" "$*"; }
note() { printf "${DIM}    %s${RESET}\n" "$*"; }
fail() { printf "${RED}${BOLD}!! %s${RESET}\n" "$*" >&2; exit 1; }

LINK=0
WATCH=0
CLEAN=0
for arg in "$@"; do
  case "$arg" in
    --link)  LINK=1 ;;
    --watch) WATCH=1 ;;
    --clean) CLEAN=1 ;;
    -h|--help)
      grep -E '^#( |$)' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *) fail "Unknown flag: $arg" ;;
  esac
done

command -v node >/dev/null 2>&1 || fail "node is not installed"
command -v npm  >/dev/null 2>&1 || fail "npm is not installed"

NODE_MAJOR=$(node -p 'process.versions.node.split(".")[0]')
if [ "$NODE_MAJOR" -lt 18 ]; then
  fail "Node >= 18 required (you have $(node -v))"
fi

if [ "$CLEAN" = "1" ]; then
  step "Cleaning dist/ and node_modules/"
  rm -rf dist node_modules
fi

step "Installing dependencies"
npm install --no-audit --no-fund

step "Type-checking"
npm run typecheck

step "Building (tsc -> dist/)"
npm run build

step "Smoke test"
node bin/swarms.js --version
node bin/swarms.js --help >/dev/null
note "Help text rendered without error."

if [ "$LINK" = "1" ]; then
  step "Linking globally so 'swarms' resolves to this checkout"
  npm link
  note "Run 'npm unlink -g swarms-marketplace-cli' to undo."
fi

if [ "$WATCH" = "1" ]; then
  step "Entering watch mode (Ctrl-C to exit)"
  exec npm run dev
fi

step "Done. Try:  node bin/swarms.js --help"
