/**
 * Shared test utilities: console capture, fetch mocking, env management,
 * and a runner that wires a command registrar into a fresh Commander program.
 *
 * Tests never touch the network — `mockFetch` replaces `globalThis.fetch`
 * and records every call (URL, method, headers, body) for assertions.
 */
import { Command } from 'commander';

const ANSI_RE = /\x1b\[[0-9;?]*[A-Za-z]/g;

export function stripAnsi(s: string): string {
  return s.replace(ANSI_RE, '');
}

export interface FetchCall {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
}

export type FetchHandler = (
  url: string,
  init?: RequestInit,
) => Response | Promise<Response>;

function normalizeHeaders(h: HeadersInit | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!h) return out;
  if (h instanceof Headers) {
    h.forEach((v, k) => (out[k.toLowerCase()] = v));
  } else if (Array.isArray(h)) {
    for (const [k, v] of h) out[k.toLowerCase()] = v;
  } else {
    for (const [k, v] of Object.entries(h)) out[k.toLowerCase()] = v;
  }
  return out;
}

/**
 * Replace globalThis.fetch with a handler. Returns the recorded calls and a
 * restore() that must run in a finally block (or test cleanup).
 */
export function mockFetch(handler: FetchHandler): {
  calls: FetchCall[];
  restore: () => void;
} {
  const calls: FetchCall[] = [];
  const original = globalThis.fetch;
  globalThis.fetch = (async (
    input: string | URL | Request,
    init?: RequestInit,
  ) => {
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;
    calls.push({
      url,
      method: init?.method ?? 'GET',
      headers: normalizeHeaders(init?.headers),
      body: typeof init?.body === 'string' ? init.body : undefined,
    });
    return handler(url, init);
  }) as typeof fetch;
  return {
    calls,
    restore: () => {
      globalThis.fetch = original;
    },
  };
}

/** A fetch handler that fails the test if any network call is attempted. */
export function forbidFetch(): { calls: FetchCall[]; restore: () => void } {
  return mockFetch(() => {
    throw new Error('unexpected network call in test');
  });
}

export function jsonResponse(
  body: unknown,
  status = 200,
  headers: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  });
}

/**
 * Set env vars for the duration of a test (undefined deletes the var).
 * Returns a restore() for cleanup.
 */
export function withEnv(
  vars: Record<string, string | undefined>,
): () => void {
  const saved: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(vars)) {
    saved[k] = process.env[k];
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  return () => {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  };
}

/**
 * Build a fresh program, register the command under test, run it with the
 * given argv, and capture everything written via console.log (ANSI-stripped).
 * process.exitCode is captured and reset so failures don't leak into the
 * test runner's own exit status.
 */
export async function runCommand(
  register: (program: Command) => void,
  argv: string[],
): Promise<{ output: string; exitCode: number | string | undefined }> {
  const lines: string[] = [];
  const originalLog = console.log;
  console.log = (...args: unknown[]) => {
    lines.push(args.map(String).join(' '));
  };

  const prevExitCode = process.exitCode;
  process.exitCode = undefined;

  try {
    const program = new Command();
    program.exitOverride();
    register(program);
    await program.parseAsync(['node', 'swarms', ...argv]);
  } finally {
    console.log = originalLog;
  }

  const exitCode = process.exitCode;
  process.exitCode = prevExitCode;
  return { output: stripAnsi(lines.join('\n')), exitCode };
}
