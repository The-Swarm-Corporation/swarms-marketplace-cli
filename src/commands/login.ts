import { Command } from 'commander';
import { getApiKey, getBaseUrl } from '../lib/config.js';
import { fail, info, label, ok, theme } from '../lib/theme.js';

function mask(key: string): string {
  if (key.length <= 8) return '••••';
  return `${key.slice(0, 4)}…${key.slice(-4)}`;
}

export function registerLogin(program: Command): void {
  program
    .command('login')
    .description(
      'Verify that SWARMS_API_KEY is set in your environment.',
    )
    .action(() => {
      const key = getApiKey();
      console.log('');
      console.log(label('API base', getBaseUrl()));
      if (key) {
        console.log(label('SWARMS_API_KEY', mask(key)));
        console.log(ok('Ready. The CLI will use the key in $SWARMS_API_KEY.'));
      } else {
        console.log(fail('SWARMS_API_KEY is not set.'));
        console.log(
          info(
            `Export it before running other commands:  ${theme.bold(
              'export SWARMS_API_KEY="<your-key>"',
            )}`,
          ),
        );
        console.log(
          info(
            `Get an API key at  ${theme.bold('https://swarms.world/platform/api-keys')}`,
          ),
        );
        process.exitCode = 1;
      }
    });
}
