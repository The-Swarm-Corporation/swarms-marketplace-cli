import { spawn } from 'node:child_process';
import { Command } from 'commander';
import { info, label, ok, theme } from '../lib/theme.js';

const API_KEYS_URL = 'https://swarms.world/platform/api-keys';

function openInBrowser(url: string): boolean {
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

export function registerApiKey(program: Command): void {
  program
    .command('api-key')
    .alias('keys')
    .description(
      'Open the Swarms API keys page in your browser so you can create / copy a key.',
    )
    .option('--no-open', 'Print the URL but do not launch a browser.')
    .action((opts: { open?: boolean }) => {
      console.log('');
      console.log(label('URL', API_KEYS_URL));
      console.log(
        info(
          `After copying, run:  ${theme.bold('export SWARMS_API_KEY="<your-key>"')}`,
        ),
      );
      console.log(
        info(
          `Verify with:        ${theme.bold('swarms login')}`,
        ),
      );

      if (opts.open !== false) {
        const launched = openInBrowser(API_KEYS_URL);
        if (launched) {
          console.log('');
          console.log(ok('Opening in your default browser…'));
        }
      }
    });
}
