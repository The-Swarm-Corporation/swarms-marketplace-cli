import { Command } from 'commander';
import ora from 'ora';
import { ApiError, get, post } from '../lib/api.js';
import { getWalletPrivateKey } from '../lib/config.js';
import { promptSecret } from '../lib/prompt.js';
import { divider, fail, info, ok, theme } from '../lib/theme.js';

interface GlobalTokenizedResponse {
  total: number;
  counts?: { agents: number; prompts: number };
  data: Array<{
    id: string;
    name: string;
    type: 'agent' | 'prompt';
    token_address: string;
  }>;
  pagination: {
    page: number;
    limit: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

interface ClaimResponse {
  success?: boolean;
  signature?: string | null;
  amountClaimedSol?: number | null;
  error?: string;
}

interface Target {
  name: string;
  type: 'agent' | 'prompt';
  token_address: string;
}

async function fetchOwnTargets(): Promise<Target[]> {
  // Paginate up to 500 per page; the endpoint caps at 500. The endpoint
  // returns only the authenticated caller's tokenized products.
  const out: Target[] = [];
  let page = 1;
  const limit = 500;
  while (true) {
    const body = await get<GlobalTokenizedResponse>(
      `/api/get-tokenized-products?type=all&limit=${limit}&page=${page}`,
      { auth: true },
    );
    const items = body.data ?? [];
    for (const p of items) {
      out.push({ name: p.name, type: p.type, token_address: p.token_address });
    }
    if (out.length >= body.total || items.length < limit) break;
    page++;
    if (page > 20) break;
  }
  return out;
}

export function registerClaimAll(program: Command): void {
  program
    .command('claim-all')
    .description(
      'Claim trading fees across every tokenized product you own. ' +
        'Requires an API key (to enumerate your mints) and a wallet key (to sign claims).',
    )
    .option(
      '--private-key <base58>',
      'Wallet private key (base58). Falls back to $SWARMS_WALLET_PRIVATE_KEY or $PRIVATE_KEY, otherwise prompts securely.',
    )
    .option('--dry-run', "Print the list of mints that would be claimed, but don't claim.")
    .action(
      async (opts: {
        privateKey?: string;
        dryRun?: boolean;
      }) => {
        try {
          const listSpinner = ora({
            text: 'Fetching your tokenized products…',
            color: 'red',
          }).start();
          let targets: Target[];
          try {
            targets = await fetchOwnTargets();
          } finally {
            listSpinner.stop();
          }

          if (targets.length === 0) {
            console.log('');
            console.log(info('You have no tokenized products yet — try `swarms launch token`.'));
            return;
          }

          console.log('');
          console.log(
            `  ${theme.chip(' CLAIM ALL ')}  ${theme.text(
              `${targets.length} mint${targets.length === 1 ? '' : 's'}`,
            )}`,
          );
          console.log(divider());
          for (const t of targets) {
            console.log(
              `  ${theme.brandSoft('[' + t.type + ']')} ${theme.bold(t.name)}  ${theme.textMuted(
                t.token_address,
              )}`,
            );
          }
          console.log('');

          if (opts.dryRun) {
            console.log(info('Dry run — no claims submitted.'));
            return;
          }

          let privateKey =
            (opts.privateKey || '').trim() || getWalletPrivateKey() || '';
          if (!privateKey) {
            privateKey = (
              await promptSecret(
                'Paste wallet private key (base58, hidden, used in memory only):',
              )
            ).trim();
          }
          if (!privateKey) throw new Error('A wallet private key is required.');

          let succeeded = 0;
          let failed = 0;
          let skipped = 0;
          let totalSol = 0;

          for (const t of targets) {
            const spinner = ora({
              text: `Claiming ${t.token_address}…`,
              color: 'red',
            }).start();
            try {
              const result = await post<ClaimResponse>(
                '/api/product/claimfees',
                { ca: t.token_address, privateKey },
                { auth: false },
              );
              spinner.stop();
              const amt = result.amountClaimedSol;
              if (typeof amt === 'number' && Number.isFinite(amt)) {
                totalSol += amt;
                if (amt > 0) succeeded++;
                else skipped++;
              } else {
                succeeded++;
              }
              console.log(
                ok(
                  `${theme.bold(t.name)}  ${theme.textMuted(t.token_address)}  ` +
                    `${theme.text(
                      amt != null ? `+${formatSol(amt)} SOL` : 'submitted',
                    )}` +
                    (result.signature
                      ? `  ${theme.dim(result.signature.slice(0, 12) + '…')}`
                      : ''),
                ),
              );
            } catch (err) {
              spinner.stop();
              failed++;
              const msg = err instanceof Error ? err.message : String(err);
              console.log(
                fail(
                  `${theme.bold(t.name)}  ${theme.textMuted(t.token_address)}  ${msg}`,
                ),
              );
            }
          }

          console.log(divider());
          console.log(
            `  ${theme.chip(' DONE ')}  ${theme.text(
              `${succeeded} claimed · ${skipped} nothing-to-claim · ${failed} failed · ${formatSol(totalSol)} SOL total`,
            )}`,
          );
          if (failed > 0) process.exitCode = 1;
        } catch (err) {
          console.log('');
          if (err instanceof ApiError) {
            console.log(fail(err.message));
            if (err.status === 401)
              console.log(info('Run `swarms login` to set an API key.'));
          } else {
            console.log(
              fail(err instanceof Error ? err.message : String(err)),
            );
          }
          process.exitCode = 1;
        }
      },
    );
}

function formatSol(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '0';
  return n.toFixed(6).replace(/0+$/, '').replace(/\.$/, '');
}
