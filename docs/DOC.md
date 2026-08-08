# Swarms Marketplace CLI — Reference Documentation

> Comprehensive command, argument, environment, manifest, transport, error, and security reference for the `swarms` / `swarms-market` command-line interface.
>
> This document is the canonical, ground-truth reference. It is generated against the source under `src/` and is meant to be exhaustive. For an opinionated quick-start, see [README.md](./README.md); for the end-to-end demo see [example.sh](./example.sh).

---

## 1. Package overview

| Field | Value |
| --- | --- |
| npm package | `swarms-market` |
| Binaries installed | `swarms`, `swarms-market` (identical) |
| Entry point | `bin/swarms.js` |
| Minimum Node.js | `>= 18.0.0` (uses native `fetch`) |
| Module type | ESM (`"type": "module"`) |
| Runtime deps | `chalk@^5`, `commander@^12`, `ora@^8` |
| Dev deps | `typescript@^5.5`, `tsx@^4.22`, `@types/node@^20` |
| License | Apache-2.0 |
| Repository | <https://github.com/The-Swarm-Corporation/swarms-marketplace-cli> |
| Marketplace host | `https://swarms.world` (hardcoded; not configurable) |

The `bin/swarms.js` shim auto-detects whether it is running from a working checkout (`src/index.ts` present) and runs TypeScript sources via `tsx`, otherwise it falls back to compiled `dist/index.js` (the form shipped on npm). See `bin/swarms.js`.

---

## 2. Installation and invocation

### Install

| Method | Command |
| --- | --- |
| Global (recommended) | `npm install -g swarms-market` |
| No-install run | `npx swarms-market@latest <command>` |
| Pinned in CI | `npm install -g swarms-market@<version>` |
| Yarn | `yarn global add swarms-market` |
| pnpm | `pnpm add -g swarms-market` |
| Bun | `bun add -g swarms-market` |

### Invoke

| Form | Behavior |
| --- | --- |
| `swarms` | If no args: prints the animated banner and the full help body. |
| `swarms <command>` | Runs the command. |
| `swarms <command> --help` | Prints command-specific help in the brand-styled layout. |
| `swarms -h` / `swarms --help` | Top-level help (banner + commands + options). |
| `swarms -v` / `swarms --version` | Prints the version string (from `package.json`). |
| `swarms-market <command>` | Identical alias for `swarms`. Useful when the `swarms` binary collides with the Python `swarms` package. |

### Exit immediately after a command

The process exits as soon as the dispatched command resolves. No background work continues. See `src/index.ts:121-132` for the entry sequence.

---

## 3. Global flags and behavior

| Flag | Type | Available on | Description |
| --- | --- | --- | --- |
| `-v`, `--version` | boolean | root | Prints `pkg.version` and exits 0. |
| `-h`, `--help` | boolean | every command | Prints brand-styled help and exits 0. The renderer is a custom `Help` subclass at `src/index.ts:24-76`. |

There are **no other** truly-global flags. Each subcommand declares its own options. The CLI never reads a config file; behavior is determined entirely by arguments and environment variables (§4).

`--no-open` and `--no-foo`-style flags appear on individual commands. Commander interprets `--no-<x>` as setting `opts.<x> = false`; the documentation for each command lists its specific use.

---

## 4. Environment variables

All configuration is environment-driven. The CLI does not read or write any config file. Implementation lives in `src/lib/config.ts`.

| Variable | Read by | Required? | Default | Behavior |
| --- | --- | --- | --- | --- |
| `SWARMS_API_KEY` | every authenticated command | Yes (for auth) | unset | Sent as `Authorization: Bearer <key>` on all authenticated requests. Trimmed; empty string treated as unset. |
| `SWARMS_WALLET_PRIVATE_KEY` | `claim`, `claim-all`, `launch token` | No (prompts if unset) | unset | Base58 wallet secret key. Preferred name. Never persisted. |
| `PRIVATE_KEY` | `claim`, `claim-all`, `launch token` | No (prompts if unset) | unset | Fallback wallet secret key. Matches common `.env` conventions. Used only when `SWARMS_WALLET_PRIVATE_KEY` is unset. |
| `SWARMS_NO_ANIM` | banner renderer | No | unset | Any truthy value disables the welcome animation. |
| `CI` | banner renderer | No | unset (set by CI providers) | Truthy disables animation. |
| `TERM` | banner renderer | No | terminal-dependent | If equal to `dumb`, animation is disabled. |
| `NO_COLOR` | `chalk` | No | unset | Disables ANSI colors entirely (chalk standard). |

The marketplace base URL is **hardcoded** to `https://swarms.world`. There is no environment override; see `src/lib/config.ts:8` and `:33`. This is by design — the Bearer key and any wallet private key transmitted by the CLI must always go to `swarms.world`.

Resolution priority for wallet keys (per `getWalletPrivateKey()` at `src/lib/config.ts:55-61`):

1. Explicit `--private-key <base58>` flag on the command.
2. `$SWARMS_WALLET_PRIVATE_KEY`.
3. `$PRIVATE_KEY`.
4. Interactive hidden-input prompt.

---

## 5. Authentication model

| Surface | Mechanism | Notes |
| --- | --- | --- |
| Marketplace API (publish, list, account-scoped reads) | `Authorization: Bearer $SWARMS_API_KEY` | Set per request by `src/lib/api.ts` `post()` / `get()`. Missing key throws `ApiError(401)` before any network call. |
| Caller-scoped tokenized list (`/api/get-tokenized-products`) | `Authorization: Bearer $SWARMS_API_KEY` | Server resolves `user_id` from the key and returns only that user's tokenized products. Missing key → 401. |
| Fee claim (`/api/product/claimfees`) | Wallet signature (private key in body) | API key is **not** sent (`auth: false`); wallet is the identity. |
| Token launch (`/api/token/launch`) | API key **and** wallet private key in body | Hybrid: Bearer auth gates the request; the on-chain transaction is signed by the wallet. |

A masked form of the API key (first 4 / last 4 characters) appears in `whoami` and `login` output. The key is never written to disk and is not echoed when supplied via prompt.

---

## 6. Network transport

