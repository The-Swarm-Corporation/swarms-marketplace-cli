import { Command } from 'commander';
import ora from 'ora';
import { ApiError, get } from '../lib/api.js';
import { bullet, divider, fail, info, label, theme } from '../lib/theme.js';

interface TokenizedProduct {
  id: string;
  name: string;
  type: 'agent' | 'prompt';
  token_address: string;
  created_at: string;
  listing_url: string;
}

interface Pagination {
  page: number;
  limit: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

interface TokenizedResponse {
  total: number;
  counts: { agents: number; prompts: number };
  data: TokenizedProduct[];
  pagination: Pagination;
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
      '--type <all|agent|prompt>',
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
          const body = await get<TokenizedResponse>(
            `/api/get-tokenized-products?${qs.toString()}`,
          );
          spinner.stop();

          if (opts.json) {
            console.log(JSON.stringify(body, null, 2));
            return;
          }

          const items = body.data ?? [];
          const { page, total_pages, has_next } = body.pagination;

          console.log('');
          console.log(
            `  ${theme.chip(' TOKENIZED ')}  ${theme.text(
              `${body.total} total · page ${page}/${total_pages} · ${items.length} shown`,
            )}`,
          );
          console.log(
            `  ${theme.textMuted(
              `agents=${body.counts.agents}  prompts=${body.counts.prompts}`,
            )}`,
          );
          console.log(divider());

          if (items.length === 0) {
            console.log(info('No tokenized products in this page.'));
            return;
          }

          for (const p of items) {
            console.log(
              bullet(
                `${theme.brandSoft('[' + p.type + ']')} ${theme.bold(p.name)}`,
              ),
            );
            console.log(label('  Token CA', p.token_address));
            console.log(label('  URL', p.listing_url));
            console.log('');
          }
          if (has_next) {
            console.log(
              info(
                `More results — re-run with ${theme.bold('--page ' + (page + 1))}.`,
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
