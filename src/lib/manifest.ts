import fs from 'node:fs';

/**
 * Read a manifest JSON from a file path, or "-" for stdin.
 * Throws a clear error on bad JSON or missing file.
 */
export async function loadManifest<T = Record<string, unknown>>(
  pathOrDash: string,
): Promise<T> {
  let raw: string;
  if (pathOrDash === '-') {
    raw = await readAllStdin();
  } else {
    if (!fs.existsSync(pathOrDash)) {
      throw new Error(`Manifest file not found: ${pathOrDash}`);
    }
    raw = fs.readFileSync(pathOrDash, 'utf8');
  }
  try {
    return JSON.parse(raw) as T;
  } catch (err) {
    throw new Error(
      `Manifest is not valid JSON (${pathOrDash === '-' ? 'stdin' : pathOrDash}): ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
  }
}

function readAllStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    let buf = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => (buf += chunk));
    process.stdin.on('end', () => resolve(buf));
    process.stdin.on('error', reject);
  });
}