| Property | Value |
| --- | --- |
| Implementation | `src/lib/api.ts` |
| Base URL | `https://swarms.world` (hardcoded) |
| HTTP client | `globalThis.fetch` (Node ≥ 18 builtin) |
| Default headers | `Accept: application/json`, `Content-Type: application/json` (POST), `User-Agent: swarms-marketplace-cli/<version> (+repo; node/<ver>)` |
| Body encoding | `JSON.stringify(body ?? {})` |
| Response parsing | Reads `.text()`, then attempts `JSON.parse`; falls back to raw string. |
| Error class | `ApiError extends Error { status: number; details?: unknown }` |
| TLS | Standard Node.js TLS; never disabled. |
| Retries | None. Caller is responsible for retry / backoff. |
| Timeout | No explicit client timeout; relies on platform defaults. |

The error formatter at `src/lib/api.ts:40-81` (`formatHttpError`) emits multi-line messages that include the HTTP method, URL, status + status text, any body-extracted message (`error` / `message` / `details` / `detail` fields), a body snippet (truncated at 300 chars) when no field matches, and rate-limit headers (`retry-after`, `x-ratelimit-*`) when present. For `429` it appends a `Retry-After` hint or a default `back off 30-60s` line.

---

## 7. Command reference

For each command this section documents: synopsis, behavior, inputs (flags / args / env / stdin), outputs (stdout / stderr / exit code / side effects), API endpoint touched, and validation rules.

### 7.1 `api-key`

**Synopsis**

```
swarms api-key [--no-open]
swarms keys    [--no-open]   # alias
```

**Behavior**: Opens <https://swarms.world/platform/api-keys> in the default browser so you can create or copy a key. Prints next-step shell-export instructions. Source: `src/commands/api-key.ts`.

**Inputs**

| Name | Kind | Type | Default | Required | Notes |
| --- | --- | --- | --- | --- | --- |
| `--no-open` | flag | boolean | open in browser | No | When set, prints the URL but does not launch a browser. |

**Outputs**

| Channel | Content |
| --- | --- |
| stdout | `URL` line with the API keys page, hints for `export SWARMS_API_KEY` and `swarms login`, plus `Opening in your default browser…` when launched. |
| Side effect | OS-specific browser-launch via `openInBrowser` (`src/lib/open.ts`): `open` on macOS, `rundll32 url.dll,FileProtocolHandler` on Windows, `xdg-open` on Linux. |
| Exit code | `0` on success; `0` even when the browser launcher cannot spawn (the URL is still printed). |

**Network**: None.

---

### 7.2 `login`

**Synopsis**

```
swarms login
```

**Behavior**: Verifies that `SWARMS_API_KEY` is set and prints the masked key + base URL. Source: `src/commands/login.ts`. Does **not** make a network call.

**Inputs**

| Name | Kind | Type | Default | Required | Notes |
| --- | --- | --- | --- | --- | --- |
| `$SWARMS_API_KEY` | env | string | — | Yes | If unset, command exits 1. |

**Outputs**

| Channel | Content |
| --- | --- |
| stdout (success) | `API base   <url>` and `SWARMS_API_KEY  <abcd…wxyz>` followed by `Ready. The CLI will use the key in $SWARMS_API_KEY.` |
| stdout (failure) | `SWARMS_API_KEY is not set.` + export hint + `https://swarms.world/platform/api-keys` link. |
| Exit code | `0` when set, `1` when unset. |

---

### 7.3 `whoami`

**Synopsis**

```
swarms whoami
```

**Behavior**: Shorter form of `login`. Prints the active key (masked) and the base URL. Source: `src/commands/whoami.ts`.

**Inputs**

| Name | Kind | Type | Default | Required | Notes |
| --- | --- | --- | --- | --- | --- |
| `$SWARMS_API_KEY` | env | string | — | No (but exit 1 if unset) | Read-only. |

**Outputs**

| Channel | Content |
| --- | --- |
| stdout (set) | `API base   https://swarms.world`, `SWARMS_API_KEY  <abcd…wxyz>` |
| stdout (unset) | `SWARMS_API_KEY is not set in your environment.` + `Run swarms api-key to grab one.` |
| Exit code | `0` when set, `1` when unset. |

---

### 7.4 `launch agent`

**Synopsis**

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

**Behavior**: Publishes an agent to the marketplace via `POST /api/add-agent`. Source: `src/commands/launch-agent.ts`.

A manifest may supply every field; individual flags **override** manifest fields. `--code-file` reads file contents into the `agent` field of the payload. If neither `useCases` nor `use_cases` are set, an empty `useCases: [{ title: '', description: '' }]` placeholder is added so the endpoint accepts the payload.

**Inputs**

| Name | Kind | Type | Default | Required | Notes |
| --- | --- | --- | --- | --- | --- |
| `-m`, `--manifest <path>` | option | string or `-` | unset | No | Path to a JSON manifest, or `-` to read JSON from stdin. See §8.1. |
| `--name <name>` | option | string (≥ 2 chars) | from manifest | Yes (here or in manifest) | Overrides `manifest.name`. |
| `--description <text>` | option | string (non-empty) | from manifest | Yes (here or in manifest) | Overrides `manifest.description`. |
| `--code-file <path>` | option | filesystem path | from manifest | No | File contents become `payload.agent`. Errors if the file is missing. |
| `--tags <csv>` | option | comma-separated string | from manifest | No | Sent verbatim; the server splits CSVs. |
| `--category <name>` | option | string | from manifest | No | |
| `--language <name>` | option | string | from manifest | No | e.g. `python`, `typescript`. |
| `--free` | flag | boolean | `is_free=true` if set | No | Forces `payload.is_free = true`. |
| `--price-usd <usd>` | option | number ≥ 0 | from manifest | No | Sets `payload.is_free=false`, `payload.price_usd=<n>`. Rejects non-finite or negative. |
| `$SWARMS_API_KEY` | env | string | — | Yes | Bearer auth on `POST /api/add-agent`. |
| stdin | stream | JSON | unset | No | Only consumed when `--manifest -`. |

**Outputs**

| Channel | Content |
| --- | --- |
| stdout (success) | `Agent published.`, `ID <uuid>`, `Listing <url>` (when returned). |
| stdout (failure) | API error message (multi-line including method/url/status/body); on 401, hint `Run swarms login to set an API key.` |
| Exit code | `0` on success, `1` on local validation failure or API non-2xx. |

**Local validation** (before any network call):

| Check | Behavior |
| --- | --- |
| `payload.name` is non-empty string with `.trim().length ≥ 2` | Else `Error: Missing or short --name (need ≥ 2 chars).` |
| `payload.description` is non-empty string | Else `Error: Missing --description.` |
| `--price-usd` parses to a finite, non-negative number | Else `Error: --price-usd must be a non-negative number` |
| `--code-file` exists | Else `Error: Code file not found: <path>` |

