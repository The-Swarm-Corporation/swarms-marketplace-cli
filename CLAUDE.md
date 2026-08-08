# CLAUDE.md

Guidance for Claude Code (and other AI agents) working in this repository.

## What this is

`swarms-market` — the command-line interface for the [Swarms Marketplace](https://swarms.world). It publishes agents/prompts, launches on-chain tokens for them (Solana), lists the caller's products, opens listing pages, and claims trading fees from tokenized products. Published on npm with two bin names: `swarms` and `swarms-market`.

## Tooling: pnpm only

Use **pnpm** for everything in development. Do not use npm or yarn; do not create or commit a `package-lock.json` (the lockfile is `pnpm-lock.yaml`, and `packageManager` in `package.json` pins the pnpm version).

```bash
pnpm install              # install deps (CI uses --frozen-lockfile)
pnpm test                 # run the test suite (tests/*.test.ts, node:test via tsx)
pnpm run typecheck        # tsc --noEmit
pnpm run build            # rm -rf dist && tsc → dist/  (keep the clean step — see below)
pnpm run dev              # tsc --watch
./bin/swarms.js --help    # run the CLI from the checkout
scripts/dev.sh            # install + typecheck + tests + build + smoke test in one shot
```

The only sanctioned npm usage is end-user facing: `scripts/install.sh` installs the published package with `npm install -g swarms-market` on the user's machine. Leave that as npm.

**No rebuild in the dev loop.** `bin/swarms.js` detects `src/index.ts` (present only in a checkout) and runs the TypeScript sources via `tsx`. Edit → re-run. `dist/` matters only for the published package.

**Keep `rm -rf dist` in the build script.** `tsc` never deletes stale output; without the clean step, compiled files from deleted commands ship to npm (this happened — `tokenized.js` and `tree.js` lingered in `dist/` long after their sources were removed).

## Releasing

`pnpm publish` targets the same npm registry as `npm publish`. Maintainer flow:

```bash
pnpm version patch        # or minor / major — the published version must be bumped first
pnpm publish              # runs prepublishOnly (build), enforces clean tree + main branch
pnpm publish --dry-run    # ALWAYS preview the tarball first; it must contain only bin/, dist/, README.md, LICENSE
git push --follow-tags
```

## Verification checklist for any change

1. `pnpm test` — all suites pass. Add/extend tests for any behavior you change.
2. `pnpm run typecheck` — strict mode, must be clean.
3. `pnpm run build` — must succeed.
4. Smoke: `./bin/swarms.js --version` and `./bin/swarms.js --help`.

CI (`.github/workflows/test.yml`) runs exactly these on every push and PR across Node 18/20/22 — if it passes locally with pnpm it should pass in CI.

## Layout

```
src/index.ts            commander wiring, custom help renderer, no-args welcome screen
src/lib/api.ts          post()/get() + ApiError + formatHttpError; ALL network I/O goes through here
src/lib/config.ts       env-var readers; hardcoded API_BASE; swarms.world host allowlist
src/lib/manifest.ts     JSON manifest loading (file path or "-" for stdin)
src/lib/open.ts         browser launcher with URL-safety gate
src/lib/prompt.ts       readline prompt + raw-mode masked secret input
src/lib/theme.ts        chalk palette, banner/mascot, ok/fail/info/label helpers
src/commands/*.ts       one file per subcommand, each exporting register<Name>(program)
bin/swarms.js           entry: tsx over src/ in a checkout, dist/ when installed
tests/*.test.ts         node:test suites; tests/helpers.ts has the shared harness
scripts/dev.sh          dev pipeline; scripts/install.sh is the end-user curl installer
docs/DOC.md             exhaustive reference (endpoints, I/O contracts, error tables)
docs/README.*.md        localized READMEs (zh-CN, ja, hi, de, pl, …)
```

## Architecture facts you need before editing

- **Auth model** (three distinct schemes — do not mix them up):
  - *Bearer* (`SWARMS_API_KEY`): `launch agent/prompt`, `list`, `list-tokenized`, `claim-all`'s enumeration GET. The server resolves the caller's identity from the key — there are no `--user`/username inputs anywhere.
  - *Wallet-signed* (`/api/product/claimfees`): the wallet private key in the body IS the auth. These calls use `{ auth: false }` and must never send the Bearer key.
  - *Hybrid* (`/api/token/launch`): Bearer gates the request AND the wallet key signs the on-chain transaction.
- `get()` is unauthenticated **by default**; opt in with `{ auth: true }`. `post()` is authenticated by default; opt out with `{ auth: false }`. Missing key throws `ApiError(401)` *before* any network call.
- `open <mint>` still calls `/api/get-tokenized-products` without auth (mint → listing resolution). Known asymmetry with `list-tokenized`.
- Exit codes: `0` success, `1` any command failure, `130` SIGINT. Commands set `process.exitCode = 1` and return; they do not call `process.exit()`.
- Tools are not tokenizable — tokenized endpoints deal only in agents and prompts.

## Security invariants (do not "fix" these)

- **The API base URL is hardcoded** to `https://swarms.world` in `src/lib/config.ts`. This is deliberate: no env override may exist, so a stray shell variable can't redirect the Bearer key or a wallet key to another host. Do not add `SWARMS_API_BASE_URL` back, and do not flag the hardcoding as a defect.
- **Sending the wallet private key to swarms.world is intentional** — the server signs transactions server-side by design. Do not flag it as a vulnerability or refactor it away.
- **Never log, persist, or embed secrets in errors.** API key display is masked (first/last 4 chars). Wallet keys come only from `--private-key`, `$SWARMS_WALLET_PRIVATE_KEY`, `$PRIVATE_KEY`, or the hidden prompt, and live in memory only.
- **Browser-launch safety**: any URL handed to `openInBrowser()` must be http(s) with no shell-meta (enforced in `src/lib/open.ts`); server-supplied listing URLs are additionally checked against the swarms.world host allowlist before opening. Preserve both gates.
- **No config files, no telemetry.** All configuration is environment-driven; the CLI never reads or writes config files (`.env` included — `.env.example` is documentation, users must source it themselves).

## Testing conventions

- Runner: Node's built-in `node:test` through tsx (`pnpm test` → `node --import tsx --test tests/*.test.ts`). No test framework dependencies — keep it that way.
- `tests/helpers.ts` provides: `mockFetch()` (replaces `globalThis.fetch`, records url/method/headers/body), `forbidFetch()` (fails on any network call — use it for pre-network validation tests), `withEnv()` (scoped env mutation), `runCommand()` (fresh commander program + console.log capture + ANSI strip + exitCode capture/reset).
- Every test must restore fetch and env in `finally`. Tests never hit the real network or launch a real browser (`open` command tests always pass `--print`).
- When testing output, match on ANSI-stripped text. `label()` pads keys to 14 chars, so a 14-char key like `SWARMS_API_KEY` has **no** space before its value — use `\s*`, not `\s+`.
- Assert auth-header behavior in both directions: Bearer present on authenticated calls, **absent** on wallet-signed calls.

## Code style

- TypeScript strict; `noUnusedLocals`/`noUnusedParameters` are on — the build fails on dead imports.
- ESM throughout; relative imports use `.js` extensions (`from '../lib/api.js'`) even in `.ts` files.
- Commands follow one pattern: `registerX(program)` → commander definition → `ora` spinner around network calls (always `spinner.stop()` in finally/catch before printing) → themed output via `ok`/`fail`/`info`/`label` → `ApiError` handling with a 401 hint pointing at `swarms login`.
- Output style: two-space left margin, `theme.chip()` for headers, `divider()` between sections. Honor `NO_COLOR`, `CI`, `TERM=dumb`, `SWARMS_NO_ANIM`.
- No new runtime dependencies without strong justification (current: chalk, commander, ora).
- Commit messages follow the repo's bracket-tag convention: `[feat][slug][description][improvement][slug][description]…`.

## When you change behavior, update the docs

`README.md` and `docs/DOC.md` document commands, flags, env vars, endpoints, JSON payload shapes, and error tables in detail. A flag or output change is not done until both are updated (DOC.md has per-command Inputs/Outputs/Errors tables and an endpoint auth matrix). New commands also need: a row in README's capabilities table, a `### name` reference section, and registration in `src/index.ts`. Localized READMEs may lag; do not block on them.
