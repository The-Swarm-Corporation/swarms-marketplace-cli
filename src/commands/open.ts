import { Command } from 'commander';
import ora from 'ora';
import { ApiError, get } from '../lib/api.js';
import { getBaseUrl, isAllowedSwarmsHost } from '../lib/config.js';
import { openInBrowser } from '../lib/open.js';
import { fail, info, label, ok, theme } from '../lib/theme.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const BASE58_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

type ProductType = 'agent' | 'prompt' | 'tool';

interface TokenizedItem {
  id: string;
  name: string;
  type: ProductType;
  token_address: string;
  listing_url: string;
}

interface TokenizedResponse {
  data: TokenizedItem[];
  pagination: { page: number; total_pages: number; has_next: boolean };
}

async function resolveByMint(ca: string): Promise<TokenizedItem | null> {
  const limit = 500;
  for (let page = 1; page <= 20; page++) {
    const qs = new URLSearchParams({
      type: 'all',
      limit: String(limit),
      page: String(page),
    });
    const body = await get<TokenizedResponse>(
      `/api/get-tokenized-products?${qs.toString()}`,
    );
    const items = body.data ?? [];
    const found = items.find((p) => p.token_address === ca);
    if (found) return found;
    if (!body.pagination?.has_next) break;
  }
  return null;
}

export function registerOpen(program: Command): void {
  program
    .command('open <ref>')
    .description(
      "Open a product's listing page in your browser. " +
        '<ref> is a product id (UUID) or token mint (base58 CA).',
    )
    .option(
      '-t, --type <agent|prompt|tool>',
      'Product type. Skips the marketplace lookup when <ref> is a UUID.',
    )
    .option('--print', 'Print the URL but do not launch a browser.')
    .option('--no-open', 'Alias for --print.')
    .action(
      async (
        ref: string,
        opts: { type?: ProductType; print?: boolean; open?: boolean },
      ) => {
        const printOnly = opts.print === true || opts.open === false;

        const isUuid = UUID_RE.test(ref);
        const isCa = !isUuid && BASE58_RE.test(ref);

        if (!isUuid && !isCa) {
          console.log('');
          console.log(
            fail(
              `Could not recognize "${ref}" as a UUID or a base58 token mint.`,
            ),
          );
          process.exitCode = 1;
          return;
        }

        if (opts.type && !['agent', 'prompt', 'tool'].includes(opts.type)) {
          console.log('');
          console.log(
            fail(`--type must be one of agent | prompt | tool (got "${opts.type}").`),
          );
          process.exitCode = 1;
          return;
        }

        if (isUuid && !opts.type) {
          console.log('');
          console.log(
            fail(
              'UUIDs need a type. Re-run with --type agent|prompt|tool.',
            ),
          );
          console.log(
            info(
              `Example: ${theme.bold(`swarms open --type agent ${ref}`)}`,
            ),
          );
          process.exitCode = 1;
          return;
        }

        let url: string;
        let resolved: TokenizedItem | null = null;

        if (isUuid) {
          url = `${getBaseUrl()}/${opts.type}/${ref}`;
        } else {
          const spinner = ora({
            text: 'Resolving mint…',
            color: 'red',
          }).start();
          try {
            resolved = await resolveByMint(ref);
            spinner.stop();
          } catch (err) {
            spinner.stop();
            console.log('');
            if (err instanceof ApiError) console.log(fail(err.message));
            else
              console.log(
                fail(err instanceof Error ? err.message : String(err)),
              );
            process.exitCode = 1;
            return;
          }

          if (!resolved) {
            console.log('');
            console.log(fail(`No tokenized product found for mint "${ref}".`));
            process.exitCode = 1;
            return;
          }
          // The listing URL comes from the marketplace API; refuse to follow
          // it anywhere other than swarms.world so a poisoned listing can't
          // redirect the user off-site (typo-squat / phishing).
          let parsedListing: URL | null = null;
          try {
            parsedListing = new URL(resolved.listing_url);
          } catch {
            /* fall through to the host check below */
          }
          if (
            !parsedListing ||
            parsedListing.protocol !== 'https:' ||
            !isAllowedSwarmsHost(parsedListing.hostname)
          ) {
            console.log('');
            console.log(
              fail(
                `Refusing to open untrusted listing URL: ${resolved.listing_url}`,
              ),
            );
            process.exitCode = 1;
            return;
          }
          url = resolved.listing_url;
        }

        console.log('');
        if (resolved) {
          console.log(
            `  ${theme.chip(' ' + resolved.type.toUpperCase() + ' ')}  ${theme.bold(resolved.name)}`,
          );
        }
        console.log(label('URL', url));

        if (printOnly) return;

        const launched = openInBrowser(url);
        console.log('');
        if (launched) console.log(ok('Opening in your default browser…'));
        else
          console.log(
            info('Could not launch a browser; the URL is printed above.'),
          );
      },
    );
}
