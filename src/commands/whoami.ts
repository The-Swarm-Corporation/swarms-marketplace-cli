import { Command } from 'commander';
import { getApiKey, getBaseUrl } from '../lib/config.js';
import { isFromEnvFile } from '../lib/env.js';
import { fail, info, label, theme } from '../lib/theme.js';

function mask(key: string): string {
  if (key.length <= 8) return '••••';
  return `${key.slice(0, 4)}…${key.slice(-4)}`;
}

export function registerWhoami(program: Command): void {
  program
    .command('whoami')
    .description('Show the active API key (masked), its source, and base URL.')
    .action(() => {
      const key = getApiKey();
      console.log('');
      console.log(label('API base', getBaseUrl()));
      if (key) {
        const source = isFromEnvFile('SWARMS_API_KEY') ? './.env' : 'shell env';
        console.log(
          `${label('SWARMS_API_KEY', mask(key))}  ${theme.dim(`(${source})`)}`,
        );
      } else {
        console.log(fail('SWARMS_API_KEY is not set.'));
        console.log(
          info(
            `Run ${theme.bold('swarms api-key')} to grab one, then export it — or put it in ${theme.bold('./.env')} (auto-loaded; shell env wins).`,
          ),
        );
        process.exitCode = 1;
      }
    });
}
