import { Command } from 'commander';
import ora from 'ora';
import { ApiError } from '../lib/api.js';
import { getBaseUrl } from '../lib/config.js';
import { bullet, divider, fail, info, label, theme } from '../lib/theme.js';

interface TokenizedProduct {
  id: string;
  name: string;
  type: 'agent' | 'prompt' | 'tool';
  token_address: string;
  token_symbol: string | null;
  pool_address: string | null;
  user_id: string | null;
  status: string | null;
  created_at: string;
  listing_url: string;
}

interface TokenizedResponse {
  total: number;
  page: number;
  limit: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
  counts: { agents: number; prompts: number; tools: number };
  products: TokenizedProduct[];
}

export function registerListTokenized(program: Command): void {
  program
    .command('list-tokenized')
    .alias('tokens')
    .description(
      'List every tokenized product on the marketplace ' +
        '(global, no API key required).',
    )
    .option(
      '--type <all|agent|prompt|tool>',
      'Filter by product type (default all)',
      'all',
    )
    .option('--limit <n>', 'Page size 1–500 (default 100)', '100')
    .option('--page <n>', 'Page number (default 1)', '1')
    .option('--json', 'Print raw JSON instead of the formatted view.')
    .action(
      async (opts: { type: string; limit: string; page: string; json?: boolean }) => {
        const spinner = ora({
          text: 'Fetching tokenized products…',
          color: 'red',
        }).start();
        try {
          const qs = new URLSearchParams({
            type: opts.type,
            limit: opts.limit,
            page: opts.page,
          });
          const url = `${getBaseUrl()}/api/get-tokenized-products?${qs.toString()}`;
          const res = await fetch(url);
          const text = await res.text();
          let data: unknown = text;
          try {
            data = text ? JSON.parse(text) : {};
          } catch {
            // leave as text
          }
          if (!res.ok) {
            throw new ApiError(
              `Request failed with status ${res.status}`,
              res.status,
              data,
            );
          }
          spinner.stop();

          if (opts.json) {
            console.log(JSON.stringify(data, null, 2));
            return;
          }

          const body = data as TokenizedResponse;
          console.log('');
          console.log(
            `  ${theme.chip(' TOKENIZED ')}  ${theme.text(
              `${body.total} total · page ${body.page}/${body.total_pages} · ${body.products.length} shown`,
            )}`,
          );
          console.log(
            `  ${theme.textMuted(
              `agents=${body.counts.agents}  prompts=${body.counts.prompts}  tools=${body.counts.tools}`,
            )}`,
          );
          console.log(divider());

          if (body.products.length === 0) {
            console.log(info('No tokenized products in this page.'));
            return;
          }

          for (const p of body.products) {
            const sym = p.token_symbol
              ? ` ${theme.chip(' ' + p.token_symbol + ' ')}`
              : '';
            console.log(
              bullet(
                `${theme.brandSoft('[' + p.type + ']')} ${theme.bold(p.name)}${sym}`,
              ),
            );
            console.log(label('  Token CA', p.token_address));
            if (p.pool_address) console.log(label('  Pool', p.pool_address));
            if (p.user_id) console.log(label('  Owner', p.user_id));
            console.log(label('  URL', p.listing_url));
            console.log('');
          }
          if (body.has_next) {
            console.log(
              info(
                `More results — re-run with ${theme.bold('--page ' + (body.page + 1))}.`,
              ),
            );
          }
        } catch (err) {
          spinner.stop();
          console.log('');
          if (err instanceof ApiError) console.log(fail(err.message));
          else console.log(fail(err instanceof Error ? err.message : String(err)));
          process.exitCode = 1;
        }
      },
    );
}
