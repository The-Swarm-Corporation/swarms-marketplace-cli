import { Command } from 'commander';
import { getApiKey, getBaseUrl } from '../lib/config.js';
import { isFromEnvFile } from '../lib/env.js';
import { fail, info, label, ok, theme } from '../lib/theme.js';

function mask(key: string): string {
  if (key.length <= 8) return '••••';
  return `${key.slice(0, 4)}…${key.slice(-4)}`;
}

export function registerLogin(program: Command): void {
  program
    .command('login')
    .description(
      'Verify that SWARMS_API_KEY is set (shell env or ./.env).',
    )
    .action(() => {
      const key = getApiKey();
      console.log('');
      console.log(label('API base', getBaseUrl()));
      if (key) {
        const source = isFromEnvFile('SWARMS_API_KEY') ? './.env' : 'shell env';
        console.log(
          `${label('SWARMS_API_KEY', mask(key))}  ${theme.dim(`(${source})`)}`,
        );
        console.log(ok(`Ready. The CLI will use the key from ${source}.`));
      } else {
        console.log(fail('SWARMS_API_KEY is not set.'));
        console.log(
          info(
            `Export it:  ${theme.bold('export SWARMS_API_KEY="<your-key>"')}  — or put it in ${theme.bold('./.env')} (auto-loaded; shell env wins).`,
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
