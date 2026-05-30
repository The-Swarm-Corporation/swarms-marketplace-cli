/**
 * Config is read entirely from environment variables — no file I/O.
 *
 *   SWARMS_API_KEY        Required for endpoints that need Bearer auth
 *                         (launch agent/prompt/token, list).
 *   SWARMS_API_BASE_URL   Optional override of the API host.
 *                         Defaults to https://swarms.world.
 */

export const DEFAULT_API_BASE = 'https://swarms.world';

export function getApiKey(): string | undefined {
  const v = process.env.SWARMS_API_KEY;
  return v && v.trim() ? v.trim() : undefined;
}

/**
 * Optional default username for commands that take --user (notably `list`).
 * Lets `swarms list` work with no flags in the common case.
 */
export function getUsername(): string | undefined {
  const v = process.env.SWARMS_USERNAME;
  return v && v.trim() ? v.trim() : undefined;
}

export function getBaseUrl(): string {
  const v = process.env.SWARMS_API_BASE_URL;
  return (v && v.trim() ? v.trim() : DEFAULT_API_BASE).replace(/\/+$/, '');
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