**Endpoint**: `POST https://swarms.world/api/add-agent`

---

### 7.5 `launch prompt`

**Synopsis**

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

**Behavior**: Publishes a prompt via `POST /api/add-prompt`. Same shape as `launch agent`, but with `--prompt-file` for the prompt text. Source: `src/commands/launch-prompt.ts`.

**Inputs**

| Name | Kind | Type | Default | Required | Notes |
| --- | --- | --- | --- | --- | --- |
| `-m`, `--manifest <path>` | option | string or `-` | unset | No | JSON manifest path or stdin. See §8.2. |
| `--name <name>` | option | string (≥ 2 chars) | from manifest | Yes (here or in manifest) | |
| `--description <text>` | option | string | from manifest | Yes (here or in manifest) | |
| `--prompt-file <path>` | option | filesystem path | from manifest | Yes (here or in manifest as `prompt`) | File contents become `payload.prompt`. |
| `--tags <csv>` | option | comma-separated string | from manifest | No | |
| `--category <name>` | option | string | from manifest | No | |
| `--free` | flag | boolean | `is_free=true` if set | No | |
| `--price-usd <usd>` | option | number ≥ 0 | from manifest | No | Sets `is_free=false`, `price_usd=<n>`. |
| `$SWARMS_API_KEY` | env | string | — | Yes | Bearer auth. |

**Outputs**

| Channel | Content |
| --- | --- |
| stdout (success) | `Prompt published.`, `ID <uuid>`, `Listing <url>` (when returned). |
| stdout (failure) | API error message; on 401, `Run swarms login to set an API key.` |
| Exit code | `0` on success, `1` on validation failure or API non-2xx. |

**Local validation**:

| Check | Behavior |
| --- | --- |
| `payload.name` non-empty, `.trim().length ≥ 2` | Else `Error: Missing or short --name (need ≥ 2 chars).` |
| `payload.description` non-empty string | Else `Error: Missing --description.` |
| `payload.prompt` non-empty string | Else `Error: Missing --prompt-file or "prompt" in manifest.` |
| `--prompt-file` exists | Else `Error: Prompt file not found: <path>` |

**Endpoint**: `POST https://swarms.world/api/add-prompt`

---

### 7.6 `launch token`

**Synopsis**

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

**Behavior**: Launches a tokenized agent on Solana via `POST /api/token/launch`. Source: `src/commands/launch-token.ts`. Requires both `$SWARMS_API_KEY` (Bearer) and a wallet private key (in body).

**Inputs**

| Name | Kind | Type | Default | Required | Notes |
| --- | --- | --- | --- | --- | --- |
| `-m`, `--manifest <path>` | option | string or `-` | unset | No | JSON manifest, or `-` for stdin. |
| `--name <name>` | option | string (≥ 2 chars) | from manifest | Yes (here or in manifest) | |
| `--description <text>` | option | string | from manifest | Yes (here or in manifest) | |
| `--ticker <SYMBOL>` | option | string `/^[A-Za-z0-9]{1,10}$/` | from manifest | Yes (here or in manifest) | Letters/digits only, 1–10 chars. |
| `--quote-mint <SOL\|USDC>` | option | enum string | manifest or server default (`SOL`) | No | Bonding-curve quote currency. Written as `quote_mint`. |
| `--fee-selection <market\|frenzy>` | option | enum string | manifest or server default (`market`) | No | `frenzy` lists on the Frenzy leaderboard with 2× fees. Written as `fee_selection`. |
| `--image <urlOrDataUrl>` | option | string | from manifest | No | URL (http/https) or base64 `data:` URL. |
| `--private-key <base58>` | option | base58 string | env / prompt | Yes | Resolution order: flag → `$SWARMS_WALLET_PRIVATE_KEY` → `$PRIVATE_KEY` → interactive prompt. Written into payload as `private_key`. |
| `$SWARMS_API_KEY` | env | string | — | Yes | Bearer auth. |
| `$SWARMS_WALLET_PRIVATE_KEY` / `$PRIVATE_KEY` | env | base58 | — | No | Fallback for `--private-key`. |

**Outputs**

| Channel | Content |
| --- | --- |
| stdout (success) | `Token launched.`, `Agent ID <uuid>`, `Token CA <mint>`, `Pool <pool>`, `Listing <url>` (each printed when returned). |
| stdout (failure) | API error message; on 401, `Run swarms login to set an API key.` |
| Exit code | `0` on success, `1` on validation or API failure. |

**Local validation**:

| Check | Behavior |
| --- | --- |
| `payload.name` non-empty, `.trim().length ≥ 2` | Else `Error: Missing or short --name (need ≥ 2 chars).` |
| `payload.description` non-empty | Else `Error: Missing --description.` |
| `payload.ticker` matches `/^[A-Za-z0-9]{1,10}$/` | Else `Error: --ticker must be 1–10 chars (letters/numbers only).` |
| Private key is non-empty after env / prompt fallback | Else `Error: A wallet private key is required.` |

**Endpoint**: `POST https://swarms.world/api/token/launch`

---

### 7.7 `list`

**Synopsis**

```
swarms list
  [--tokenized]
  [--json]
```

**Behavior**: Renders the caller's published products as a red/white tree grouped by type (`agents`, `prompts`, `tools`). The user is resolved server-side from `SWARMS_API_KEY` — there is no username or user-id input. Source: `src/commands/list.ts`. Calls `POST /api/user-products` with `{ page: 1, limit: 100, product_type: 'all' }`.

**Inputs**

| Name | Kind | Type | Default | Required | Notes |
| --- | --- | --- | --- | --- | --- |
| `--tokenized` | flag | boolean | off | No | Filters output to products with `business_model === 'tokenized'`. |
| `--json` | flag | boolean | off | No | Prints the raw API payload instead of the tree. |
| `$SWARMS_API_KEY` | env | string | — | **Yes** | Bearer auth; the server uses it to resolve the caller. |

**Outputs**

