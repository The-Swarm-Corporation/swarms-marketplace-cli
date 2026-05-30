import { Command, Help } from 'commander';
import { animatedBanner, banner, footer, theme } from './lib/theme.js';
import { registerLogin } from './commands/login.js';
import { registerWhoami } from './commands/whoami.js';
import { registerApiKey } from './commands/api-key.js';
import { registerLaunchAgent } from './commands/launch-agent.js';
import { registerLaunchPrompt } from './commands/launch-prompt.js';
import { registerLaunchToken } from './commands/launch-token.js';
import { registerList } from './commands/list.js';
import { registerListTokenized } from './commands/list-tokenized.js';
import { registerOpen } from './commands/open.js';
import { registerClaim } from './commands/claim.js';
import { registerClaimAll } from './commands/claim-all.js';

import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const pkg = require('../package.json') as { version: string };

/**
 * Custom commander help renderer. We hand-render the help body to match
 * the Claude-Code-style card from `theme.ts` — two-space indent, brand
 * markers on section titles, muted descriptions.
 */
class SwarmsHelp extends Help {
  override formatHelp(cmd: Command, helper: Help): string {
    const termWidth = helper.padWidth(cmd, helper);
    const itemSep = '\n';
    const out: string[] = [];

    const usage = `${cmd.name()}${cmd.usage() ? ' ' + cmd.usage() : ''}`;
    out.push(`  ${theme.brand('▎')} ${theme.bold('Usage')}`);
    out.push(`     ${theme.text(usage)}`);
    out.push('');

    const desc = helper.commandDescription(cmd);
    if (desc) {
      out.push(`     ${theme.textMuted(desc)}`);
      out.push('');
    }

    const args = helper.visibleArguments(cmd);
    if (args.length) {
      out.push(`  ${theme.brand('▎')} ${theme.bold('Arguments')}`);
      for (const a of args) {
        const term = helper.argumentTerm(a).padEnd(termWidth);
        const description = helper.argumentDescription(a);
        out.push(`     ${theme.brandSoft(term)}  ${theme.textMuted(description)}`);
      }
      out.push('');
    }

    const subcommands = helper.visibleCommands(cmd);
    if (subcommands.length) {
      out.push(`  ${theme.brand('▎')} ${theme.bold('Commands')}`);
      for (const sub of subcommands) {
        const term = helper.subcommandTerm(sub).padEnd(termWidth);
        const description = helper.subcommandDescription(sub);
        out.push(`     ${theme.bold(term)}  ${theme.textMuted(description)}`);
      }
      out.push('');
    }

    const options = helper.visibleOptions(cmd);
    if (options.length) {
      out.push(`  ${theme.brand('▎')} ${theme.bold('Options')}`);
      for (const opt of options) {
        const term = helper.optionTerm(opt).padEnd(termWidth);
        const description = helper.optionDescription(opt);
        out.push(`     ${theme.text(term)}  ${theme.textMuted(description)}`);
      }
      out.push('');
    }

    return out.join(itemSep) + '\n';
  }
}

const program = new Command();

program
  .name('swarms')
  .description(
    'Swarms Marketplace CLI — launch agents, prompts, tokens, and claim trading fees.',
  )
  .version(pkg.version, '-v, --version', 'Print the CLI version.')
  .addHelpText('beforeAll', banner())
  .addHelpText('afterAll', footer())
  .showHelpAfterError(
    `\n  ${theme.dim('?')} ${theme.textMuted('run')} ${theme.text(
      'swarms <command> --help',
    )} ${theme.textMuted('for usage')}\n`,
  );

// Install our custom help renderer on the root command and propagate
// to every sub-command so they all get the brand styling.
function attachHelp(cmd: Command): void {
  (cmd as Command & { createHelp: () => Help }).createHelp = () =>
    new SwarmsHelp();
  for (const sub of cmd.commands) attachHelp(sub);
}

registerApiKey(program);
registerLogin(program);
registerWhoami(program);

const launch = program
  .command('launch')
  .description('Publish products: launch agent | prompt | token.');
registerLaunchAgent(launch);
registerLaunchPrompt(launch);
registerLaunchToken(launch);

registerList(program);
registerListTokenized(program);
registerOpen(program);
registerClaim(program);
registerClaimAll(program);

attachHelp(program);

async function main(): Promise<void> {
  if (process.argv.length <= 2) {
    // Welcome path: animate the mascot, then print the help body manually so we
    // don't double-print the banner that `addHelpText('beforeAll')` would emit.
    await animatedBanner();
    const help = new SwarmsHelp();
    process.stdout.write(help.formatHelp(program, help));
    process.stdout.write(footer());
    return;
  }
  await program.parseAsync(process.argv);
}

main().catch((err) => {
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
});
