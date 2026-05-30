import { spawn } from 'node:child_process';

/**
 * Reject anything that isn't a plain http(s) URL before handing it to the OS
 * launcher. Blocks `javascript:`, `data:`, `file:`, SMB/UNC paths, and other
 * schemes that the default browser / `xdg-open` / `open` would otherwise act
 * on. Also rejects URL strings that contain control chars or shell-meta that
 * `cmd /c start` would re-parse on Windows.
 */
function isSafeBrowserUrl(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false;
  // No NUL / CR / LF / quotes / shell-meta in the serialized form.
  if (/[\x00-\x1f"'`$|&;<>^]/.test(url)) return false;
  return true;
}

/**
 * Launch the user's default browser to view a URL. Returns true if the
 * platform launcher was successfully spawned. Errors from the launcher are
 * swallowed — callers should print the URL up-front so the user always has
 * a copy-paste fallback when no GUI is available (CI, SSH session, etc).
 *
 * Returns false (and does NOT spawn) if the URL fails the safety check.
 */
export function openInBrowser(url: string): boolean {
  if (!isSafeBrowserUrl(url)) return false;

  const platform = process.platform;
  let cmd: string;
  let args: string[];
  if (platform === 'darwin') {
    cmd = 'open';
    args = [url];
  } else if (platform === 'win32') {
    // `start` is a cmd.exe built-in that re-parses its argument; we already
    // banned shell-meta in isSafeBrowserUrl, but use rundll32 anyway so the
    // URL goes through the URL-protocol handler instead of cmd's parser.
    cmd = 'rundll32';
    args = ['url.dll,FileProtocolHandler', url];
  } else {
    cmd = 'xdg-open';
    args = [url];
  }
  try {
    const child = spawn(cmd, args, {
      stdio: 'ignore',
      detached: true,
    });
    child.on('error', () => {
      /* swallow; we already printed the URL */
    });
    child.unref();
    return true;
  } catch {
    return false;
  }
}
