import { spawn } from 'node:child_process';

/**
 * Launch the user's default browser to view a URL. Returns true if the
 * platform launcher was successfully spawned. Errors from the launcher are
 * swallowed — callers should print the URL up-front so the user always has
 * a copy-paste fallback when no GUI is available (CI, SSH session, etc).
 */
export function openInBrowser(url: string): boolean {
  const platform = process.platform;
  let cmd: string;
  let args: string[];
  if (platform === 'darwin') {
    cmd = 'open';
    args = [url];
  } else if (platform === 'win32') {
    cmd = 'cmd';
    args = ['/c', 'start', '""', url];
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
