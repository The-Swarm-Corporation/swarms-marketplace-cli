import { Command } from 'commander';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import ora from 'ora';
import { prompt } from '../lib/prompt.js';
import { fail, info, label, ok, theme } from '../lib/theme.js';

const require = createRequire(import.meta.url);
const pkg = require('../../package.json') as { name: string; version: string };

const REGISTRY = 'https://registry.npmjs.org';

type Pm = 'npm' | 'pnpm' | 'yarn' | 'bun';

function detectPackageManager(): Pm {
  const bin = process.argv[1] ?? '';
  const ua = process.env.npm_config_user_agent ?? '';
  if (ua.startsWith('pnpm') || /[\\/]pnpm[\\/]/.test(bin)) return 'pnpm';
  if (ua.startsWith('bun') || /[\\/]\.bun[\\/]/.test(bin)) return 'bun';
  if (ua.startsWith('yarn') || /[\\/]yarn[\\/]/.test(bin)) return 'yarn';
  return 'npm';
}

function installCommand(pm: Pm, spec: string): { cmd: string; args: string[] } {
  switch (pm) {
    case 'pnpm':
      return { cmd: 'pnpm', args: ['add', '-g', spec] };
    case 'yarn':
      return { cmd: 'yarn', args: ['global', 'add', spec] };
    case 'bun':
      return { cmd: 'bun', args: ['add', '-g', spec] };
    case 'npm':
    default:
      return { cmd: 'npm', args: ['install', '-g', spec] };
  }
}

function parseVersion(v: string): number[] {
  return v
    .replace(/^v/, '')
    .split('-')[0]
    .split('.')
    .map((n) => Number(n) || 0);
}

function compareVersions(a: string, b: string): number {
  const pa = parseVersion(a);
  const pb = parseVersion(b);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff > 0 ? 1 : -1;
  }
  return 0;
}

async function fetchLatestVersion(name: string): Promise<string> {
  const url = `${REGISTRY}/${encodeURIComponent(name)}/latest`;
  const res = await fetch(url, {
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    throw new Error(`npm registry responded ${res.status} ${res.statusText}`);
  }
  const body = (await res.json()) as { version?: string };
  if (!body.version) throw new Error('npm registry returned no version field');
  return body.version;
}

function runInstall(cmd: string, args: string[]): Promise<number> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: 'inherit', shell: false });
    child.on('error', reject);
    child.on('exit', (code) => resolve(code ?? 1));
  });
}

interface UpgradeOpts {
  check?: boolean;
  yes?: boolean;
  dryRun?: boolean;
  via?: string;
}

export function registerUpgrade(program: Command): void {
  program
    .command('upgrade')
    .alias('update')
    .description('Check npm for a newer release and upgrade the CLI in place.')
    .option('--check', 'Only check; exit 1 if outdated. No prompt, no install.')
    .option('-y, --yes', 'Skip the confirmation prompt and install immediately.')
    .option('--dry-run', 'Print the install command without running it.')
    .option(
      '--via <pm>',
      'Package manager to use: npm | pnpm | yarn | bun. Default: auto-detect.',
    )
    .action(async (opts: UpgradeOpts) => {
      const current = pkg.version;
      const name = pkg.name;

      console.log('');
      console.log(label('Package', name));
      console.log(label('Installed', `v${current}`));

      const spinner = ora({
        text: 'Checking npm for the latest version…',
        stream: process.stderr,
      }).start();

      let latest: string;
      try {
        latest = await fetchLatestVersion(name);
        spinner.stop();
      } catch (err) {
        spinner.stop();
        const msg = err instanceof Error ? err.message : String(err);
        console.log(fail(`Could not reach npm registry: ${msg}`));
        process.exitCode = 1;
        return;
      }

      console.log(label('Latest', `v${latest}`));
      console.log('');

      const cmp = compareVersions(current, latest);
      if (cmp >= 0) {
        console.log(ok(`Already on the latest version.`));
        return;
      }

      console.log(
        info(
          `Update available: ${theme.bold('v' + current)} ${theme.dim('→')} ${theme.bold('v' + latest)}`,
        ),
      );

      if (opts.check) {
        process.exitCode = 1;
        return;
      }

      let pm: Pm;
      if (opts.via) {
        const v = opts.via.toLowerCase();
        if (v !== 'npm' && v !== 'pnpm' && v !== 'yarn' && v !== 'bun') {
          console.log(fail(`Unknown --via value "${opts.via}". Use npm | pnpm | yarn | bun.`));
          process.exitCode = 1;
          return;
        }
        pm = v;
      } else {
        pm = detectPackageManager();
      }

      const { cmd, args } = installCommand(pm, `${name}@latest`);
      const printable = `${cmd} ${args.join(' ')}`;
      console.log(label('Command', printable));

      if (opts.dryRun) {
        console.log('');
        console.log(info('Dry run — not executing.'));
        return;
      }

      if (!opts.yes && process.stdout.isTTY && !process.env.CI) {
        console.log('');
        const answer = await prompt(`Run ${theme.bold(printable)}? [y/N]`);
        if (!/^y(es)?$/i.test(answer)) {
          console.log(info('Cancelled.'));
          return;
        }
      }

      console.log('');
      let code: number;
      try {
        code = await runInstall(cmd, args);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.log(fail(`Failed to launch ${cmd}: ${msg}`));
        console.log(
          info(
            `Run the upgrade manually: ${theme.bold(printable)}`,
          ),
        );
        process.exitCode = 1;
        return;
      }

      console.log('');
      if (code === 0) {
        console.log(ok(`Upgraded ${name} to v${latest}.`));
      } else {
        console.log(fail(`${cmd} exited with code ${code}.`));
        process.exitCode = code;
      }
    });
}
