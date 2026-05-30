import { getApiKey, getBaseUrl } from './config.js';

export class ApiError extends Error {
  status: number;
  details?: unknown;
  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
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
      `Network error contacting ${url}: ${
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
    const message =
      (typeof data === 'object' &&
        data !== null &&
        ((data as { error?: string }).error ||
          (data as { message?: string }).message ||
          (data as { details?: string }).details)) ||
      `Request failed with status ${res.status}`;
    throw new ApiError(String(message), res.status, data);
  }

  return data as T;
}
