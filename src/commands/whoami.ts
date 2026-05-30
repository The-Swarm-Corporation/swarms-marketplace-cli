import { Command } from 'commander';
import { getApiKey, getBaseUrl } from '../lib/config.js';
import { fail, info, label, theme } from '../lib/theme.js';

function mask(key: string): string {
  if (key.length <= 8) return '••••';
  return `${key.slice(0, 4)}…${key.slice(-4)}`;
}

export function registerWhoami(program: Command): void {
  program
    .command('whoami')
    .description('Show the active API key (masked) and base URL.')
    .action(() => {
      const key = getApiKey();
      console.log('');
      console.log(label('API base', getBaseUrl()));
      if (key) {
        console.log(label('SWARMS_API_KEY', mask(key)));
      } else {
        console.log(fail('SWARMS_API_KEY is not set in your environment.'));
        console.log(
          info(
            `Run ${theme.bold('swarms api-key')} to grab one.`,
          ),
        );
        process.exitCode = 1;
      }
    });
}