| Channel | Content |
| --- | --- |
| stdout (default) | Header `▎ @<username>  ·  N products  ·  K tokenized  ·  <base-url>` followed by a tree (see §10.1). |
| stdout (`--json`) | The full `/api/user-products` response, pretty-printed (`JSON.stringify(data, null, 2)`). |
| stdout (no products) | `No products yet — try swarms launch agent to publish.` (or, with `--tokenized`, `No tokenized products yet — try swarms launch token.`). |
| Exit code | `0` on success, `1` on API 401 or any other API non-2xx. |

**Errors**

| Condition | Behavior |
| --- | --- |
| API 401 | Adds hint: `Run swarms login to verify your API key.` |
| API 404 | Body `User associated with API key not found` — the key did not resolve to a user record. |

**Endpoint**: `POST https://swarms.world/api/user-products`

**Request body**:

```jsonc
{
  "page": 1,
  "limit": 100,
  "product_type": "all"
}
```

---

### 7.8 `list-tokenized` (alias `tokens`)

**Synopsis**

```
swarms list-tokenized
  [--type <all|agent|prompt>]
  [--limit <n>]    # 1..500, default 100
  [--page <n>]     # default 1
  [--json]

swarms tokens    # alias
```

**Behavior**: Fetches the **caller's** tokenized products (paged). Requires `SWARMS_API_KEY`; the server resolves `user_id` from the key and scopes results to that user. Tools are not tokenizable and are excluded. Source: `src/commands/list-tokenized.ts`. Calls `GET /api/get-tokenized-products?type=…&limit=…&page=…` with `Authorization: Bearer <key>`.

**Inputs**

| Name | Kind | Type | Default | Required | Notes |
| --- | --- | --- | --- | --- | --- |
| `--type <…>` | option | enum string | `all` | No | Server-validated. Accepted: `all`, `agent`, `prompt` (plurals also accepted). |
| `--limit <n>` | option | integer 1–500 | `100` | No | Server caps at 500. |
| `--page <n>` | option | integer ≥ 1 | `1` | No | Page number, 1-indexed. |
| `--json` | flag | boolean | off | No | Print raw JSON instead of the formatted view. |
| `SWARMS_API_KEY` | env | string | — | **Yes** | Bearer token; the server uses it to resolve the caller. |

**Outputs**

| Channel | Content |
| --- | --- |
| stdout (default) | Header `▎ TOKENIZED   total page p/T · N shown` + `owner=<username>  agents=A  prompts=P` line + a divider + per-product `[type] Name`, `Token CA`, and `URL` lines. When more pages exist, prints `More results — re-run with --page <next>.` |
| stdout (`--json`) | The full response (see §10.2). |
| Exit code | `0` on success, `1` on API non-2xx. On `401`, also prints `Run \`swarms login\` to set an API key.` |

**Endpoint**: `GET https://swarms.world/api/get-tokenized-products?type=<…>&limit=<…>&page=<…>`

Server errors: `400` for invalid `type` (`{ "error": "Invalid 'type'. Use one of: all, agent, prompt (plurals also accepted)." }`); `401` for missing or invalid key; `404` when no user record matches the key.

---

### 7.9 `open`

**Synopsis**

```
swarms open <ref>
  [-t, --type <agent|prompt|tool>]
  [--print]
  [--no-open]
```

**Behavior**: Opens a product's listing page in the default browser. Source: `src/commands/open.ts`.

`<ref>` is either:

- A **product UUID** (`/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i`). Requires `--type` so the CLI can construct `{base}/{type}/{id}` without a network call.
- A **token mint / contract address** (base58, 32–44 chars, regex `/^[1-9A-HJ-NP-Za-km-z]{32,44}$/`). Resolved against `/api/get-tokenized-products` (up to 20 pages × 500 per page = 10,000 mints) to find the matching `listing_url`.

**Inputs**

| Name | Kind | Type | Default | Required | Notes |
| --- | --- | --- | --- | --- | --- |
| `<ref>` | positional | UUID or base58 mint | — | Yes | Must match one of the two regexes. |
| `-t`, `--type <agent\|prompt\|tool>` | option | enum string | unset | Yes when `<ref>` is a UUID | Skips the marketplace lookup. |
| `--print` | flag | boolean | off | No | Print the resolved URL but do not launch the browser. |
| `--no-open` | flag | boolean | off | No | Alias for `--print` (commander populates `opts.open = false`). |

**Outputs**

| Channel | Content |
| --- | --- |
| stdout | When resolved via mint: `▎ <TYPE>  <Name>` line; always: `URL  <url>`. When launched: `Opening in your default browser…`. When the launcher cannot run: `Could not launch a browser; the URL is printed above.` |
| Side effect | OS browser launch via `openInBrowser` after host allowlist + URL safety checks (§12). |
| Exit code | `0` on success or print-only; `1` on validation, resolution failure, or refused URL. |

**Errors**

| Condition | Message |
| --- | --- |
| `<ref>` matches neither UUID nor base58 mint | `Could not recognize "<ref>" as a UUID or a base58 token mint.` |
| UUID without `--type` | `UUIDs need a type. Re-run with --type agent|prompt|tool.` + example |
| `--type` not in `{agent, prompt, tool}` | `--type must be one of agent | prompt | tool (got "<value>").` |
| Mint not found in any page | `No tokenized product found for mint "<ref>".` |
| Resolved `listing_url` not `https:` or not a `swarms.world` host | `Refusing to open untrusted listing URL: <url>` |
| Browser launcher refuses the URL (non-http(s) or shell-meta) | `Could not launch a browser; the URL is printed above.` |

**Endpoint**: `GET https://swarms.world/api/get-tokenized-products?type=all&limit=500&page=<n>` (only when `<ref>` is a mint).

---

### 7.10 `claim`

**Synopsis**

```
swarms claim
  --ca <mint>
  [--private-key <base58>]
```

**Behavior**: Claims accrued creator fees for a single tokenized product, identified by its token mint. Source: `src/commands/claim.ts`. Calls `POST /api/product/claimfees` **without** Bearer auth — the wallet signature is the authentication.

**Inputs**

| Name | Kind | Type | Default | Required | Notes |
| --- | --- | --- | --- | --- | --- |
| `--ca <mint>` | option (required) | base58 string, 32–44 chars | — | Yes | Token mint / contract address. Length validated locally: `< 32` or `> 44` → `Invalid --ca (token mint format).` |
| `--private-key <base58>` | option | base58 string | env / prompt | Yes (one of these) | Resolution: flag → `$SWARMS_WALLET_PRIVATE_KEY` → `$PRIVATE_KEY` → interactive hidden-input prompt. |

**Outputs**

