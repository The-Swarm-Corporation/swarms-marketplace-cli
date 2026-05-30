import { createRequire } from 'node:module';
import { getApiKey, getBaseUrl } from './config.js';

const require = createRequire(import.meta.url);
const pkg = require('../../package.json') as { version: string };
const USER_AGENT = `swarms-marketplace-cli/${pkg.version} (+https://github.com/kyegomez/swarms-marketplace-cli; node/${process.versions.node})`;

export class ApiError extends Error {
  status: number;
  details?: unknown;
  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

const RATE_LIMIT_HEADERS = [
  'retry-after',
  'x-ratelimit-limit',
  'x-ratelimit-remaining',
  'x-ratelimit-reset',
];

function extractBodyMessage(data: unknown): string | null {
  if (typeof data !== 'object' || data === null) return null;
  const d = data as Record<string, unknown>;
  for (const key of ['error', 'message', 'details', 'detail']) {
    const v = d[key];
    if (typeof v === 'string' && v.trim()) return v;
  }
  return null;
}

/**
 * Build a multi-line error string describing an HTTP failure.
 * Includes status, status text, the request method/URL, any body message,
 * and rate-limit headers when present (especially useful for 429).
 */
export function formatHttpError(
  method: string,
  url: string,
  res: Response,
  parsedBody: unknown,
  rawBody: string,
): string {
  const lines: string[] = [];
  const statusText = res.statusText ? ` ${res.statusText}` : '';
  lines.push(`${method} ${url}`);
  lines.push(`  → HTTP ${res.status}${statusText}`);

  const bodyMessage = extractBodyMessage(parsedBody);
  if (bodyMessage) {
    lines.push(`  → ${bodyMessage}`);
  } else if (rawBody && rawBody.trim()) {
    const trimmed = rawBody.trim();
    const snippet = trimmed.length > 300 ? `${trimmed.slice(0, 300)}…` : trimmed;
    lines.push(`  → body: ${snippet}`);
  } else {
    lines.push('  → (empty response body)');
  }

  const rateHeaders: string[] = [];
  for (const h of RATE_LIMIT_HEADERS) {
    const v = res.headers.get(h);
    if (v) rateHeaders.push(`${h}: ${v}`);
  }
  if (rateHeaders.length > 0) {
    lines.push(`  → ${rateHeaders.join('  ')}`);
  }

  if (res.status === 429) {
    const retryAfter = res.headers.get('retry-after');
    const hint = retryAfter
      ? `Rate limited — retry after ${retryAfter}${/^\d+$/.test(retryAfter) ? 's' : ''}.`
      : 'Rate limited — back off and retry in 30–60s.';
    lines.push(`  → ${hint}`);
  }

  return lines.join('\n');
}

interface RequestOptions {
  /** Set false for endpoints that don't accept Bearer auth (e.g. claimfees). */
  auth?: boolean;
}

export async function post<T = unknown>(
  pathname: string,
  body: unknown,
  opts: RequestOptions = {},
): Promise<T> {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}${pathname.startsWith('/') ? '' : '/'}${pathname}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'User-Agent': USER_AGENT,
  };

  if (opts.auth !== false) {
    const apiKey = getApiKey();
    if (!apiKey) {
      throw new ApiError(
        'SWARMS_API_KEY is not set. Export it in your shell:  export SWARMS_API_KEY="<your-key>"',
        401,
      );
    }
    headers.Authorization = `Bearer ${apiKey}`;
  }

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body ?? {}),
    });
  } catch (err) {
    throw new ApiError(
      `Network error\n  POST ${url}\n  → ${
        err instanceof Error ? err.message : String(err)
      }`,
      0,
    );
  }

  const text = await res.text();
  let data: unknown = text;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    // leave as text
  }

  if (!res.ok) {
    throw new ApiError(formatHttpError('POST', url, res, data, text), res.status, data);
  }

  return data as T;
}

export async function get<T = unknown>(
  pathname: string,
  opts: RequestOptions = {},
): Promise<T> {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}${pathname.startsWith('/') ? '' : '/'}${pathname}`;

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'User-Agent': USER_AGENT,
  };

  if (opts.auth === true) {
    const apiKey = getApiKey();
    if (!apiKey) {
      throw new ApiError(
        'SWARMS_API_KEY is not set. Export it in your shell:  export SWARMS_API_KEY="<your-key>"',
        401,
      );
    }
    headers.Authorization = `Bearer ${apiKey}`;
  }

  let res: Response;
  try {
    res = await fetch(url, { method: 'GET', headers });
  } catch (err) {
    throw new ApiError(
      `Network error\n  GET ${url}\n  → ${
        err instanceof Error ? err.message : String(err)
      }`,
      0,
    );
  }

  const text = await res.text();
  let data: unknown = text;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    // leave as text
  }

  if (!res.ok) {
    throw new ApiError(formatHttpError('GET', url, res, data, text), res.status, data);
  }

  return data as T;
}
