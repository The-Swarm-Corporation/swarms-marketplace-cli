/**
 * Config is read entirely from environment variables — no file I/O.
 *
 *   SWARMS_API_KEY      Required for endpoints that need Bearer auth
 *                       (launch agent/prompt/token, list).
 */

export const API_BASE = 'https://swarms.world';

const ALLOWED_HOSTS = new Set(['swarms.world']);
const ALLOWED_HOST_SUFFIXES = ['.swarms.world'];

export function getApiKey(): string | undefined {
  const v = process.env.SWARMS_API_KEY;
  return v && v.trim() ? v.trim() : undefined;
}

/**
 * Hardcoded marketplace host. There is no env override — the Bearer API key
 * and any wallet private key transmitted by the CLI must always go to
 * swarms.world. If we ever need a staging host, branch on `NODE_ENV` or
 * publish a separate build rather than reading an env var.
 */
export function getBaseUrl(): string {
  return API_BASE;
}

/**
 * True iff the hostname is on the swarms.world allowlist. Used by the
 * browser-launcher path so a server-supplied `listing_url` can't redirect
 * the user to `file://`, a typo-squat domain, or an arbitrary host.
 */
export function isAllowedSwarmsHost(hostname: string): boolean {
  if (ALLOWED_HOSTS.has(hostname)) return true;
  return ALLOWED_HOST_SUFFIXES.some((suffix) => hostname.endsWith(suffix));
}

/**
 * Optional wallet private key from env. Used by claim / claim-all / launch token
 * so they can run non-interactively. NEVER persisted by the CLI — env only.
 *
 * Accepts either:
 *   SWARMS_WALLET_PRIVATE_KEY   (preferred, scoped name)
 *   PRIVATE_KEY                 (convenience, matches common .env conventions)
 */
export function getWalletPrivateKey(): string | undefined {
  const a = process.env.SWARMS_WALLET_PRIVATE_KEY;
  if (a && a.trim()) return a.trim();
  const b = process.env.PRIVATE_KEY;
  if (b && b.trim()) return b.trim();
  return undefined;
}
