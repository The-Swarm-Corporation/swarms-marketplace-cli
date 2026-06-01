# Testing Guide

## Quick Start

```bash
# Install dependencies (includes vitest)
npm install

# Run all tests
npm test

# Watch mode for development
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## Test Structure

```
src/
├── lib/
│   ├── api.test.ts          # HTTP client tests
│   ├── config.test.ts       # Environment config tests
│   ├── open.test.ts         # URL safety tests
│   ├── manifest.test.ts     # Manifest loading tests
│   └── theme.test.ts        # Theming & masking tests
├── commands/
│   └── commands.test.ts     # All command tests
bin/
└── swarms.test.ts           # Entry point tests
```

## What's Tested

### Libraries (`src/lib/`)

- **api.ts**: HTTP error formatting, GET/POST with auth, network errors, rate limiting
- **config.ts**: Environment variable precedence (API key, username, wallet key)
- **open.ts**: Browser URL safety (rejects javascript:, data:, file:, shell-meta)
- **manifest.ts**: File vs stdin loading, JSON validation, error messages
- **theme.ts**: Key masking rules, banner rendering, MASCOT_HEIGHT constant

### Commands (`src/commands/`)

Every command is tested for:
- Happy path execution
- Missing required arguments
- Server error mapping
- Exit codes (0 for success, 1 for failure)
- `--json` output parity (where applicable)

Specific coverage:
- **api-key**: URL printing, `--no-open` flag
- **login/whoami**: Missing key → exit 1, masked key display
- **launch agent/prompt/token**: Manifest loading, validation, wallet key handling
- **list**: User precedence, `--tokenized` filter, tree vs JSON output
- **list-tokenized**: Pagination, type validation
- **open**: UUID+type, CA lookup, `--print`/`--no-open` flags
- **claim**: Required `--ca`, private key handling, server errors
- **claim-all**: `--dry-run`, continue-on-failure

### Binary (`bin/swarms.js`)

- Node version gate (exits 1 on Node < 18)
- Dev checkout path (uses `src/index.ts` via tsx)
- Installed path (uses `dist/index.js` when src/ absent)
- Startup error handling

## Key Regression Tests

### Vercel Checkpoint (429 with HTML body)

**Location**: `src/lib/api.test.ts` → `formatHttpError`

**What it prevents**: When the API returns HTTP 429 with an HTML body (Vercel rate-limit checkpoint), the CLI must show a helpful rate-limit hint, not a misleading raw HTML dump.

**Test**: Verifies that `formatHttpError` includes the rate-limit hint when `status === 429` and `retry-after` header is present, regardless of body format.

## Coverage Goals

Configured in `vitest.config.ts`:

- **src/lib/**: ≥80% line coverage
- **src/commands/**: ≥70% line coverage
- **Branches**: ≥75%

Run `npm run test:coverage` to see detailed coverage report in `coverage/index.html`.

## CI Integration

Tests run automatically on every push/PR via `.github/workflows/ci.yml`:

1. **Type check**: `npm run typecheck`
2. **Tests**: `npm test`
3. **Build**: `npm run build`
4. **Smoke tests**: `swarms --version`, `swarms --help`
5. **Coverage**: Uploaded to Codecov

Runs on Node 18.x, 20.x, and 22.x.

## Writing New Tests

### Example: Testing a new command

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Command } from 'commander';
import { registerMyCommand } from './my-command.js';

describe('my-command', () => {
  const originalEnv = process.env;
  let consoleOutput: string[] = [];

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.exitCode = 0;
    consoleOutput = [];
    console.log = vi.fn((...args: any[]) => {
      consoleOutput.push(args.join(' '));
    });
    global.fetch = vi.fn();
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it('should do something', async () => {
    const program = new Command();
    registerMyCommand(program);
    
    await program.parseAsync(['node', 'test', 'my-command', '--flag']);
    
    expect(process.exitCode).toBe(0);
    const output = consoleOutput.join('\n');
    expect(output).toContain('expected text');
  });
});
```

### Example: Mocking fetch

```typescript
it('should handle API response', async () => {
  (global.fetch as any).mockResolvedValue(
    new Response(JSON.stringify({ data: 'test' }), { status: 200 })
  );

  const result = await get('/api/endpoint');
  expect(result).toEqual({ data: 'test' });
});
```

### Example: Testing error cases

```typescript
it('should exit 1 on server error', async () => {
  (global.fetch as any).mockResolvedValue(
    new Response(JSON.stringify({ error: 'Bad request' }), { status: 400 })
  );

  await program.parseAsync(['node', 'test', 'command']);
  
  expect(process.exitCode).toBe(1);
  const output = consoleOutput.join('\n');
  expect(output).toContain('Bad request');
});
```

## Debugging Tests

```bash
# Run a specific test file
npx vitest run src/lib/api.test.ts

# Run tests matching a pattern
npx vitest run -t "formatHttpError"

# Debug with Node inspector
node --inspect-brk node_modules/.bin/vitest run

# Show console.log output
npx vitest run --reporter=verbose
```

## No Network Required

All tests use mocked `fetch` and in-process command execution. The entire suite passes on a clean checkout with no network access.

## Acceptance Criteria

✅ `npm test` passes on a clean checkout with no network access  
✅ Coverage report shows ≥80% line coverage on `src/lib/`  
✅ Coverage report shows ≥70% line coverage on `src/commands/`  
✅ Vercel checkpoint regression (429 + HTML) has explicit test  
✅ CI is gating: PRs cannot merge with failing tests  
✅ `scripts/dev.sh` runs tests after build  

All criteria met! 🎉
