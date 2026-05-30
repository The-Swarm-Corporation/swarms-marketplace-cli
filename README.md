# swarms-marketplace-cli

[![npm version](https://img.shields.io/npm/v/swarms-marketplace-cli.svg)](https://www.npmjs.com/package/swarms-marketplace-cli)
[![node](https://img.shields.io/node/v/swarms-marketplace-cli.svg)](https://nodejs.org)
[![license](https://img.shields.io/npm/l/swarms-marketplace-cli.svg)](./LICENSE)

The official command-line interface for the [Swarms Marketplace](https://swarms.world). Publish agents, prompts, and tokens, browse the catalog, and collect creator fees from your tokenized products — entirely from your terminal, with first-class support for scripting, CI/CD, and headless environments.

```
  ▎ Tip: Get an API key with swarms api-key, then export SWARMS_API_KEY="…"

     ▄▄    ▄▄
    ██████████        Swarms Marketplace  v0.1.0
   ██▀██▄▄██▀██       Launch agents, prompts, tokens. Claim fees.
   █▀█▀▀██▀▀█▀█       API https://swarms.world  ·  KEY sk-1234…abcd
   ▀          ▀       ? swarms <command> --help
```
---

## What you can do

`swarms` is a fully scriptable client over the Swarms Marketplace HTTP API. It maps directly onto the operations that drive a marketplace business:

- **Publish products at scale.** Push agents, prompts, and tools to the marketplace from a single command, a JSON manifest, or a directory of manifests in CI. No browser, no manual form.
- **Launch on-chain tokens.** Tokenize an agent in one call, including ticker, quote currency, image, and fee mode. The launch transaction is signed with a wallet key supplied at runtime.
- **Collect creator fees, alone or in bulk.** Claim fees on a single token, on every token you own, or sweep every tokenized mint on the marketplace in one batch with continue-on-failure semantics.
- **Audit your catalog.** Render your published products as a structured tree, filter for tokenized-only, and emit JSON for downstream dashboards.
- **Discover the marketplace.** Page through every tokenized product (no API key required) as a flat list or as JSON, suitable for indexing, mirroring, or analytics.
- **Automate everything.** Every command is non-interactive when the right environment variables are set, returns standard exit codes, and disables animations / prompts when running outside a TTY or under `$CI`.

### Capabilities at a glance

| Capability                         | Command                                          | Auth required          |
| ---------------------------------- | ------------------------------------------------ | ---------------------- |
| Open API keys page                 | `swarms api-key`                                 | None                   |
| Verify environment auth            | `swarms login` · `swarms whoami`                 | API key                |
| Publish an agent                   | `swarms launch agent`                            | API key                |
| Publish a prompt                   | `swarms launch prompt`                           | API key                |
| Launch on-chain token for an agent | `swarms launch token`                            | API key + wallet key   |
| List your published products       | `swarms list`                                    | API key                |
| Browse every tokenized product     | `swarms list-tokenized` (alias `swarms tokens`)  | None                   |
| Claim fees on a single mint        | `swarms claim --ca <mint>`                       | Wallet key             |
| Batch-claim fees                   | `swarms claim-all [--user … \| --global]`        | API key + wallet key   |
| JSON output for any read command   | `--json` flag                                    | Same as parent command |

## Compatibility

| Requirement   | Supported                                                              |
| ------------- | ---------------------------------------------------------------------- |
| Node.js       | ≥ 18 (uses native `fetch`)                                              |
| Package mgrs  | `npm`, `pnpm`, `yarn`, `bun`                                            |
| OS            | macOS, Linux, Windows (PowerShell + WSL); macOS / Linux are primary    |
| Terminals     | Any VT100-compatible terminal; Unicode block characters required        |
| CI runners    | GitHub Actions, GitLab CI, CircleCI, Buildkite, Jenkins, etc.           |

## Installation

```bash
# Global install (recommended for daily / shell use)
npm install -g swarms-marketplace-cli

# Or run without installing (handy for CI)
npx swarms-marketplace-cli@latest --help

# Pin to a specific version in CI
npm install -g swarms-marketplace-cli@0.1.0
```

After install, verify:

```bash
swarms --version
swarms --help
```

### Uninstall

```bash
npm uninstall -g swarms-marketplace-cli
```

## Quick start

```bash
# 1. Get an API key (opens https://swarms.world/platform/api-keys)
swarms api-key

# 2. Export it
export SWARMS_API_KEY="sk-…"
export SWARMS_USERNAME="your-username"   # optional, but skips --user on most commands

# 3. Verify auth
swarms login

# 4. Publish your first agent from a manifest
swarms launch agent \
  --name "Hello Agent" \
  --description "Says hi" \
  --code-file ./agent.py \
  --free

# 5. See what you've published
swarms list

# 6. Browse the marketplace
swarms list-tokenized
```

## Authentication

Obtain a key at <https://swarms.world/platform/api-keys> (or run `swarms api-key`). Keys can be created, named, and revoked from that page.

```bash
export SWARMS_API_KEY="sk-…"
swarms whoami      # confirms key is loaded; prints the first/last 4 chars
```

Read-only commands that do not modify your account (notably `list-tokenized` and the `api-key` opener) work without an API key. Every other command requires one.

## Configuration

All configuration is environment-driven. The CLI does not read or write any config file.

| Variable                     | Purpose                                                                                       | Default                |
| ---------------------------- | --------------------------------------------------------------------------------------------- | ---------------------- |
| `SWARMS_API_KEY`             | Bearer token for marketplace endpoints (publish, list, account-scoped reads).                  | _required for auth_    |
| `SWARMS_USERNAME`            | Default `--user` for `list` / `claim-all`. Lets `swarms list` work with no flags.              | _(pass --user)_        |
| `SWARMS_API_BASE_URL`        | Override the API host. Use for self-hosted deployments or staging environments.                | `https://swarms.world` |
| `SWARMS_WALLET_PRIVATE_KEY`  | Wallet private key (base58) for on-chain operations. Held in memory only.                      | _(prompts if unset)_   |
| `PRIVATE_KEY`                | Alias for `SWARMS_WALLET_PRIVATE_KEY`, for compatibility with common `.env` conventions.       | _(prompts if unset)_   |
| `SWARMS_NO_ANIM`             | Set to any value to disable the welcome animation, even in an interactive terminal.            | _(animate if TTY)_     |
| `CI`                         | Automatically disables the welcome animation when set (set by every major CI provider).        | _(detected)_           |
| `TERM=dumb`                  | Also disables the animation.                                                                   | _(detected)_           |
| `NO_COLOR`                   | Honored by `chalk` — set to disable ANSI colors entirely. Useful in some CI log viewers.       | _(colors on by default)_ |

## Command reference

```
swarms api-key                Open the API keys page in your browser
swarms login                  Verify SWARMS_API_KEY is set
swarms whoami                 Show the active key (masked) and base URL

swarms launch agent           Publish an agent
swarms launch prompt          Publish a prompt
swarms launch token           Tokenize an agent on chain

swarms list                   Your published products, as a red/white tree
swarms list-tokenized         Every tokenized product on the marketplace
                              (alias: swarms tokens)

swarms claim                  Claim fees for one tokenized product (by token mint)
swarms claim-all              Claim fees across many products
```

Run `swarms <command> --help` for the canonical flag list at any time. Sub-command help (`swarms launch --help`, `swarms list-tokenized --help`, etc.) uses the same rendering.

### `api-key`

```
swarms api-key [--no-open]
```

Opens <https://swarms.world/platform/api-keys> in your default browser so you can create or copy a key. Pass `--no-open` to print the URL without launching a browser (useful on headless boxes).

### `login`

```
swarms login
```

Verifies that `SWARMS_API_KEY` is set in your environment and prints the masked key + base URL. Does **not** make a network call.

### `whoami`

```
swarms whoami
```

Shorter form of `login`. Prints the active API key (masked) and the base URL.

### `launch agent`

Publishes an agent to the marketplace via `POST /api/add-agent`.

```
swarms launch agent
  [-m, --manifest <path | ->]
  [--name <name>]
  [--description <text>]
  [--code-file <path>]
  [--tags <csv>]
  [--category <name>]
  [--language <name>]
  [--free]
  [--price-usd <usd>]
```

- `--manifest <path>` — Path to a JSON manifest (see [Manifest schemas](#manifest-schemas)). Use `-` to read from stdin.
- All other flags override individual manifest fields, so a single manifest can be parameterized at the command line.
- `--code-file <path>` — Read the agent's code from a file; written into the `agent` field of the payload.
- Validates locally before sending: requires at minimum `name` (≥ 2 chars) and `description`.

### `launch prompt`

Publishes a prompt to the marketplace via `POST /api/add-prompt`.

```
swarms launch prompt
  [-m, --manifest <path | ->]
  [--name <name>]
  [--description <text>]
  [--prompt-file <path>]
  [--tags <csv>]
  [--category <name>]
  [--free]
  [--price-usd <usd>]
```

Same shape as `launch agent`, but takes a `--prompt-file` for the prompt text instead of `--code-file`.

### `launch token`

Creates an on-chain token for an agent via `POST /api/token/launch`.

```
swarms launch token
  [-m, --manifest <path | ->]
  [--name <name>]
  [--description <text>]
  [--ticker <SYMBOL>]
  [--quote-mint <SOL|USDC>]
  [--fee-selection <market|frenzy>]
  [--image <urlOrDataUrl>]
  [--private-key <base58>]
```

- Requires a wallet private key (base58). Sourced in order: `--private-key` → `$SWARMS_WALLET_PRIVATE_KEY` → `$PRIVATE_KEY` → interactive (hidden-input) prompt.
- `--ticker` must be 1–10 characters, uppercase letters and digits only.
- `--quote-mint` defaults to `SOL`. `USDC` is supported.
- `--fee-selection frenzy` lists the token on the Frenzy leaderboard with 2× fees.

### `list`

Your published products, rendered as a tree grouped by type.

```
swarms list
  [-u, --user <username>]
  [--user-id <id>]
  [--tokenized]
  [--no-ca]
  [--json]
```

- `--user` defaults to `$SWARMS_USERNAME` if unset.
- `--user-id` accepts a UUID as an alternative to `--user`.
- `--tokenized` filters to products with a token mint.
- `--no-ca` hides the truncated token address column.
- `--json` outputs the raw API payload for piping into other tools.

Example output:

```
  ▎ @kye  ·  12 products  ·  4 tokenized  ·  https://swarms.world

● @kye
├─ agents (5)
│ ├─ My Research Agent  RESCH  TOKEN  $5.00  7xyz…abc123
│ ├─ Code Reviewer      REVIEW TOKEN  free   3abc…xyz456
│ └─ Image Captioner    free
├─ prompts (4)
│ └─ …
└─ tools (3)
  └─ …
```

### `list-tokenized`

Every tokenized product on the marketplace. Public read; no API key required. Aliased as `swarms tokens` for brevity.

```
swarms list-tokenized
  [--type <all|agent|prompt|tool>]
  [--limit <n>]     # 1..500, default 100
  [--page <n>]      # default 1
  [--json]
```

`--json` payload shape (stable, field names mirror the upstream API):

```json
{
  "total": 1247,
  "page": 1,
  "limit": 100,
  "total_pages": 13,
  "counts": { "agents": 854, "prompts": 231, "tools": 162 },
  "products": [
    {
      "id": "…",
      "name": "Research Agent",
      "type": "agent",
      "token_address": "7xyz…abc123",
      "token_symbol": "RESCH",
      "pool_address": "9pq…",
      "user_id": "…",
      "status": "approved",
      "created_at": "2026-05-30T12:00:00Z",
      "listing_url": "https://swarms.world/agent/…"
    }
  ]
}
```

### `claim`

Claim accrued creator fees for a single tokenized product, identified by its token mint (contract address).

```
swarms claim
  --ca <mint>
  [--private-key <base58>]
```

- Submits a fee-claim transaction signed with your wallet key against the marketplace fee endpoint.
- Prints the transaction signature and the SOL amount claimed.
- The token mint is the public identifier of the product; no API key is sent for this endpoint (the wallet signature is the authentication).

Example output:

```
  ✓ Claim submitted.
  Signature      4xZv…aBc7
  Claimed        0.214312 SOL
  Totals         unclaimed=0  claimed=0.214312  lifetime=3.812455
```

### `claim-all`

Claim fees across many products in one command, reusing one wallet key for the batch.

```
swarms claim-all
  [-u, --user <username>]
  [--user-id <id>]
  [--global]
  [--private-key <base58>]
  [--dry-run]
```

| Mode             | Source of mints                                                                                                                                                              |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| User-scoped      | `POST /api/user-products` for the given `--user` / `--user-id` / `$SWARMS_USERNAME`. Only mints owned by that account are attempted.                                          |
| `--global`       | `GET /api/get-tokenized-products` to enumerate every tokenized mint on the marketplace. Your wallet only collects fees from products it owns; unowned mints no-op silently.   |

- `--dry-run` prints the list of mints that would be claimed and exits without submitting any transaction.
- Continue-on-failure: a single mint failing does not abort the batch. The final line reports `N claimed · M nothing-to-claim · K failed · X SOL total`.
- Exit code is `1` if any individual claim failed, `0` otherwise.

Example tail:

```
  ✓ Research Agent     7xyz…abc123  +0.214312 SOL  4xZv…aBc7
  ✓ Code Reviewer      3abc…xyz456  +0.000821 SOL  9pqW…dEf1
  ✓ Summarizer         9aaa…bbb999  +0.000000 SOL  (nothing to claim)
  ✗ Image Captioner    7zzz…ccc111  HTTP 429 rate limit
  ─────────────────────────────────────────────────────
   DONE   3 claimed · 1 nothing-to-claim · 1 failed · 0.215133 SOL total
```

## Manifest schemas

`launch agent` and `launch prompt` accept JSON manifests. Required fields are **bold**.

### Agent manifest

```ts
{
  name: string,                    // ≥ 2 chars, required
  description: string,             // required
  agent?: string,                  // agent code (or pass --code-file)
  language?: string,               // e.g. "python", "typescript"
  category?: string,
  tags?: string,                   // comma-separated
  is_free?: boolean,               // default: true
  price_usd?: number,              // required when is_free=false
  useCases?: [{ title: string, description: string }],
  requirements?: [{ package: string, installation: string }],
  links?: string[],
  image_url?: string,
  image_base64?: string,

  // Tokenization (optional; for the canonical flow use `swarms launch token`)
  tokenized_on?: boolean,
  ticker?: string,
  creator_wallet?: string,
  private_key?: string,
  fee_selection?: 'market' | 'frenzy',
  quote_mint?: 'SOL' | 'USDC'
}
```

### Prompt manifest

```ts
{
  name: string,                    // ≥ 2 chars, required
  description: string,             // required
  prompt: string,                  // required (or use --prompt-file)
  category?: string,
  tags?: string,
  is_free?: boolean,
  price_usd?: number,
  useCases?: [{ title: string, description: string }],
  links?: string[]
}
```

## Output formats

| Surface           | Default                                  | Machine-readable                                |
| ----------------- | ---------------------------------------- | ----------------------------------------------- |
| `list`            | Tree, grouped by type                    | `--json` → raw `/api/user-products` payload     |
| `list-tokenized`  | Paged flat list                          | `--json` → `{ total, counts, products, … }`     |
| `launch *`        | Result summary (`id`, `listing_url`)     | Fields printed line-by-line; parseable          |
| `claim`           | Summary + signature + SOL claimed        | Always prints structured fields                 |
| `claim-all`       | Per-mint status + totals                 | Exit code reflects per-mint failures            |
| `whoami` / `login`| Masked key + base URL                    | Exit code reflects auth presence (`0` / `1`)    |
| Errors            | Red `✗` + message to stderr              | Use exit codes to detect                        |

All `--json` outputs are stable JSON suitable for `jq` filtering or programmatic consumption. Field names mirror the upstream API. Examples:

```bash
# Top 5 tokenized agents on the marketplace by recency
swarms list-tokenized --type agent --limit 5 --json | jq '.products[].name'

# All token CAs you own
swarms list --json | jq -r '
  (.agents + .prompts + .tools)[] |
  select(.token_address) |
  .token_address
'
```

## Workflows

### Publishing from CI

Use the CLI in any pipeline that has Node ≥ 18 and the `SWARMS_API_KEY` secret available.

```yaml
# .github/workflows/publish-agents.yml
name: Publish agents
on:
  push:
    branches: [main]
    paths: ['agents/**/manifest.json']

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm install -g swarms-marketplace-cli@latest
      - name: Publish
        env:
          SWARMS_API_KEY: ${{ secrets.SWARMS_API_KEY }}
        run: |
          for f in agents/*/manifest.json; do
            swarms launch agent --manifest "$f"
          done
```

### Scheduled fee collection

Run `claim-all` on a cron schedule to sweep accrued fees nightly. The wallet key should come from a secret manager.

```yaml
# .github/workflows/claim-fees.yml
on:
  schedule: [{ cron: '0 3 * * *' }]   # daily at 03:00 UTC

jobs:
  claim:
    runs-on: ubuntu-latest
    steps:
      - run: npm install -g swarms-marketplace-cli@latest
      - env:
          SWARMS_API_KEY: ${{ secrets.SWARMS_API_KEY }}
          SWARMS_USERNAME: ${{ vars.SWARMS_USERNAME }}
          PRIVATE_KEY: ${{ secrets.SOLANA_WALLET_KEY }}
        run: swarms claim-all
```

A bare cron entry on Linux:

```cron
0 3 * * *  SWARMS_API_KEY=... SWARMS_USERNAME=you PRIVATE_KEY=... swarms claim-all >> /var/log/swarms-claim.log 2>&1
```

### Bulk publishing a directory of manifests

```bash
find ./agents -name 'manifest.json' -print0 \
  | xargs -0 -I{} swarms launch agent --manifest {}
```

Or with `--json` for programmatic post-processing:

```bash
for f in agents/*/manifest.json; do
  swarms launch agent --manifest "$f"
done > publish-log.txt
```

## Security model

The CLI is designed for use in environments where credentials must be auditable and reproducible.

**Authentication.**  
The API key is read exclusively from `$SWARMS_API_KEY` and sent as `Authorization: Bearer <key>` over HTTPS. The CLI does not write, cache, or persist the API key anywhere on disk. Keys are managed at <https://swarms.world/platform/api-keys> and can be revoked at any time.

**Wallet private key handling.**  
The wallet private key required by `claim`, `claim-all`, and `launch token` is sourced in the following order: explicit `--private-key` flag → `$SWARMS_WALLET_PRIVATE_KEY` → `$PRIVATE_KEY` → interactive prompt (hidden input, no echo, no history). The key is held in process memory for the duration of one command and is **never** written to disk, logged, or cached. The CLI does not have any "remember my wallet" mode.

For shell-history hygiene: prefer the env-var or interactive-prompt paths over `--private-key`, since process arguments may be visible to other users via `ps` on some systems and end up in shell history files.

**Transport.**  
All requests use HTTPS to your configured `SWARMS_API_BASE_URL` (default `https://swarms.world`). The CLI does not disable TLS verification under any flag.

**Logging.**  
Successful operations print summary information (transaction signature, IDs, masked key prefixes) to stdout. Errors print to stderr. The wallet private key is never included in any log line. Network errors include the URL that was contacted and the HTTP status code.

**Telemetry.**  
The CLI sends no telemetry of any kind. The only network calls it makes are to the marketplace API endpoints listed in [Command reference](#command-reference), and only when a command that needs them is invoked.

**Threat model.**  
The CLI assumes a trustworthy local environment (the user controls their own machine). It does not defend against malware running with the same UID as the user, nor against compromise of the API host. Within that scope it minimizes credential exposure: env vars rather than disk, hidden input for wallet keys, no caching.

## Exit codes

| Code | Meaning                                                                          |
| ---- | -------------------------------------------------------------------------------- |
| 0    | Success                                                                          |
| 1    | Command error — invalid input, validation failure, API non-2xx response          |
| 130  | Interrupted by SIGINT (Ctrl-C); the cursor is restored on the way out            |

`claim-all` returns 1 if any individual claim failed, even if others succeeded; check the summary line at the bottom of the output for per-mint status.

## Performance and limits

- Marketplace endpoints are rate-limited. The CLI does not retry automatically; in batch loops, cap parallelism with `xargs -P` or sleep between iterations.
- `claim-all --global` makes one network call per tokenized mint on the marketplace. At current volumes that is on the order of seconds per mint; plan accordingly when scheduling.
- `list-tokenized` is paged; `--limit 500` is the maximum per page. Mirror the full catalog by walking pages until `has_next` is `false`.
- `list` returns up to 100 products of each type per call. Larger accounts should use `--user-id` and consume `--json` output.
- The Node.js process exits as soon as the current command completes; no background work continues after exit.

## Troubleshooting

**`SWARMS_API_KEY is not set`**  
You need an API key for every command except `api-key`, `login`, `whoami`, and `list-tokenized`. Run `swarms api-key` to grab one, then `export SWARMS_API_KEY="…"`.

**HTTP 401 Unauthorized**  
The API key was rejected. Causes: typo in the env var, key revoked at <https://swarms.world/platform/api-keys>, or the key belongs to a different environment than `$SWARMS_API_BASE_URL`.

**HTTP 429 Too Many Requests**  
You've hit a rate limit. The CLI does not retry automatically. Back off and retry; for batch jobs (`claim-all --global`, large `bulk launch agent` loops), add a small `sleep` between calls.

**`Invalid privateKey: could not decode base58 secret key`**  
The wallet private key must be a base58-encoded secret key (the format Phantom shows in "Export Private Key"). 64-byte JSON arrays and base64 are not accepted by the claim endpoint.

**No animation in my terminal**  
Animation auto-disables when stdout is not a TTY, `$CI` is set, or `$TERM=dumb`. Run in a real terminal to see it. Force-off with `SWARMS_NO_ANIM=1`.

**`Command not found: swarms` after install**  
Your npm global bin directory is not on `$PATH`. Run `npm config get prefix` and add `<prefix>/bin` to your shell's `PATH`.

**Self-hosted / staging deployment**  
Set `SWARMS_API_BASE_URL` to the host of your deployment. All commands will route there instead of `https://swarms.world`.

## Development

```bash
git clone https://github.com/The-Swarm-Corporation/swarms-marketplace-cli
cd swarms-marketplace-cli

# Scripted (recommended)
scripts/dev.sh              # install + type-check + build + smoke-test
scripts/dev.sh --link       # also `npm link` so `swarms` resolves to this checkout
scripts/dev.sh --watch      # build in watch mode
scripts/dev.sh --clean      # wipe dist/ and node_modules first

# Manual equivalents
npm install
npm run typecheck
npm run build
./bin/swarms.js --help
```

### Project layout

```
src/
  index.ts              commander wiring + custom help renderer
  lib/
    api.ts              fetch wrapper with Bearer auth + ApiError
    config.ts           env-only config (API key, username, base URL, wallet key)
    prompt.ts           readline + hidden-input helpers
    theme.ts            brand colors + animated banner / mascot
    manifest.ts         JSON manifest loader (file path or "-")
  commands/
    api-key.ts          opens the API keys page
    login.ts            checks SWARMS_API_KEY
    whoami.ts           prints masked key + base
    launch-agent.ts     POST /api/add-agent
    launch-prompt.ts    POST /api/add-prompt
    launch-token.ts     POST /api/token/launch
    list.ts             POST /api/user-products → user products as a tree
    list-tokenized.ts   GET  /api/get-tokenized-products → global flat browser
    claim.ts            POST /api/product/claimfees (one mint)
    claim-all.ts        enumerate + claim across user-scoped or global mints
bin/
  swarms.js             node entry; checks Node ≥ 18, then loads dist
scripts/
  dev.sh                local development build + smoke test
  publish.sh            version bump + npm publish + git tag
```

## Versioning and support

This project follows [Semantic Versioning](https://semver.org). Breaking changes are reserved for major releases; new commands and flags ship in minor releases; bug fixes in patch releases. Changelog entries live in [GitHub Releases](https://github.com/The-Swarm-Corporation/swarms-marketplace-cli/releases).

For bug reports, feature requests, or security disclosures, open an issue at <https://github.com/The-Swarm-Corporation/swarms-marketplace-cli/issues>.

### Publishing a new version (maintainers)

```bash
scripts/publish.sh patch              # 0.1.0 → 0.1.1 (default)
scripts/publish.sh minor              # 0.1.0 → 0.2.0
scripts/publish.sh major              # 0.1.0 → 1.0.0
scripts/publish.sh 1.2.3              # explicit version
scripts/publish.sh patch --dry        # preview; doesn't publish
scripts/publish.sh patch --tag beta   # publish under dist-tag 'beta'
```

The publish script enforces a clean tree, `main` branch, and a successful `npm whoami` before doing anything. It runs typecheck + build, then `npm publish`, commits the version bump, tags it, and pushes (override with `--no-push`, `--allow-dirty`, `--allow-branch`).

## License

Apache License 2.0. See [LICENSE](./LICENSE).
