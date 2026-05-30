#!/usr/bin/env bash
# Cut a new version and publish to npm.
#
# Usage:
#   scripts/publish.sh patch         # 0.1.0 -> 0.1.1  (default)
#   scripts/publish.sh minor         # 0.1.0 -> 0.2.0
#   scripts/publish.sh major         # 0.1.0 -> 1.0.0
#   scripts/publish.sh 1.2.3         # explicit version
#   scripts/publish.sh patch --dry   # print what would happen, don't publish
#   scripts/publish.sh patch --tag beta   # publish under dist-tag 'beta'
#
# Pre-flight:
#   * git working tree must be clean (no uncommitted changes)
#   * branch must be 'main'
#   * `npm whoami` must succeed (logged in to npm)
#   * tests/typecheck/build all pass
#
# After publish:
#   * commits the version bump
#   * creates an annotated git tag (vX.Y.Z)
#   * pushes commit + tag to origin (skippable via --no-push)

set -euo pipefail

cd "$(dirname "$0")/.."

CYAN='\033[36m'; BOLD='\033[1m'; DIM='\033[2m'; RED='\033[31m'; GREEN='\033[32m'; RESET='\033[0m'
step() { printf "${CYAN}${BOLD}==>${RESET} ${BOLD}%s${RESET}\n" "$*"; }
note() { printf "${DIM}    %s${RESET}\n" "$*"; }
ok()   { printf "${GREEN}${BOLD}✓${RESET} %s\n" "$*"; }
fail() { printf "${RED}${BOLD}!! %s${RESET}\n" "$*" >&2; exit 1; }

BUMP="patch"
DIST_TAG="latest"
DRY_RUN=0
PUSH=1
ALLOW_DIRTY=0
ALLOW_BRANCH=0

while [ "$#" -gt 0 ]; do
  case "$1" in
    patch|minor|major) BUMP="$1"; shift ;;
    [0-9]*.[0-9]*.[0-9]*) BUMP="$1"; shift ;;
    --tag)      DIST_TAG="$2"; shift 2 ;;
    --dry)      DRY_RUN=1; shift ;;
    --no-push)  PUSH=0; shift ;;
    --allow-dirty) ALLOW_DIRTY=1; shift ;;
    --allow-branch) ALLOW_BRANCH=1; shift ;;
    -h|--help)
      grep -E '^#( |$)' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *) fail "Unknown arg: $1" ;;
  esac
done

command -v node >/dev/null 2>&1 || fail "node is not installed"
command -v npm  >/dev/null 2>&1 || fail "npm is not installed"
command -v git  >/dev/null 2>&1 || fail "git is not installed"

# Branch + cleanliness checks
BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$BRANCH" != "main" ] && [ "$ALLOW_BRANCH" = "0" ]; then
  fail "On branch '$BRANCH' (not 'main'). Re-run with --allow-branch if intentional."
fi
if [ -n "$(git status --porcelain)" ] && [ "$ALLOW_DIRTY" = "0" ]; then
  fail "Working tree is dirty. Commit/stash first, or re-run with --allow-dirty."
fi

# npm auth check
if ! npm whoami >/dev/null 2>&1; then
  fail "Not logged in to npm. Run 'npm login' first."
fi
ok "npm user: $(npm whoami)"

step "Installing fresh deps"
npm install --no-audit --no-fund

step "Type-checking"
npm run typecheck

step "Building"
npm run build

CURRENT=$(node -p "require('./package.json').version")
note "Current version: $CURRENT"

step "Bumping version ($BUMP)"
if [ "$DRY_RUN" = "1" ]; then
  NEW=$(node -e "const semver=require('semver');const v=require('./package.json').version;console.log(/^\\d/.test('$BUMP')?'$BUMP':semver.inc(v,'$BUMP'))" 2>/dev/null || echo "$BUMP")
  note "Would bump to: $NEW"
  note "(--dry: skipping npm version, publish, commit, tag, push)"
  step "Dry-run summary"
  echo "  bump:     $BUMP"
  echo "  new ver:  $NEW"
  echo "  dist-tag: $DIST_TAG"
  echo "  push:     $([ $PUSH = 1 ] && echo yes || echo no)"
  exit 0
fi

# `npm version` writes package.json, makes a commit + tag of its own — we
# disable the auto-commit so we control the message/tag below.
npm version "$BUMP" --no-git-tag-version --allow-same-version >/dev/null
NEW=$(node -p "require('./package.json').version")
ok "package.json -> $NEW"

step "Publishing to npm (tag: $DIST_TAG)"
npm publish --tag "$DIST_TAG" --access public

step "Committing + tagging"
git add package.json
[ -f package-lock.json ] && git add package-lock.json
git commit -m "release: v$NEW" >/dev/null
git tag -a "v$NEW" -m "v$NEW"
ok "Tagged v$NEW"

if [ "$PUSH" = "1" ]; then
  step "Pushing to origin"
  git push origin "$BRANCH"
  git push origin "v$NEW"
  ok "Pushed commit and tag."
else
  note "Skipped git push (--no-push). Don't forget: git push && git push origin v$NEW"
fi

step "Done. v$NEW published as '$DIST_TAG'."
echo "  Install:  npm install -g swarms-marketplace-cli@$NEW"