| Channel | Content |
| --- | --- |
| stdout (success) | `✓ Claim submitted.` followed by `Signature <sig>`, `Claimed <amt> SOL`, and `Totals unclaimed=<a> claimed=<b> lifetime=<c>` (each printed when returned). Amounts use the `formatSol` helper: `n.toFixed(6).replace(/0+$/,'').replace(/\.$/,'')`. |
| stdout (failure) | API error message; on 401, `Run swarms login if your env requires it.` |
| Exit code | `0` on success, `1` on validation or API failure. |

**Endpoint**: `POST https://swarms.world/api/product/claimfees`

**Request body**:

```jsonc
{ "ca": "<mint>", "privateKey": "<base58>" }
```

**Response shape**:

```ts
{
  success?: boolean,
  signature?: string | null,
  amountClaimedSol?: number | null,
  fees?: {
    unclaimedSol?: number,
    claimedSol?: number,
    totalSol?: number
  } | null,
  error?: string
}
```

---

### 7.11 `claim-all`

**Synopsis**

```
swarms claim-all
  [--private-key <base58>]
  [--dry-run]
```

**Behavior**: Claims trading fees across every tokenized product the caller owns, reusing a single wallet key. Source: `src/commands/claim-all.ts`.

The CLI enumerates the caller's tokenized mints via `GET /api/get-tokenized-products?type=all&limit=500&page=<n>` (Bearer auth — the server returns only the caller's tokenized products) and attempts a claim against each using your wallet key.

**Inputs**

| Name | Kind | Type | Default | Required | Notes |
| --- | --- | --- | --- | --- | --- |
| `--private-key <base58>` | option | base58 string | env / prompt | Yes (resolved) | Flag → `$SWARMS_WALLET_PRIVATE_KEY` → `$PRIVATE_KEY` → interactive prompt. |
| `--dry-run` | flag | boolean | off | No | Prints the list of mints that would be claimed, then exits 0 without submitting any transactions. |
| `$SWARMS_API_KEY` | env | string | — | **Yes** | Bearer auth used to enumerate the caller's tokenized products. |

**Outputs**

| Channel | Content |
| --- | --- |
| stdout | Header `CLAIM ALL  N mints`, divider, one line per mint (`[type] Name  <CA>`), then per-claim status lines. Final summary: `DONE  X claimed · Y nothing-to-claim · Z failed · S SOL total`. |
| Exit code | `0` if every individual claim succeeded; `1` if any claim threw an error (the batch continues regardless). |

**Per-mint behavior**

| Outcome | Counted as | Printed line |
| --- | --- | --- |
| `amountClaimedSol` finite and > 0 | `succeeded` | `✓ <name>  <ca>  +<amt> SOL  <sig?>` |
| `amountClaimedSol` finite and == 0 | `skipped` | `✓ <name>  <ca>  +0 SOL  <sig?>` |
| `amountClaimedSol` absent / non-finite | `succeeded` | `✓ <name>  <ca>  submitted  <sig?>` |
| `post()` throws (`ApiError` or other) | `failed` | `✗ <name>  <ca>  <message>` |

**Endpoints**:
- `GET https://swarms.world/api/get-tokenized-products?type=all&limit=500&page=<n>` for enumeration (Bearer auth).
- `POST https://swarms.world/api/product/claimfees` per mint, without Bearer auth.

---

## 8. Manifest schemas

`launch agent`, `launch prompt`, and `launch token` accept JSON manifests. A manifest is read by `loadManifest()` at `src/lib/manifest.ts` from a file path or from stdin when the argument is `-`. Bad JSON raises `Manifest is not valid JSON (<source>): <reason>`. Missing files raise `Manifest file not found: <path>`.

Command-line flags **override** manifest fields when provided. Fields marked **required** must come from somewhere (manifest or flag).

### 8.1 Agent manifest

```ts
{
  // required (here or via --name / --description)
  name: string,                    // >= 2 chars after trim
  description: string,

  // body
  agent?: string,                  // code; --code-file overrides
  language?: string,               // e.g. "python", "typescript"
  category?: string,
  tags?: string,                   // comma-separated CSV
  useCases?: Array<{ title: string; description: string }>,
  use_cases?: Array<{ title: string; description: string }>,  // accepted alias
  requirements?: Array<{ package: string; installation: string }>,
  links?: string[],
  image_url?: string,
  image_base64?: string,

  // pricing
  is_free?: boolean,               // default true at server-side; --free forces true
  price_usd?: number,              // required when is_free=false; --price-usd sets is_free=false

  // tokenization (optional; canonical flow is `swarms launch token`)
  tokenized_on?: boolean,
  ticker?: string,
  creator_wallet?: string,
  private_key?: string,
  fee_selection?: 'market' | 'frenzy',
  quote_mint?: 'SOL' | 'USDC'
}
```

**Default injected by the CLI**: if neither `useCases` nor `use_cases` is present, the CLI inserts `useCases: [{ title: '', description: '' }]` so the server accepts the payload (`src/commands/launch-agent.ts:71-74`).

### 8.2 Prompt manifest

```ts
{
  // required (here or via flags)
  name: string,                    // >= 2 chars
  description: string,
  prompt: string,                  // --prompt-file overrides

  // optional
  category?: string,
  tags?: string,                   // CSV
  is_free?: boolean,
  price_usd?: number,
  useCases?: Array<{ title: string; description: string }>,
  use_cases?: Array<{ title: string; description: string }>,
  links?: string[]
}
```

**Default injected by the CLI**: same `useCases` placeholder behavior as agent (`src/commands/launch-prompt.ts:71-73`).

### 8.3 Token manifest

```ts
{
  // required (here or via flags)
  name: string,                    // >= 2 chars
  description: string,
  ticker: string,                  // /^[A-Za-z0-9]{1,10}$/

  // optional
  quote_mint?: 'SOL' | 'USDC',
  fee_selection?: 'market' | 'frenzy',
  image?: string,                  // http(s) URL or data: URL

  // injected by the CLI, NOT something to ship in a checked-in manifest
  private_key?: string             // overwritten with the resolved wallet key
}
```

The CLI always overwrites `payload.private_key` with the resolved wallet key (flag → env → prompt) before transmission (`src/commands/launch-token.ts:71-82`). If you check a manifest into source control, **do not** include `private_key`.

### 8.4 Loading semantics

