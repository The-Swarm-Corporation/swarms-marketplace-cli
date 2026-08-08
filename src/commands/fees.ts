import { Command } from 'commander';
import ora from 'ora';
import { ApiError, get } from '../lib/api.js';
import { fail, ok, label, theme, info } from '../lib/theme.js';

interface FeesResponse {
  unclaimedSol?: number;
  claimedSol?: number;
  totalSol?: number;
}

export function registerFees(program: Command): void {
  program
    .command('fees')
    .description('Peek at unclaimed/claimed/lifetime fees for a token mint without claiming.')
    .requiredOption('--ca <mint>', 'Token mint address (contract address) of the product')
    .option('--wallet <pubkey>', 'Wallet public key to inspect (default: none)')
    .option('--json', 'Print raw JSON payload')
    .action(async (opts: { ca: string; wallet?: string; json?: boolean }) => {
      try {
        const ca = opts.ca.trim();
        if (ca.length < 32 || ca.length > 44) {
          throw new Error('Invalid --ca (token mint format).');
        }
        const wallet = opts.wallet?.trim();
        const spinner = ora({ text: `Fetching fees for ${ca}…`, color: 'red' }).start();
        try {
          const query = new URLSearchParams({ ca });
          if (wallet) query.append('wallet', wallet);
          const result = await get<FeesResponse>(`/api/product/fees?${query.toString()}`, {
            auth: false,
          });
          spinner.stop();
          console.log('');
          if (opts.json) {
            console.log(JSON.stringify(result, null, 2));
            return;
          }
          console.log(ok('Fees fetched.'));
          console.log(
            label(
              'Totals',
              `${theme.textMuted('unclaimed=')}${formatSol(result.unclaimedSol)} ` +
                `${theme.textMuted('claimed=')}${formatSol(result.claimedSol)} ` +
                `${theme.textMuted('lifetime=')}${formatSol(result.totalSol)}`,
            ),
          );
        } catch (err) {
          spinner.stop();
          throw err;
        }
      } catch (err) {
        console.log('');
        if (err instanceof ApiError) {
          console.log(fail(err.message));
        } else {
          console.log(fail(err instanceof Error ? err.message : String(err)));
        }
        if (err instanceof ApiError && err.status === 401) {
          console.log(info('Run `swarms login` if your env requires it.'));
        }
        process.exitCode = 1;
      }
    });
}

function formatSol(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '0';
  return n.toFixed(6).replace(/0+$/, '').replace(/\.$/, '');
}
