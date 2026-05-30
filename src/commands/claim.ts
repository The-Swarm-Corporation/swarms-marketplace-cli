import { Command } from 'commander';
import ora from 'ora';
import { ApiError, post } from '../lib/api.js';
import { getWalletPrivateKey } from '../lib/config.js';
import { promptSecret } from '../lib/prompt.js';
import { fail, info, label, ok, theme } from '../lib/theme.js';

interface ClaimResponse {
  success?: boolean;
  signature?: string | null;
  amountClaimedSol?: number | null;
  fees?: {
    unclaimedSol?: number;
    claimedSol?: number;
    totalSol?: number;
  } | null;
  error?: string;
}

export function registerClaim(program: Command): void {
  program
    .command('claim')
    .description(
      'Claim trading fees for a single tokenized product (by token mint / CA).',
    )
    .requiredOption(
      '--ca <mint>',
      'Token mint address (contract address) of the product',
    )
    .option(
      '--private-key <base58>',
      'Wallet private key (base58). If omitted, prompts securely.',
    )
    .action(async (opts: { ca: string; privateKey?: string }) => {
      try {
        const ca = opts.ca.trim();
        if (ca.length < 32 || ca.length > 44) {
          throw new Error('Invalid --ca (token mint format).');
        }
        let privateKey = (opts.privateKey || '').trim() || getWalletPrivateKey() || '';
        if (!privateKey) {
          privateKey = (
            await promptSecret(
              'Paste wallet private key (base58, hidden, used only for this tx):',
            )
          ).trim();
        }
        if (!privateKey) throw new Error('A wallet private key is required.');

        const spinner = ora({
          text: `Claiming fees for ${ca}…`,
          color: 'red',
        }).start();
        try {
          // claimfees does NOT use the API-key Bearer auth; private key is the auth.
          const result = await post<ClaimResponse>(
            '/api/product/claimfees',
            { ca, privateKey },
            { auth: false },
          );
          spinner.stop();
          console.log('');
          console.log(ok('Claim submitted.'));
          if (result.signature)
            console.log(label('Signature', result.signature));
          if (result.amountClaimedSol != null)
            console.log(
              label('Claimed', `${formatSol(result.amountClaimedSol)} SOL`),
            );
          if (result.fees) {
            console.log(
              label(
                'Totals',
                `${theme.textMuted('unclaimed=')}${formatSol(result.fees.unclaimedSol)} ` +
                  `${theme.textMuted('claimed=')}${formatSol(result.fees.claimedSol)} ` +
                  `${theme.textMuted('lifetime=')}${formatSol(result.fees.totalSol)}`,
              ),
            );
          }
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