| Source | Form | Read by |
| --- | --- | --- |
| File path | `--manifest ./agent.json` | `fs.readFileSync(path, 'utf8')` then `JSON.parse` |
| Stdin | `--manifest -` | Reads all of stdin until EOF, then `JSON.parse` |

Stdin example:

```bash
cat agent.json | swarms launch agent -m -
```

---

## 9. API endpoint map

| Endpoint | Method | Auth | Commands |
| --- | --- | --- | --- |
| `/api/add-agent` | POST | Bearer | `launch agent` |
| `/api/add-prompt` | POST | Bearer | `launch prompt` |
| `/api/token/launch` | POST | Bearer + wallet PK in body | `launch token` |
| `/api/user-products` | POST | Bearer | `list` |
| `/api/get-tokenized-products` | GET | Bearer | `list-tokenized`, `open` (mint resolution), `claim-all` (enumeration) |
| `/api/product/claimfees` | POST | none (wallet signature in body) | `claim`, `claim-all` |
| `https://swarms.world/platform/api-keys` | (browser) | n/a | `api-key` |
| `https://swarms.world/{type}/{id}` | (browser) | n/a | `open` (UUID fast path) |

All requests go to `https://swarms.world`. There is no environment override; see §6.

---

## 10. Output and JSON shapes

### 10.1 `swarms list` (default tree)

```
  ▎ @kye  ·  12 products  ·  4 tokenized  ·  https://swarms.world

● @kye
├─ agents (5)
│ ├─ My Research Agent     TOKENIZED
│ ├─ Code Reviewer         TOKENIZED
│ └─ Image Captioner       free
├─ prompts (4)
│ └─ Concise Summarizer    paid
└─ tools (3)
  └─ JSON Diff             free
```

Footer hints (printed conditionally):

| Condition | Hint |
| --- | --- |
| `tokenizedCount > 0` | `? claim fees with swarms claim-all` |
| Always | `? see just your tokenized products with swarms tokens` |
| `counts.agents + counts.prompts + counts.tools !== total_products` | `? breakdown: <a> agents · <p> prompts · <t> tools` |

Badge mapping (`badge()` at `src/commands/list.ts:37-47`):

| `business_model` | Rendered badge |
| --- | --- |
| `tokenized` | red chip ` TOKENIZED ` |
| `paid` | brand-soft text `paid` |
| `free` (or unknown) | muted text `free` |

### 10.2 `swarms list` (`--json`)

```jsonc
{
  "user_id": "uuid",
  "username": "kye",
  "total_products": 12,
  "agents":   [{ "id": "…", "name": "…", "description": "…", "type": "agent",  "business_model": "tokenized", "listing_url": "…" }],
  "prompts":  [{ "id": "…", "name": "…", "description": "…", "type": "prompt", "business_model": "paid",      "listing_url": "…" }],
  "tools":    [{ "id": "…", "name": "…", "description": "…", "type": "tool",   "business_model": "free",      "listing_url": "…" }],
  "summary": {
    "total_prompts": 4,
    "total_agents": 5,
    "total_tools": 3,
    "free_products": 6,
    "paid_products": 2,
    "tokenized_products": 4
  }
}
```

### 10.3 `swarms list-tokenized` (`--json`)

```jsonc
{
  "user_id": "uuid",
  "username": "kye",
  "total": 4,
  "counts": { "agents": 2, "prompts": 2 },
  "data": [
    {
      "id": "uuid",
      "name": "Research Agent",
      "type": "agent",
      "token_address": "5Xy…solana-mint-address",
      "created_at": "2026-05-30T12:00:00.000Z",
      "listing_url": "https://swarms.world/agent/uuid"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 100,
    "total_pages": 1,
    "has_next": false,
    "has_prev": false
  }
}
```

> `user_id` / `username` identify the authenticated caller — results are server-scoped to that user. Tools are not tokenizable, so `counts` only carries `agents` and `prompts`.

### 10.4 `swarms claim` (success)

```
  ✓ Claim submitted.
  Signature      4xZv…aBc7
  Claimed        0.214312 SOL
  Totals         unclaimed=0  claimed=0.214312  lifetime=3.812455
```

### 10.5 `swarms claim-all` (success)

```
  CLAIM ALL  4 mints
  ──────────────────────────────────────────────────────────
  [agent]  Research Agent       5Xy…solana-mint-address
  [agent]  Code Reviewer        3abc…xyz456
  …

  ✓ Research Agent     5Xy…solana-mint-address  +0.214312 SOL  4xZv…aBc7
  ✓ Code Reviewer      3abc…xyz456              +0.000821 SOL  9pqW…dEf1
  ✓ Summarizer         9aaa…bbb999              +0 SOL          (nothing to claim)
  ✗ Image Captioner    7zzz…ccc111              HTTP 429 …
  ──────────────────────────────────────────────────────────
   DONE   2 claimed · 1 nothing-to-claim · 1 failed · 0.215133 SOL total
```

### 10.6 `swarms open` (browser launch)

```
  AGENT   Research Agent
  URL    https://swarms.world/agent/162975eb-61f7-4416-ac01-7d87ea67761f

  ✓ Opening in your default browser…
```

### 10.7 `swarms launch agent / prompt / token` (success)

```
  ✓ Agent published.
  ID             <uuid>
  Listing        https://swarms.world/agent/<uuid>
```

(`launch token` adds `Token CA`, `Pool`, etc., when returned.)

---

## 11. Error handling and exit codes

### 11.1 Exit codes

| Code | Meaning |
| --- | --- |
| `0` | Success. |
| `1` | Command error — validation failure, missing input, API non-2xx, mint not found, refused URL, etc. |
| `130` | Interrupted by SIGINT (Ctrl-C). The animated banner restores the cursor on the way out (`src/lib/theme.ts:206-210`). |

`claim-all` returns `1` if **any** individual claim failed (others may have succeeded — see the summary line).

### 11.2 ApiError formatting

Every HTTP non-2xx is wrapped in `ApiError` (`src/lib/api.ts:8-16`). The message is multi-line:

```
POST https://swarms.world/api/add-agent
  → HTTP 401 Unauthorized
  → Invalid API key
  → x-ratelimit-limit: 60  x-ratelimit-remaining: 0  x-ratelimit-reset: 1716070800
```

A `429` appends a `Retry-After` hint or a default `back off and retry in 30–60s` line. A network failure (no response) produces:

