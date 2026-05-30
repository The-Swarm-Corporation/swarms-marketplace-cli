# swarms-marketplace-cli

`swarms` is the command-line companion for the [Swarms Marketplace](https://swarms.world). Publish agents, prompts, and tokens, and claim Jupiter trading fees from your tokenized products — all from your terminal.

> Three colors. Black, red, white. No persistent secrets on disk.

```
  ▎ Tip: Get an API key with swarms api-key, then export SWARMS_API_KEY="…"

     ▄▄    ▄▄
    ██████████        Swarms Marketplace  v0.1.0
   ██▀██▄▄██▀██       Launch agents, prompts, tokens. Claim fees.
   █▀█▀▀██▀▀█▀█       API https://swarms.world  ·  KEY sk-1234…abcd
   ▀          ▀       ? swarms <command> --help
```

The invader marches when stdout is a real TTY. Set `SWARMS_NO_ANIM=1` (or pipe to a file / `less`) to skip the animation.

---

## Install

Requires **Node.js ≥ 18**.

```bash
# global (recommended for daily use)
npm install -g swarms-marketplace-cli

# or one-shot
npx swarms-marketplace-cli --help
```

Verify:

```bash
swarms --version
swarms --help
```

## Authenticate

`swarms` reads your API key from **`SWARMS_API_KEY`** in your environment. There is no `login` form and no config file — the env var is the source of truth.

1. Grab a key from the marketplace:

   ```bash
   swarms api-key          # opens https://swarms.world/platform/api-keys
   ```

   (`--no-open` prints the URL without launching a browser.)

2. Export it in your shell:

   ```bash
   export SWARMS_API_KEY="sk-…"
   ```

   Persist it in `~/.zshrc` / `~/.bashrc` / `~/.config/fish/config.fish` to keep it across sessions.

3. Verify:

   ```bash
   swarms login            # confirms the env var is set, prints masked key + base URL
   swarms whoami           # same info, shorter form
   ```

### Environment variables

| Variable                     | Purpose                                                                                                | Default                |
| ---------------------------- | ------------------------------------------------------------------------------------------------------ | ---------------------- |
| `SWARMS_API_KEY`             | Bearer token for marketplace endpoints (publish, list)                                                  | _required_             |
| `SWARMS_USERNAME`            | Default `--user` for `list` / `claim-all` so you don't have to pass `--user` each time                  | _(pass --user)_        |
| `SWARMS_API_BASE_URL`        | Override the API host (useful for self-hosted / staging)                                                | `https://swarms.world` |
| `SWARMS_WALLET_PRIVATE_KEY`  | Wallet private key for `claim` / `claim-all` / `launch token`. Base58.                                  | _(prompts if unset)_   |
| `PRIVATE_KEY`                | Alias for `SWARMS_WALLET_PRIVATE_KEY` (convenience for `.env` files)                                    | _(prompts if unset)_   |
| `SWARMS_NO_ANIM`             | Set to any value to disable the welcome animation, even in a TTY                                        | _(animate if TTY)_     |

The wallet key is **never written to disk** by the CLI — it lives in process memory for the lifetime of one command.

---

## Commands

```
swarms api-key                Open the API keys page in your browser
swarms login                  Verify SWARMS_API_KEY is set
swarms whoami                 Show the active key (masked) + base URL

swarms launch agent           Publish an agent
swarms launch prompt          Publish a prompt
swarms launch token           Tokenize an agent on Solana

swarms list                   Your published products, grouped as a red/white tree
swarms list-tokenized         Every tokenized product on the marketplace (alias: `tokens`)

swarms claim                  Claim trading fees for one tokenized product
swarms claim-all              Claim trading fees across many products
```

Run `swarms <command> --help` for the full flag list at any time. Sub-command help (e.g. `swarms launch --help`) renders the same red/white card so you get the same look everywhere.

### Publishing

Publishing commands accept a JSON **manifest** (`-m / --manifest <path>` or `-m -` for stdin) plus a handful of override flags for common fields.

```bash
# examples/agent.json
cat > examples/agent.json <<'JSON'
{
  "name": "My Research Agent",
  "description": "Searches arXiv and summarizes papers.",
  "agent": "# python code here, or use --code-file",
  "language": "python",
  "category": "research",
  "tags": "research, arxiv, summarization",
  "is_free": true,
  "links": []
}
JSON

swarms launch agent --manifest examples/agent.json

# Override fields on the command line
swarms launch agent \
  --manifest examples/agent.json \
  --price-usd 5 \
  --code-file ./agent.py \
  --tags "research,llm"

# Pipe from stdin
cat examples/agent.json | swarms launch agent -m -
```

Same shape for prompts:

```bash
swarms launch prompt \
  --name "Concise summarizer" \
  --description "Rewrites long text in 3 bullets" \
  --prompt-file ./summarizer.txt \
  --category "writing" \
  --free
```

### Tokenization

`swarms launch token` hits `/api/token/launch` to create an on-chain token for an agent. It needs:

- a **wallet private key** (base58) to sign the launch
- the agent **name**, **description**, and a **ticker** (1–10 uppercase chars)
- optionally `--quote-mint SOL|USDC` and `--fee-selection market|frenzy`

The key is prompted securely if you don't pass `--private-key` and no env var is set:

```bash
swarms launch token \
  --name "Research Agent" \
  --description "Summarizes arXiv papers" \
  --ticker RESCH \
  --fee-selection frenzy
# → prompts: "Paste wallet private key (base58, hidden, used only for this tx):"
```

Or non-interactively:

```bash
export PRIVATE_KEY="…base58…"
swarms launch token --name "…" --description "…" --ticker RESCH
```

### Listing your products

`swarms list` renders your published products as a tree grouped by type. Defaults `--user` from `$SWARMS_USERNAME`, so once you set that env var it's a no-arg command.

```bash
export SWARMS_USERNAME=kye
swarms list                           # tree of everything you've published

# Or explicit
swarms list --user kye

# Just your tokenized products
swarms list --user kye --tokenized

# Hide the truncated token addresses on the right side
swarms list --user kye --no-ca

# Raw JSON for piping / scripting
swarms list --user kye --json
```

Output looks like:

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

### Browsing every tokenized product (global, no auth)

`swarms list-tokenized` walks every tokenized mint on the marketplace. Aliased as `swarms tokens` for brevity. No API key required.

```bash
swarms list-tokenized                       # 100 most recent, all types
swarms tokens                               # same thing, shorter
swarms list-tokenized --type agent          # tokenized agents only
swarms list-tokenized --limit 500 --page 2  # next page
swarms list-tokenized --json                # raw payload
```

### Claiming fees

```bash
# One product, by token mint (CA). Prompts for wallet key.
swarms claim --ca 7xyz…xyz

# Non-interactive
export PRIVATE_KEY="…base58…"
swarms claim --ca 7xyz…xyz

# Every product you own, batched (uses $SWARMS_USERNAME if set)
swarms claim-all --user kye

# Walk every tokenized mint on the marketplace
# (your wallet only collects fees from mints it owns; the rest no-op)
swarms claim-all --global

# Preview without claiming
swarms claim-all --user kye --dry-run
```

`claim` and `claim-all` POST to `/api/product/claimfees`, which signs via Jupiter `partner/claim-fee` and submits the transaction. The wallet private key is in memory only.

---

## Manifest schema

Both `launch agent` and `launch prompt` accept JSON manifests. Required fields are **bold**.

### Agent manifest

```ts
{
  name: string,            // ≥ 2 chars, required
  description: string,     // required
  agent?: string,          // code (or pass --code-file)
  language?: string,       // e.g. "python", "typescript"
  category?: string,
  tags?: string,           // comma-separated
  is_free?: boolean,       // default: true
  price_usd?: number,      // required when is_free=false
  useCases?: [{ title: string, description: string }],
  requirements?: [{ package: string, installation: string }],
  links?: string[],
  image_url?: string,
  image_base64?: string,
  // Tokenization (optional; for a richer flow use `swarms launch token`)
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
  name: string,            // ≥ 2 chars, required
  description: string,     // required
  prompt: string,          // required (or use --prompt-file)
  category?: string,
  tags?: string,
  is_free?: boolean,
  price_usd?: number,
  useCases?: [{ title: string, description: string }],
  links?: string[]
}
```

---

## Security notes

- **API key** (`SWARMS_API_KEY`) — sourced from your environment only. The CLI never writes it to disk.
- **Wallet private key** — prompted on stdin when needed, kept in process memory for the duration of one command, never persisted. Pass `--private-key` (or set `$PRIVATE_KEY` / `$SWARMS_WALLET_PRIVATE_KEY`) for non-interactive use only when you trust your shell history / `.env` setup.
- All requests use HTTPS to your configured `SWARMS_API_BASE_URL` (default `https://swarms.world`).

---

## Roadmap

Open issues track the next batch of commands. Comments / PRs welcome:

- [#1 `economy`](https://github.com/The-Swarm-Corporation/swarms-marketplace-cli/issues/1) — marketplace mcap, 24h volume, top tokens
- [#2 `frenzy`](https://github.com/The-Swarm-Corporation/swarms-marketplace-cli/issues/2) — frenzy-mode leaderboard
- [#3 `trending`](https://github.com/The-Swarm-Corporation/swarms-marketplace-cli/issues/3) — recent trades, with `--watch`
- [#4 `fees <ca>`](https://github.com/The-Swarm-Corporation/swarms-marketplace-cli/issues/4) — peek at unclaimed/claimed/lifetime fees without claiming
- [#5 `earnings`](https://github.com/The-Swarm-Corporation/swarms-marketplace-cli/issues/5) — aggregate earnings across products + timeline
- [#6 `init`](https://github.com/The-Swarm-Corporation/swarms-marketplace-cli/issues/6) — scaffold a manifest in cwd
- [#7 `validate`](https://github.com/The-Swarm-Corporation/swarms-marketplace-cli/issues/7) — dry-run a manifest through the server schema
- [#8 `open`](https://github.com/The-Swarm-Corporation/swarms-marketplace-cli/issues/8) — open a product listing in your browser

---

## Development

```bash
git clone https://github.com/The-Swarm-Corporation/swarms-marketplace-cli
cd swarms-marketplace-cli

# scripted (recommended)
scripts/dev.sh              # install + type-check + build + smoke-test
scripts/dev.sh --link       # also `npm link` so `swarms` resolves to this checkout
scripts/dev.sh --watch      # build in watch mode
scripts/dev.sh --clean      # wipe dist/ and node_modules first

# manual equivalents
npm install
npm run typecheck
npm run build
./bin/swarms.js --help
```

### Publishing a new version

```bash
scripts/publish.sh patch              # 0.1.0 → 0.1.1 (default)
scripts/publish.sh minor              # 0.1.0 → 0.2.0
scripts/publish.sh major              # 0.1.0 → 1.0.0
scripts/publish.sh 1.2.3              # explicit version
scripts/publish.sh patch --dry        # preview; doesn't publish
scripts/publish.sh patch --tag beta   # publish under dist-tag 'beta'
```

The publish script enforces a clean tree, `main` branch, and a successful `npm whoami` before doing anything. It runs typecheck + build, then `npm publish`, then commits + tags + pushes (`--no-push` to skip the push, `--allow-dirty` / `--allow-branch` to override the guards).

### Project layout

```
src/
  index.ts              commander wiring + custom Claude-Code-style help renderer
  lib/
    api.ts              fetch wrapper with Bearer auth + ApiError
    config.ts           env-only config (API key, username, base URL, wallet key)
    prompt.ts           tiny readline + hidden-input helpers
    theme.ts            chalk-based brand colors + the animated banner / mascot
    manifest.ts         JSON manifest loader (file path or "-")
  commands/
    api-key.ts          opens the API keys page in the browser
    login.ts            checks SWARMS_API_KEY
    whoami.ts           prints the masked key + base
    launch-agent.ts     POST /api/add-agent
    launch-prompt.ts    POST /api/add-prompt
    launch-token.ts     POST /api/token/launch
    list.ts             POST /api/user-products → user products as a tree
    list-tokenized.ts   GET  /api/get-tokenized-products → global flat browser
    claim.ts            POST /api/product/claimfees (one mint)
    claim-all.ts        enumerate + claim across user-scoped or global mints
bin/
  swarms.js             node entry; Node ≥ 18 check, then imports dist
scripts/
  dev.sh                local development build + smoke test
  publish.sh            version bump + npm publish + git tag
```

### Banner / theme internals

- `theme.ts` exports `banner()` for the static card (used in `--help`) and `animatedBanner()` for the no-args welcome (TTY-only). The mascot is a 5-row half-block ASCII space invader with two frames (`FRAME_A` / `FRAME_B`); the welcome path cycles through them six times at 170ms each using `\x1b[<n>A` cursor moves.
- The custom `SwarmsHelp` class in `src/index.ts` is attached recursively to every sub-command at startup so `swarms`, `swarms launch`, `swarms list-tokenized`, etc. all share the same `▎ Section` headers and indent.
- Three colors only: brand red (`#FF2D2D`), white (`#F5F5F5`), dim gray (`#5A5A5A`). Avoid blues/greens/yellows in new output to keep the look coherent.

## License

MIT. See [LICENSE](./LICENSE).
