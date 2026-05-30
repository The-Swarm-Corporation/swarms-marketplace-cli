import { Command } from 'commander';
import ora from 'ora';
import { ApiError, post } from '../lib/api.js';
import { getWalletPrivateKey } from '../lib/config.js';
import { loadManifest } from '../lib/manifest.js';
import { promptSecret } from '../lib/prompt.js';
import { fail, info, label, ok } from '../lib/theme.js';

interface TokenLaunchResponse {
  id?: string;
  listing_url?: string;
  token_address?: string | null;
  pool_address?: string | null;
  message?: string;
}

export function registerLaunchToken(launch: Command): void {
  launch
    .command('token')
    .description(
      'Launch a tokenized agent on Solana via the Swarms marketplace.',
    )
    .option(
      '-m, --manifest <path>',
      'JSON manifest with at minimum {name, description, ticker}. Use "-" for stdin.',
    )
    .option('--name <name>', 'Agent name')
    .option('--description <text>', 'Agent description')
    .option('--ticker <TICKER>', 'Token symbol (1–10 uppercase chars)')
    .option(
      '--quote-mint <SOL|USDC>',
      'Bonding-curve quote currency (default SOL)',
    )
    .option(
      '--fee-selection <market|frenzy>',
      'Fee mode (default market)',
    )
    .option(
      '--image <urlOrDataUrl>',
      'Image as a URL or base64 data URL (optional)',
    )
    .option(
      '--private-key <base58>',
      'Wallet private key (base58). If omitted, prompts securely.',
    )
    .action(
      async (opts: {
        manifest?: string;
        name?: string;
        description?: string;
        ticker?: string;
        quoteMint?: string;
        feeSelection?: string;
        image?: string;
        privateKey?: string;
      }) => {
        try {
          let payload: Record<string, unknown> = {};
          if (opts.manifest) {
            payload = await loadManifest<Record<string, unknown>>(opts.manifest);
          }
          if (opts.name !== undefined) payload.name = opts.name;
          if (opts.description !== undefined)
            payload.description = opts.description;
          if (opts.ticker !== undefined) payload.ticker = opts.ticker;
          if (opts.quoteMint !== undefined) payload.quote_mint = opts.quoteMint;
          if (opts.feeSelection !== undefined)
            payload.fee_selection = opts.feeSelection;
          if (opts.image !== undefined) payload.image = opts.image;

          let privateKey =
            (opts.privateKey || '').trim() || getWalletPrivateKey() || '';
          if (!privateKey) {
            privateKey = (
              await promptSecret(
                'Paste wallet private key (base58, hidden, used only for this tx):',
              )
            ).trim();
          }
          if (!privateKey) throw new Error('A wallet private key is required.');
          payload.private_key = privateKey;

          if (
            typeof payload.name !== 'string' ||
            payload.name.trim().length < 2
          ) {
            throw new Error('Missing or short --name (need ≥ 2 chars).');
          }
          if (
            typeof payload.description !== 'string' ||
            !payload.description.trim()
          ) {
            throw new Error('Missing --description.');
          }
          if (
            typeof payload.ticker !== 'string' ||
            !/^[A-Za-z0-9]{1,10}$/.test(payload.ticker)
          ) {
            throw new Error(
              '--ticker must be 1–10 chars (letters/numbers only).',
            );
          }

          const spinner = ora({
            text: `Launching token "${String(payload.ticker).toUpperCase()}"…`,
            color: 'red',
          }).start();
          try {
            const result = await post<TokenLaunchResponse>(
              '/api/token/launch',
              payload,
            );
            spinner.stop();
            console.log('');
            console.log(ok('Token launched.'));
            if (result.id) console.log(label('Agent ID', result.id));
            if (result.token_address)
              console.log(label('Token CA', result.token_address));
            if (result.pool_address)
              console.log(label('Pool', result.pool_address));
            if (result.listing_url)
              console.log(label('Listing', result.listing_url));
          } catch (err) {
            spinner.stop();
            throw err;
          }
        } catch (err) {
          console.log('');
          if (err instanceof ApiError) {
            console.log(fail(err.message));
            if (err.status === 401) {
              console.log(info('Run `swarms login` to set an API key.'));
            }
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
