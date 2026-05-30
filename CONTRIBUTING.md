# Contributing to Swarms Marketplace CLI

Thanks for your interest in contributing to `swarms-market`. This document collects everything you need to develop, test, and ship a change to this CLI.

## Code of Conduct

Be respectful, be specific, be patient. Feedback is on the code, not the contributor. Harassment, personal attacks, and discrimination are not tolerated in issues, PRs, or any other project space.

## Ways to contribute

- **Bug reports.** Open an issue at <https://github.com/The-Swarm-Corporation/swarms-marketplace-cli/issues> with: CLI version (`swarms --version`), Node version (`node --version`), OS, the full command you ran, and the full output (redact your API key and wallet key first).
- **Feature requests.** Describe the workflow you want to enable, not just the flag you want added. Include an example of the command you would expect to run and the output you would expect to see.
- **Pull requests.** Bug fixes, new commands, manifest schema additions, and translation improvements are all welcome. See below for the workflow.
- **Translations.** The localized READMEs in `docs/` welcome corrections and new languages. See [Translations](#translations).
- **Documentation.** Typos, clearer phrasing, better examples — all worth a PR on their own.

## Development setup

You need Node.js ≥ 18 and one of `npm`, `pnpm`, `yarn`, or `bun` (`npm` is what CI uses).

```bash
git clone https://github.com/The-Swarm-Corporation/swarms-marketplace-cli
cd swarms-marketplace-cli
npm install
./bin/swarms.js --help
```

**No rebuild needed in dev.** `bin/swarms.js` detects that `src/index.ts` exists (only true in a working checkout) and runs the TypeScript sources directly via [`tsx`](https://github.com/privatenumber/tsx). Edit a file, re-run, see the change. No `npm run build` in the inner loop.

Optional helpers:

```bash
scripts/dev.sh              # install + type-check + build + smoke-test
scripts/dev.sh --link       # also `npm link` so `swarms` resolves to this checkout
scripts/dev.sh --watch      # build in watch mode
scripts/dev.sh --clean      # wipe dist/ and node_modules first

npm run typecheck           # tsc --noEmit
npm run build               # tsc → dist/ (required before `npm publish`, not before running)
./example.sh                # walks through `swarms open` variants and opens a real tab
```

## Project layout

```
src/
  index.ts              commander wiring + custom help renderer
  lib/                  api client, config, prompt, theme, manifest, browser opener
  commands/             one file per top-level subcommand
bin/
  swarms.js             node entry; runs TS via tsx in dev, falls back to dist/ in installed envs
scripts/
  dev.sh, publish.sh    local dev + release helpers
docs/                   localized READMEs
.github/workflows/      CI for npm publish
```

Detailed file-by-file map lives in the [Project layout](./README.md#project-layout) section of the main README.

## Branching and commits

- Branch from `main`. Name branches after the area of change (`feat/launch-bulk`, `fix/claim-all-pagination`, `docs/ja-translation`).
- Keep commits focused. Don't fix three unrelated things in one commit.
- Write commit messages that explain the *why*. The diff already shows the *what*. Imperative mood ("Add X", not "Added X").
- One PR = one logical change. Splitting a refactor and a bug fix into two PRs is almost always the right call.

## Coding standards

- **TypeScript strict mode.** `npm run typecheck` must pass.
- **No new runtime dependencies** without a real justification in the PR description. Every dependency is a footprint on the install size and a future security-update obligation.
- **No telemetry.** The CLI ships zero telemetry. Don't add any.
- **Don't add config-file persistence.** All config is environment-driven by design — do not write a `~/.swarmsrc` reader without first opening an issue.
- **Don't introduce a base-URL override.** The host is hardcoded to `https://swarms.world` so a stray shell variable cannot redirect a Bearer key or wallet key elsewhere. This is a security property, not an oversight.
- **Be careful with the wallet private key.** Never log it, never write it to disk, never include it in error messages. The only sanctioned paths are `--private-key`, `$SWARMS_WALLET_PRIVATE_KEY`, `$PRIVATE_KEY`, and the hidden-input prompt.
- **Be careful with the API key.** Same rules. Mask it when displaying (first/last 4 chars), and never include it in error output.
- **Error handling.** Use the existing `ApiError` and HTTP error formatter in `src/lib/api.ts`. Print full method, URL, status, body snippet, and any rate-limit headers on failure — read users should not have to guess what went wrong.
- **Exit codes.** Stick to the documented set (`0` success, `1` command error, `130` SIGINT). Don't invent new ones without updating the README.
- **Honor `NO_COLOR`, `$CI`, `$TERM=dumb`, and `SWARMS_NO_ANIM`.** These are the contracts users rely on for non-interactive environments.

## Testing your change

There is no automated test suite at the moment. Until one exists, you are expected to manually verify your change:

1. `npm run typecheck` must pass.
2. `npm run build` must succeed.
3. Run the smoke test:
   ```bash
   ./bin/swarms.js --help
   ./bin/swarms.js --version
   ```
4. Exercise the specific command path you changed. If you touched `launch agent`, run `swarms launch agent` end-to-end (a real API key against the live marketplace, or against a manifest validation flag if you added one).
5. For UI / output changes, run the command in a real terminal and visually verify the output. Also run it under `CI=1 NO_COLOR=1` to confirm the non-interactive code path still looks right.
6. For changes that touch network behavior, run the failing path (bad API key, 429, network down) and confirm the error message is useful.

When you open the PR, list the exact commands you ran and their outcomes. "I ran the smoke test" is not enough; "I ran `swarms launch agent --manifest ./fixtures/agent.json` against the live API and the agent appeared at the printed `listing_url`" is.

## Adding or changing a command

If you are adding a new command:

1. Add a file under `src/commands/<name>.ts` exporting a function that registers it on the passed-in commander program.
2. Wire it into `src/index.ts`.
3. Add a row to the "Capabilities at a glance" table and a `### \`name\`` subsection to `## Command reference` in `README.md`.
4. If the command takes a manifest, document its schema under `## Manifest schemas`.
5. If the command affects exit-code semantics, update the `## Exit codes` table.
6. If the command should appear in the translations, file a follow-up issue tagged `docs/translations` — translators do not need to gate the merge of a feature.

If you are changing an existing command's flags or output:

- Flag rename / removal: this is a breaking change. Mention it explicitly in the PR description and bump accordingly.
- Output rename in `--json`: this is a breaking change for any script that consumes the output. Same rule.
- New flag with a safe default: not breaking, ship as a minor.

## Translations

Localized READMEs live in `docs/`:

- `docs/README.zh-CN.md` — Chinese (Simplified)
- `docs/README.ja.md` — Japanese
- `docs/README.hi.md` — Hindi
- `docs/README.de.md` — German
- `docs/README.pl.md` — Polish

To improve an existing translation, open a PR with the changes. To add a new language, copy `docs/README.de.md` (the most recent template), translate the prose, and:

- Keep code blocks, env vars, command names, JSON shapes, and URLs **untranslated**. Translating identifiers will break copy-paste for users.
- Keep relative links pointing at `../README.md`, `../LICENSE`, etc. so they resolve from the `docs/` directory.
- Add a row to the language banner at the top of every other localized README and at the top of the main `README.md`.

We do not require translation parity. A translation can lag the English README by a few sections; the link banner makes that visible to users.

## Releasing (maintainers)

Releases are gated to maintainers. The script handles everything:

```bash
scripts/publish.sh patch              # 0.1.0 → 0.1.1 (default)
scripts/publish.sh minor              # 0.1.0 → 0.2.0
scripts/publish.sh major              # 0.1.0 → 1.0.0
scripts/publish.sh 1.2.3              # explicit version
scripts/publish.sh patch --dry        # preview; doesn't publish
scripts/publish.sh patch --tag beta   # publish under dist-tag 'beta'
```

The publish script enforces a clean tree, `main` branch, and a successful `npm whoami` before doing anything. It runs typecheck + build, then `npm publish`, commits the version bump, tags it, and pushes (override with `--no-push`, `--allow-dirty`, `--allow-branch`).

CI (`.github/workflows/npm-publish.yml`) auto-publishes a patch bump on every push to `main` when an `NPM_TOKEN` secret is configured. If you are landing a major or minor change, run `scripts/publish.sh minor` (or `major`) locally first so the version is correct before CI picks it up.

## Security

Found a vulnerability? **Do not open a public issue.** Follow the disclosure process in [SECURITY.md](./SECURITY.md).

## License

By contributing, you agree that your contributions will be licensed under the [Apache License 2.0](./LICENSE) that covers the project.