```
Network error
  POST https://swarms.world/api/add-agent
  → connect ECONNREFUSED 1.2.3.4:443
```

### 11.3 Status-specific hints

| Command | Status | Hint added to stderr |
| --- | --- | --- |
| `launch agent` / `launch prompt` / `launch token` | 401 | `Run swarms login to set an API key.` |
| `list` | 401 | `Run swarms login to verify your API key.` |
| `claim` | 401 | `Run swarms login if your env requires it.` |
| `claim-all` | 401 | `Run swarms login to set an API key.` |

### 11.4 Local-validation failures

These produce a generic `✗ <message>` line without touching the network:

| Command | Trigger | Message |
| --- | --- | --- |
| `launch agent` | Missing `--name` or `< 2` chars | `Missing or short --name (need ≥ 2 chars).` |
| `launch agent` | Missing `--description` | `Missing --description.` |
| `launch agent` | `--price-usd` non-numeric or < 0 | `--price-usd must be a non-negative number` |
| `launch agent` | `--code-file` missing | `Code file not found: <path>` |
| `launch prompt` | Missing prompt | `Missing --prompt-file or "prompt" in manifest.` |
| `launch token` | Ticker shape wrong | `--ticker must be 1–10 chars (letters/numbers only).` |
| `launch token` | No wallet key resolvable | `A wallet private key is required.` |
| `claim` | `--ca` length out of `[32, 44]` | `Invalid --ca (token mint format).` |
| `open` | UUID without `--type` | `UUIDs need a type. Re-run with --type agent|prompt|tool.` |
| `open` | Bad `--type` | `--type must be one of agent | prompt | tool (got "<value>").` |
| `open` | Unparseable `<ref>` | `Could not recognize "<ref>" as a UUID or a base58 token mint.` |

---

## 12. Browser launch safety

`openInBrowser(url)` (`src/lib/open.ts`) is used by `api-key` and `open`. It refuses to spawn a launcher unless the URL passes both checks:

| Check | Rule |
| --- | --- |
| Scheme | `http:` or `https:` only. Blocks `javascript:`, `data:`, `file:`, SMB/UNC, etc. |
| Characters | The serialized URL must contain no characters in `\x00-\x1f`, no `"`, `'`, `` ` ``, `$`, `|`, `&`, `;`, `<`, `>`, `^`. This blocks Windows `cmd /c start` re-parsing. |

Platform mapping:

| Platform | Launcher | Args |
| --- | --- | --- |
| `darwin` | `open` | `[url]` |
| `win32` | `rundll32` | `['url.dll,FileProtocolHandler', url]` |
| else | `xdg-open` | `[url]` |

Additionally, when `open` resolves a `listing_url` from `/api/get-tokenized-products`, the host is checked against the **swarms.world allowlist** (`src/lib/config.ts:42-45`):

| Host | Result |
| --- | --- |
| `swarms.world` | Allowed |
| `*.swarms.world` (e.g. `staging.swarms.world`) | Allowed |
| anything else | `Refusing to open untrusted listing URL: <url>` (exit 1) |

The protocol must also be `https:` for resolved listing URLs. A server-supplied `listing_url` cannot redirect the user off-site or to a non-HTTPS scheme.

---

## 13. Wallet private key handling

The wallet private key is required by `claim`, `claim-all`, and `launch token`. It is **never** written to disk, logged, or cached by the CLI.

**Resolution order** (first non-empty wins):

1. `--private-key <base58>` flag.
2. `$SWARMS_WALLET_PRIVATE_KEY`.
3. `$PRIVATE_KEY`.
4. Interactive prompt via `promptSecret()` at `src/lib/prompt.ts:24-80`.

**Interactive-prompt behavior** (TTY only):

| Behavior | Detail |
| --- | --- |
| Echo | None — each character is replaced with `•`. |
| Backspace | Supported (codes `127`, `8`); shrinks the buffer and erases on screen. |
| Submit | Enter (`13` or `10`). |
| Abort | Ctrl-C (`3`) → prints a newline, throws `Error('Aborted')`. |
| Other controls | Codes `< 32` are ignored. |
| Restore | Raw-mode restored to its prior state on submit or abort. |
| Non-TTY | Reads a single line from stdin (no echoing applies). |

**Format**: must be a base58-encoded secret key (the format Phantom exports). 64-byte JSON arrays and base64 are rejected by the server with `Invalid privateKey: could not decode base58 secret key`.

**Argument hygiene**: passing the key via `--private-key` puts it on the process command line, which is visible to other users via `ps` on some systems and may appear in shell history. Prefer env-var or interactive-prompt paths in shared environments.

---

## 14. TTY, animation, color

| Behavior | Source | Trigger |
| --- | --- | --- |
| Animated mascot on `swarms` (no args) | `animatedBanner()` `src/lib/theme.ts:184-226` | `stdout.isTTY === true`, `$SWARMS_NO_ANIM` unset, `$CI` unset, `$TERM !== 'dumb'`. |
| Static mascot in `--help` | `banner()` `src/lib/theme.ts:123-125` | Always. Help output stays pipe-safe and snapshot-stable. |
| Color output | chalk | Honors `NO_COLOR` (chalk standard). |
| Spinner | `ora` | All long-running calls (`launch *`, `list`, `list-tokenized`, `open` mint resolution, `claim`, `claim-all`). Color `red`. |
| Cursor hide / show | ANSI `?25l` / `?25h` | Hidden during animation, restored on `exit` and `SIGINT`. |

The mascot is a 5-line × 14-cell space invader with two leg-position frames (`FRAME_A`, `FRAME_B`), redrawn 6 times at ~170 ms intervals.

---

## 15. Scripting and CI patterns

### 15.1 Publish from CI on every push

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
      - run: npm install -g swarms-market@latest
      - env:
          SWARMS_API_KEY: ${{ secrets.SWARMS_API_KEY }}
        run: |
          for f in agents/*/manifest.json; do
            swarms launch agent --manifest "$f"
          done
```

### 15.2 Scheduled fee collection

```yaml
on:
  schedule: [{ cron: '0 3 * * *' }]   # daily 03:00 UTC

jobs:
  claim:
    runs-on: ubuntu-latest
    steps:
      - run: npm install -g swarms-market@latest
      - env: { PRIVATE_KEY: ${{ secrets.SOLANA_WALLET_KEY }} }
        run: swarms claim-all
```

Bare cron entry on a Linux box:

