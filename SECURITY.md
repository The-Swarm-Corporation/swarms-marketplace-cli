# Security Policy

The Swarms Marketplace CLI handles two highly sensitive credentials — your Swarms API key and your Solana wallet private key — so security reports are taken seriously. This document explains what is in scope, how to report a vulnerability, and what guarantees and assumptions the CLI itself makes about credential handling.

## Supported versions

Security fixes are issued against the latest minor release line on npm. There is no backport window for older minors.

| Version              | Supported          |
| -------------------- | ------------------ |
| Latest minor on npm  | ✅                 |
| Previous minor       | Best-effort        |
| Older                | ❌                 |

Run `swarms --version` to see what you have installed; the latest version is on the [npm package page](https://www.npmjs.com/package/swarms-market).

## Reporting a vulnerability

**Do not open a public GitHub issue for security reports.**

Use GitHub's private vulnerability reporting: <https://github.com/The-Swarm-Corporation/swarms-marketplace-cli/security/advisories/new>.

If that is unavailable, email **kye@swarms.world** with:

- A description of the vulnerability, including a minimal reproduction.
- The CLI version (`swarms --version`), Node version, and OS.
- The impact you believe it has — credential leak, RCE, privilege escalation, denial of service, etc.
- Optional: a suggested fix.

**Please redact any real API keys, wallet private keys, or transaction signatures from your report.** Use placeholder values.

### What to expect

- **Initial acknowledgment:** within 3 business days.
- **Triage and severity assessment:** within 7 business days. We will tell you whether the report is in scope, whether we have reproduced it, and an indicative severity.
- **Fix and disclosure timeline:** typically 30 days for high-severity issues, 90 days for everything else. We will share the planned schedule with you.
- **Credit:** with your permission, you will be credited in the release notes for the patched version. Anonymous reports are also welcome.

We do not currently offer a paid bug bounty.

## Scope

In scope (please report):

- The published `swarms-market` npm package — the CLI itself, its dependencies' usage, and its runtime behavior.
- The `bin/swarms.js` entry point and the TypeScript source under `src/`.
- The CI workflows under `.github/workflows/`.
- Any documented behavior of the CLI that fails to match implementation in a security-relevant way (e.g., a flag the README claims hides input but does not).

Out of scope (please don't):

- The Swarms Marketplace web application or its backend API endpoints at `https://swarms.world`. Report those to the Swarms team directly.
- Solana RPC or on-chain program vulnerabilities.
- Issues that require an attacker with the same UID as the user (local malware exfiltrating env vars). The CLI's threat model explicitly excludes this.
- Theoretical issues without a working repro.
- Reports from automated scanners with no human analysis attached.
- Dependency vulnerabilities that are not actually reachable from any code path used by the CLI (`npm audit` noise).

## Security guarantees the CLI makes

These are properties the implementation aims to uphold. If you find a path that violates one of them, that is a security bug.

### Credential handling

- **API key.** Read only from `$SWARMS_API_KEY`. Sent only as `Authorization: Bearer <key>` over HTTPS. Never written to disk, never logged at full value, never cached. When displayed (e.g. by `swarms whoami`), only the first and last 4 characters are shown.
- **Wallet private key.** Sourced in this exact order: explicit `--private-key` flag → `$SWARMS_WALLET_PRIVATE_KEY` → `$PRIVATE_KEY` → interactive hidden-input prompt. Held in process memory for the lifetime of one command only. **Never** written to disk, logged, cached, or transmitted in error output. There is no "remember my wallet" mode.

### Transport

- All HTTP requests go to `https://swarms.world` over TLS.
- The host is **hardcoded** in source. There is no environment override (`SWARMS_API_BASE_URL` and similar do not exist). A stray shell variable cannot redirect a Bearer key or wallet key to a different host.
- TLS verification is never disabled. There is no `--insecure` flag.

### Telemetry

- The CLI sends zero telemetry of any kind.
- The only network calls it makes are to the marketplace API endpoints documented in the [Command reference](./README.md#command-reference), and only when a command that needs them is invoked.

### Process boundary

- The Node.js process exits as soon as the current command completes; no background work continues after exit.
- No daemon, no persistent connection, no IPC socket.

## Threat model

The CLI assumes:

- **The local environment is trusted.** The user controls their own machine. The CLI does not defend against malware running with the same UID as the user — such malware can already read env vars, hook readline, or scrape process memory. If your threat model includes this, run the CLI inside a hardware-isolated environment (e.g., a separate VM or a hardware wallet flow that is not currently supported by this CLI).
- **The API host is honest.** The CLI does not defend against compromise of `swarms.world`. If the marketplace backend itself is compromised, the API key and any signed transactions are exposed regardless of what the CLI does.
- **Shell history is sensitive.** Passing the wallet key via `--private-key` exposes it to your shell history and to `ps` on some systems. Prefer the env var or the interactive prompt for production use. This is a documented hazard, not a bug.

Within that scope, the CLI minimizes credential exposure: env vars rather than disk, hidden input for wallet keys, no caching, hardcoded transport.

## Known operational hazards

These are not vulnerabilities — they are properties you should be aware of when using the CLI in security-sensitive contexts.

- **`--private-key` on the command line is visible to `ps` and ends up in shell history.** Prefer env vars or the interactive prompt.
- **CI logs.** If you accidentally log `$SWARMS_API_KEY` or `$PRIVATE_KEY` in a CI job (e.g., `env | grep`), the secret will appear in the job log. Most CI providers redact known secrets, but only for the exact value you registered as a secret. Don't echo env vars.
- **Rate-limit responses can return HTML.** The Vercel "Security Checkpoint" bot challenge can intercept a request and return an HTML page with status 429. This is documented in [README → Troubleshooting](./README.md#troubleshooting). It is not a security issue with the CLI.
- **The wallet key controls real funds.** A leaked wallet key is unrecoverable. Use a separate hot wallet with only the funds needed for claim/launch operations; do not use a wallet that holds long-term holdings.

## Dependency policy

- The CLI keeps its runtime dependency footprint deliberately small. Each new dependency is a future security-update obligation.
- We monitor `npm audit` advisories for direct dependencies and update on a best-effort cadence.
- We do not pin transitive dependencies to vulnerable versions; if a transitive dep is unreachable from the CLI's code paths, we will note this in our response but will not necessarily ship a patch release just to silence the advisory.

## Acknowledgments

Thanks to the security researchers and users who report issues responsibly. With your permission, you will be listed here when a fix ships.
