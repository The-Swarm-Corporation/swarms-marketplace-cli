import fs from 'node:fs';
import path from 'node:path';

/**
 * Zero-dependency `.env` auto-loader.
 *
 * Loads ONLY the documented configuration variables from `./.env` in the
 * current working directory. Two deliberate restrictions keep the security
 * story intact:
 *
 *   1. Allowlist — arbitrary keys in the file are ignored, so a stray
 *      `.env` cannot inject unrelated variables into the process.
 *   2. Shell wins — a variable already exported in the environment is
 *      never overwritten by the file.
 *
 * Values are never logged; callers may report *which* keys were loaded
 * and from where, but never their contents.
 */

const LOADABLE_KEYS = [
  'SWARMS_API_KEY',
  'SWARMS_WALLET_PRIVATE_KEY',
  'PRIVATE_KEY',
  'SWARMS_NO_ANIM',
  'NO_COLOR',
] as const;

export type LoadableKey = (typeof LOADABLE_KEYS)[number];

export interface EnvFileStatus {
  /** Absolute path of the `.env` file that was read, or null if none. */
  path: string | null;
  /** Keys applied to process.env from the file. */
  loaded: LoadableKey[];
  /** Keys present in the file but skipped because the shell already set them. */
  skipped: LoadableKey[];
}

let lastStatus: EnvFileStatus = { path: null, loaded: [], skipped: [] };

/** Status of the most recent loadEnvFile() call (for `login` / `whoami`). */
export function getEnvFileStatus(): EnvFileStatus {
  return lastStatus;
}

/** True if the named variable's current value came from the `.env` file. */
export function isFromEnvFile(key: string): boolean {
  return (lastStatus.loaded as string[]).includes(key);
}

/**
 * Parse dotenv-style text: `KEY=value` lines, optional `export ` prefix,
 * single/double quotes, `#` comments (full-line, or trailing after an
 * unquoted value), CRLF tolerated. Malformed lines are skipped silently.
 */
export function parseEnvFile(raw: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (let line of raw.split(/\r?\n/)) {
    line = line.trim();
    if (!line || line.startsWith('#')) continue;
    if (line.startsWith('export ')) line = line.slice('export '.length).trim();
    const eq = line.indexOf('=');
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
    let value = line.slice(eq + 1).trim();
    if (
      value.length >= 2 &&
      ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'")))
    ) {
      value = value.slice(1, -1);
    } else {
      const hash = value.indexOf('#');
      if (hash >= 0) value = value.slice(0, hash).trim();
    }
    out[key] = value;
  }
  return out;
}

/**
 * Load allowlisted variables from `<dir>/.env` into process.env (shell
 * values take precedence). Returns what happened; safe to call when the
 * file is absent or unreadable.
 */
export function loadEnvFile(dir: string = process.cwd()): EnvFileStatus {
  const file = path.join(dir, '.env');
  const status: EnvFileStatus = { path: null, loaded: [], skipped: [] };

  let raw: string;
  try {
    raw = fs.readFileSync(file, 'utf8');
  } catch {
    lastStatus = status;
    return status;
  }

  status.path = file;
  const parsed = parseEnvFile(raw);
  for (const key of LOADABLE_KEYS) {
    if (!(key in parsed)) continue;
    const current = process.env[key];
    if (current !== undefined && current.trim() !== '') {
      status.skipped.push(key);
    } else if (parsed[key].trim() !== '') {
      process.env[key] = parsed[key];
      status.loaded.push(key);
    }
  }
  lastStatus = status;
  return status;
}
