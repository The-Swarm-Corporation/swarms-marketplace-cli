import { Command } from 'commander';
import ora from 'ora';
import { ApiError, post } from '../lib/api.js';
import { loadManifest } from '../lib/manifest.js';
import { fail, info, label, ok } from '../lib/theme.js';

interface AddPromptResponse {
  id?: string;
  listing_url?: string;
  message?: string;
}

export function registerLaunchPrompt(launch: Command): void {
  launch
    .command('prompt')
    .description('Publish a prompt to the Swarms Marketplace.')
    .option(
      '-m, --manifest <path>',
      'Path to a JSON manifest. Use "-" to read from stdin.',
    )
    .option('--name <name>', 'Prompt name (overrides manifest)')
    .option('--description <text>', 'Description (overrides manifest)')
    .option(
      '--prompt-file <path>',
      'File whose contents become the `prompt` field',
    )
    .option('--tags <csv>', 'Comma-separated tags (overrides manifest)')
    .option('--category <name>', 'Category (overrides manifest)')
    .option('--free', 'Publish as free (sets is_free=true)')
    .option('--price-usd <usd>', 'Set USD price (implies is_free=false)')
    .action(
      async (opts: {
        manifest?: string;
        name?: string;
        description?: string;
        promptFile?: string;
        tags?: string;
        category?: string;
        free?: boolean;
        priceUsd?: string;
      }) => {
        try {
          let payload: Record<string, unknown> = {};

          if (opts.manifest) {
            payload = await loadManifest<Record<string, unknown>>(opts.manifest);
          }

          if (opts.name !== undefined) payload.name = opts.name;
          if (opts.description !== undefined)
            payload.description = opts.description;
          if (opts.tags !== undefined) payload.tags = opts.tags;
          if (opts.category !== undefined) payload.category = opts.category;
          if (opts.promptFile !== undefined) {
            const { readFileSync, existsSync } = await import('node:fs');
            if (!existsSync(opts.promptFile)) {
              throw new Error(`Prompt file not found: ${opts.promptFile}`);
            }
            payload.prompt = readFileSync(opts.promptFile, 'utf8');
          }
          if (opts.free !== undefined) payload.is_free = true;
          if (opts.priceUsd !== undefined) {
            const n = parseFloat(opts.priceUsd);
            if (!Number.isFinite(n) || n < 0) {
              throw new Error('--price-usd must be a non-negative number');
            }
            payload.is_free = false;
            payload.price_usd = n;
          }

          if (payload.useCases === undefined && payload.use_cases === undefined) {
            payload.useCases = [{ title: '', description: '' }];
          }

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
          if (typeof payload.prompt !== 'string' || !payload.prompt.trim()) {
            throw new Error('Missing --prompt-file or `prompt` in manifest.');
          }

          const spinner = ora({
            text: `Publishing prompt "${payload.name}"…`,
            color: 'red',
          }).start();
          try {
            const result = await post<AddPromptResponse>(
              '/api/add-prompt',
              payload,
            );
            spinner.stop();
            console.log('');
            console.log(ok('Prompt published.'));
            if (result.id) console.log(label('ID', result.id));
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
