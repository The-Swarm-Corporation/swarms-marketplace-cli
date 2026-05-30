import { Command } from 'commander';
import { openInBrowser } from '../lib/open.js';
import { info, label, ok, theme } from '../lib/theme.js';

const API_KEYS_URL = 'https://swarms.world/platform/api-keys';

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
