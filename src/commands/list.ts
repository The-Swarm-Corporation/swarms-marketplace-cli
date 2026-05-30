import { Command } from 'commander';
import ora from 'ora';
import { ApiError, post } from '../lib/api.js';
import { getBaseUrl, getUsername } from '../lib/config.js';
import { fail, info, theme } from '../lib/theme.js';

type BusinessModel = 'free' | 'paid' | 'tokenized';

interface UserProduct {
  id: string;
  name: string;
  description?: string;
  type: 'agent' | 'prompt' | 'tool';
  business_model: BusinessModel;
  listing_url?: string;
}

interface UserProductsSummary {
  total_prompts: number;
  total_agents: number;
  total_tools: number;
  free_products: number;
  paid_products: number;
  tokenized_products: number;
}

interface UserProductsResponse {
  user_id: string;
  username: string;
  total_products: number;
  agents: UserProduct[];
  prompts: UserProduct[];
  tools: UserProduct[];
  summary: UserProductsSummary;
}

function badge(p: UserProduct): string {
  switch (p.business_model) {
    case 'tokenized':
      return theme.chip(' TOKENIZED ');
    case 'paid':
      return theme.brandSoft('paid');
    case 'free':
    default:
      return theme.textMuted('free');
  }
}

interface RenderOpts {
  tokenizedOnly: boolean;
}

function renderBranch(
  label: 'agents' | 'prompts' | 'tools',
  items: UserProduct[],
  isLast: boolean,
  opts: RenderOpts,
): string[] {
  const out: string[] = [];
  const branch = isLast ? '└─' : '├─';
  const cont = isLast ? '  ' : '│ ';
  const filtered = opts.tokenizedOnly
    ? items.filter((p) => p.business_model === 'tokenized')
    : items;

  out.push(
    `${theme.brand(branch)} ${theme.bold(label)} ${theme.dim(
      `(${filtered.length}${
        items.length !== filtered.length ? ` of ${items.length} shown` : ''
      })`,
    )}`,
  );

  if (filtered.length === 0) {
    out.push(`${theme.brand(cont)} ${theme.dim('  none')}`);
    return out;
  }

  filtered.forEach((p, i) => {
    const last = i === filtered.length - 1;
    const tick = last ? '└─' : '├─';
    out.push(
      `${theme.brand(cont)} ${theme.brand(tick)} ${theme.text(p.name)}  ${badge(p)}`,
    );
  });
  return out;
}

export function registerList(program: Command): void {
  program
    .command('list')
    .description(
      'List your published products as a tree, grouped by type ' +
        '(agents / prompts / tools).',
    )
    .option(
      '-u, --user <username>',
      'swarms.world username. Defaults to $SWARMS_USERNAME if set.',
    )
    .option('--user-id <id>', 'User UUID (alternative to --user).')
    .option('--tokenized', 'Only show tokenized products.')
    .option('--json', 'Print the raw API payload instead of the tree view.')
    .action(
      async (opts: {
        user?: string;
        userId?: string;
        tokenized?: boolean;
        json?: boolean;
      }) => {
        const user = opts.user || getUsername();
        if (!user && !opts.userId) {
          console.log('');
          console.log(
            fail(
              'Pass --user <username> or --user-id <uuid>, or export $SWARMS_USERNAME.',
            ),
          );
          process.exitCode = 1;
          return;
        }

        const spinner = ora({
          text: 'Fetching your products…',
          color: 'red',
        }).start();
        try {
          const body: Record<string, unknown> = {
            page: 1,
            limit: 100,
            product_type: 'all',
          };
          if (opts.userId) body.user_id = opts.userId;
          else if (user) body.username = user;

          const data = await post<UserProductsResponse>(
            '/api/user-products',
            body,
          );
          spinner.stop();

          if (opts.json) {
            console.log(JSON.stringify(data, null, 2));
            return;
          }

          const counts = {
            agents: data.summary?.total_agents ?? data.agents.length,
            prompts: data.summary?.total_prompts ?? data.prompts.length,
            tools: data.summary?.total_tools ?? data.tools.length,
          };
          const tokenizedCount =
            data.summary?.tokenized_products ??
            [...data.agents, ...data.prompts, ...data.tools].filter(
              (p) => p.business_model === 'tokenized',
            ).length;

          console.log('');
          console.log(
            `  ${theme.brand('▎')} ${theme.bold('@' + data.username)} ${theme.dim('·')} ${theme.text(
              `${data.total_products} product${data.total_products === 1 ? '' : 's'}`,
            )} ${theme.dim('·')} ${theme.text(
              `${tokenizedCount} tokenized`,
            )} ${theme.dim('·')} ${theme.textMuted(getBaseUrl())}`,
          );
          console.log('');

          const branches: Array<{
            label: 'agents' | 'prompts' | 'tools';
            items: UserProduct[];
          }> = [
            { label: 'agents', items: data.agents || [] },
            { label: 'prompts', items: data.prompts || [] },
            { label: 'tools', items: data.tools || [] },
          ];

          const nonEmpty = branches.filter((b) => {
            if (b.items.length === 0) return false;
            if (!opts.tokenized) return true;
            return b.items.some((p) => p.business_model === 'tokenized');
          });

          if (nonEmpty.length === 0) {
            console.log(
              info(
                opts.tokenized
                  ? 'No tokenized products yet — try `swarms launch token`.'
                  : 'No products yet — try `swarms launch agent` to publish.',
              ),
            );
            return;
          }

          console.log(`${theme.brand('●')} ${theme.bold('@' + data.username)}`);
          nonEmpty.forEach((b, i) => {
            const rendered = renderBranch(
              b.label,
              b.items,
              i === nonEmpty.length - 1,
              { tokenizedOnly: !!opts.tokenized },
            );
            for (const line of rendered) console.log(line);
          });

          console.log('');
          if (tokenizedCount > 0) {
            console.log(
              `  ${theme.dim('?')} ${theme.textMuted('claim fees with')} ${theme.text(
                `swarms claim-all --global`,
              )}`,
            );
          }
          console.log(
            `  ${theme.dim('?')} ${theme.textMuted('browse global tokenized products with')} ${theme.text(
              'swarms tokens',
            )}`,
          );
          if (counts.agents + counts.prompts + counts.tools !== data.total_products) {
            console.log(
              `  ${theme.dim('?')} ${theme.textMuted(
                `breakdown: ${counts.agents} agents · ${counts.prompts} prompts · ${counts.tools} tools`,
              )}`,
            );
          }
        } catch (err) {
          spinner.stop();
          console.log('');
          if (err instanceof ApiError) {
            console.log(fail(err.message));
            if (err.status === 401)
              console.log(info('Run `swarms login` to verify your API key.'));
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
