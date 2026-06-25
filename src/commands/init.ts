import { Command } from 'commander';
import { writeFileSync, existsSync } from 'node:fs';
import { prompt } from '../lib/prompt.js';
import { ok, fail, label, info } from '../lib/theme.js';

interface InitOptions {
  force?: boolean;
}

function writeIfNotExists(path: string, data: string, force: boolean) {
  if (existsSync(path) && !force) {
    throw new Error(`File ${path} exists. Use --force to overwrite.`);
  }
  writeFileSync(path, data, 'utf8');
}

export function registerInit(program: Command): void {
  program
    .command('init')
    .description('Bootstrap a marketplace manifest in the current directory')
    .option('--force', 'Overwrite existing manifest files')
    .action(async (opts: InitOptions) => {
      try {
        const type = await prompt('Manifest type (agent|prompt|token)');
        const name = await prompt('Name');
        const description = await prompt('Description');

        // No ticker prompt; user will provide via launch command


        const manifestObj: Record<string, unknown> = {
          name,
          description,
          tags: [],
          requirements: [],
          price_usd: 0,
          links: { website: "", github: "" },
        };
        const json = JSON.stringify(manifestObj, null, 2) + "\n";
        let filename = '';
        if (type === 'agent') filename = 'agent.json';
        else if (type === 'prompt') filename = 'prompt.json';
        else if (type === 'token') filename = 'token.json';
        else throw new Error('Invalid type, must be agent, prompt, or token');
        writeIfNotExists(filename, json, !!opts.force);
        console.log(ok('Manifest created:'));
        console.log(label('File', filename));
        console.log(info(`Next: swarms launch ${type} --manifest ${filename} ${type === 'token' ? '--ticker <TICKER>' : ''}`));
      } catch (err) {
        console.log(fail(err instanceof Error ? err.message : String(err)));
        process.exitCode = 1;
      }
    });
}
