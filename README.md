# swarms-marketplace-cli

`swarms` is the command-line companion for the [Swarms Marketplace](https://swarms.world). Launch agents, prompts, and tokens, and claim Jupiter trading fees from your tokenized products — all from your terminal.

> Three colors. Black, red, white. No persistent secrets on disk.

```
  ▎ Tip: Get an API key with swarms api-key, then export SWARMS_API_KEY="…"

  ┌────┐
  │████│   Swarms Marketplace  v0.1.0
  │█▓▓█│   Launch agents, prompts, tokens. Claim fees.
  │████│   API https://swarms.world  ·  KEY sk-1234…abcd
  └────┘
```

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
   swarms login            # confirms env var is set, prints masked key + base URL
   swarms whoami           # same info, shorter form
   ```

### Environment variables

| Variable                       | Purpose                                                                                       | Default                |
| ------------------------------ | --------------------------------------------------------------------------------------------- | ---------------------- |
| `SWARMS_API_KEY`               | Bearer token for marketplace endpoints (publish/list)                                          | _required_             |
| `SWARMS_USERNAME`              | Default username for `list` / `claim-all` so you don't need `--user` each time                  | _(prompts via --user)_ |
| `SWARMS_API_BASE_URL`          | Override the API host (useful for self-hosted / staging)                                       | `https://swarms.world` |
| `SWARMS_WALLET_PRIVATE_KEY`    | Wallet private key for `claim` / `claim-all` / `launch token`. Base58.                         | _(prompts if unset)_   |
| `PRIVATE_KEY`                  | Alias for `SWARMS_WALLET_PRIVATE_KEY` (convenience for `.env` files)                            | _(prompts if unset)_   |

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

swarms list                   List your published products
swarms tokenized              List every tokenized product on the marketplace
swarms tree                   Same data, rendered as a red/white tree

swarms claim                  Claim trading fees for one tokenized product
swarms claim-all              Claim trading fees across many products
```

Run `swarms <command> --help` for the full flag list at any time.

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

```bash
# All your products (use your swarms.world username)
swarms list --user kye

# Just your tokenized ones
swarms list --user kye --tokenized

# Filter by type
swarms list --user kye --type agent
swarms list --user kye --type prompt --limit 100
```

### Browsing every tokenized product (global, no auth)

```bash
swarms tokenized                       # 100 most recent, all types
swarms tokenized --type agent          # tokenized agents only
swarms tokenized --limit 500 --page 2  # next page

# Same data, but as a tree grouped by type
swarms tree
swarms tree --per-type 50 --no-ca
swarms tree --json                     # counts only, machine-readable
```

The tree looks like:

```
  ▎ Swarms Marketplace  ·  1247 tokenized  ·  https://swarms.world

● swarms.world
├─ agents (25 of 854 shown)
│ ├─ My Research Agent  RESCH   7xyz…abc123
│ ├─ Code Reviewer      REVIEW  3abc…xyz456
│ └─ …
├─ prompts (25 of 231 shown)
│ └─ …
└─ tools (25 of 162 shown)
  └─ …
```

### Claiming fees

```bash
# One product, by token mint (CA). Prompts for wallet key.
swarms claim --ca 7xyz…xyz

# Non-interactive
export PRIVATE_KEY="…base58…"
swarms claim --ca 7xyz…xyz

# Every product you own, batched
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
  // Tokenization (optional, set via `swarms launch token` instead for a richer flow)
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
- **Wallet private key** — prompted on stdin when needed, kept in process memory for the duration of one command, never persisted. Pass `--private-key` (or set the env var) for non-interactive use only when you trust your shell history / `.env` setup.
- All requests use HTTPS to your configured `SWARMS_API_BASE_URL` (default `https://swarms.world`).

---

## Development

```bash
git clone https://github.com/kyegomez/swarms-marketplace-cli
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
scripts/publish.sh patch          # 0.1.0 → 0.1.1 (default)
scripts/publish.sh minor          # 0.1.0 → 0.2.0
scripts/publish.sh major          # 0.1.0 → 1.0.0
scripts/publish.sh 1.2.3          # explicit version
scripts/publish.sh patch --dry    # preview; doesn't publish
scripts/publish.sh patch --tag beta   # publish under dist-tag 'beta'
```

The publish script enforces a clean tree, `main` branch, and an `npm whoami` login before doing anything. It runs typecheck + build, then `npm publish`, then commits + tags + pushes (`--no-push` to skip the push).

### Project layout

```
src/
  index.ts            commander wiring + custom help renderer
  lib/
    api.ts            fetch wrapper with Bearer auth + ApiError
    config.ts         env-only config (API key, base URL, wallet key)
    prompt.ts         tiny readline + hidden-input helpers
    theme.ts          chalk-based brand colors + the compact card banner
    manifest.ts       JSON manifest loader (file path or "-")
  commands/
    api-key.ts        opens the API keys page in the browser
    login.ts          checks SWARMS_API_KEY
    whoami.ts         prints the masked key + base
    launch-agent.ts   POST /api/add-agent
    launch-prompt.ts  POST /api/add-prompt
    launch-token.ts   POST /api/token/launch
    list.ts           POST /api/user-products (per-user)
    tokenized.ts      GET  /api/get-tokenized-products (global, paged)
    tree.ts           same data as `tokenized`, rendered as a tree
    claim.ts          POST /api/product/claimfees (one mint)
    claim-all.ts      enumerate + claim across user-scoped or global mints
bin/
  swarms.js           node entry; Node ≥ 18 check, then imports dist
scripts/
  dev.sh              local development build + smoke test
  publish.sh          version bump + npm publish + git tag
```

## License

MIT. See [LICENSE](./LICENSE).