```cron
0 3 * * *  PRIVATE_KEY=... swarms claim-all >> /var/log/swarms-claim.log 2>&1
```

### 15.3 Bulk publishing a directory of manifests

```bash
find ./agents -name 'manifest.json' -print0 \
  | xargs -0 -I{} swarms launch agent --manifest {}
```

### 15.4 jq pipelines

```bash
# Top 5 tokenized agents on the marketplace by recency
swarms list-tokenized --type agent --limit 5 --json \
  | jq '.data[].name'

# All your tokenized product names
swarms list --json \
  | jq -r '(.agents + .prompts + .tools)[] | select(.business_model == "tokenized") | .name'

# Total claims summary parsed
swarms claim-all --dry-run | tee /tmp/claim-targets.txt
```

### 15.5 Stdin manifest

```bash
jq '.name = "Renamed Agent"' agent.json \
  | swarms launch agent -m -
```

### 15.6 Rate-limit hygiene

The CLI does not retry. In batch loops cap parallelism or sleep:

```bash
for f in agents/*/manifest.json; do
  swarms launch agent --manifest "$f"
  sleep 1
done
```

---

## 16. Source layout cross-reference

| Path | Purpose |
| --- | --- |
| `bin/swarms.js` | Node entry. Dev: loads `src/index.ts` via `tsx`. Installed: loads `dist/index.js`. Enforces Node ≥ 18. |
| `src/index.ts` | Commander wiring, custom `Help` renderer (`SwarmsHelp`), no-args welcome path. |
| `src/lib/api.ts` | `post()` / `get()` + `ApiError` + `formatHttpError()`. |
| `src/lib/config.ts` | `getApiKey()`, `getBaseUrl()`, `isAllowedSwarmsHost()`, `getWalletPrivateKey()`. Hardcoded `API_BASE = 'https://swarms.world'`. |
| `src/lib/manifest.ts` | `loadManifest()` — file path or `-` for stdin. |
| `src/lib/open.ts` | `openInBrowser()` with scheme + shell-meta safety. |
| `src/lib/prompt.ts` | `prompt()`, `promptSecret()` — readline + raw-mode masked input. |
| `src/lib/theme.ts` | Brand palette, banner, mascot animation, helpers (`label`, `ok`, `fail`, `info`, `divider`, `bullet`, `section`, `footer`). |
| `src/commands/api-key.ts` | `swarms api-key` — opens the API keys page. |
| `src/commands/login.ts` | `swarms login` — verifies env. |
| `src/commands/whoami.ts` | `swarms whoami` — prints masked key. |
| `src/commands/launch-agent.ts` | `swarms launch agent` → `POST /api/add-agent`. |
| `src/commands/launch-prompt.ts` | `swarms launch prompt` → `POST /api/add-prompt`. |
| `src/commands/launch-token.ts` | `swarms launch token` → `POST /api/token/launch`. |
| `src/commands/list.ts` | `swarms list` → `POST /api/user-products`. |
| `src/commands/list-tokenized.ts` | `swarms list-tokenized` / `tokens` → `GET /api/get-tokenized-products`. |
| `src/commands/open.ts` | `swarms open` — UUID fast path + mint resolution. |
| `src/commands/claim.ts` | `swarms claim` → `POST /api/product/claimfees`. |
| `src/commands/claim-all.ts` | `swarms claim-all` — enumerate the caller's tokenized products + per-mint claim. |

---

## Appendix A — Quick command matrix

| Command | API endpoint | Auth | Wallet key | Network calls | Side effects |
| --- | --- | --- | --- | --- | --- |
| `api-key` | — | — | — | 0 | Launches browser |
| `login` | — | env only | — | 0 | — |
| `whoami` | — | env only | — | 0 | — |
| `launch agent` | POST `/api/add-agent` | Bearer | — | 1 | Publishes agent |
| `launch prompt` | POST `/api/add-prompt` | Bearer | — | 1 | Publishes prompt |
| `launch token` | POST `/api/token/launch` | Bearer + PK | required | 1 | On-chain tx |
| `list` | POST `/api/user-products` | Bearer | — | 1 | — |
| `list-tokenized` | GET `/api/get-tokenized-products` | Bearer | — | 1 | — |
| `open` (UUID) | — | — | — | 0 | Launches browser |
| `open` (mint) | GET `/api/get-tokenized-products` (paged) | none | — | 1..20 | Launches browser |
| `claim` | POST `/api/product/claimfees` | none (PK in body) | required | 1 | On-chain tx |
| `claim-all` | GET enumeration + POST per-mint | Bearer (for GET) | required | 1..20 + N | On-chain txs |

## Appendix B — Quick env-var matrix

| Variable | login | whoami | launch agent | launch prompt | launch token | list | list-tokenized | open | claim | claim-all | api-key |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `SWARMS_API_KEY` | required | required | required | required | required | required | required | — | — | required | — |
| `SWARMS_WALLET_PRIVATE_KEY` | — | — | — | — | preferred | — | — | — | preferred | preferred | — |
| `PRIVATE_KEY` | — | — | — | — | fallback | — | — | — | fallback | fallback | — |
| `SWARMS_NO_ANIM` | banner | banner | banner | banner | banner | banner | banner | banner | banner | banner | banner |
| `CI` | banner | banner | banner | banner | banner | banner | banner | banner | banner | banner | banner |
| `NO_COLOR` | chalk | chalk | chalk | chalk | chalk | chalk | chalk | chalk | chalk | chalk | chalk |

## Appendix C — Exit-code matrix

| Command | `0` | `1` | `130` |
| --- | --- | --- | --- |
| `api-key` | always (URL printed; browser optional) | — | Ctrl-C |
| `login` | env set | env unset | Ctrl-C |
| `whoami` | env set | env unset | Ctrl-C |
| `launch agent` | published | local validation or API non-2xx | Ctrl-C |
| `launch prompt` | published | local validation or API non-2xx | Ctrl-C |
| `launch token` | launched | local validation or API non-2xx | Ctrl-C |
| `list` | rendered | missing identifier or API non-2xx | Ctrl-C |
| `list-tokenized` | rendered | API non-2xx | Ctrl-C |
| `open` | URL printed or launched | bad `<ref>`, missing `--type`, mint not found, untrusted listing host | Ctrl-C |
| `claim` | submitted | validation or API non-2xx | Ctrl-C |
| `claim-all` | every per-mint OK or no targets | any per-mint failure | Ctrl-C |

