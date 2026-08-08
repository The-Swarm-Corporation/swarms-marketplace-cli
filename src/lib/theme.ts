import chalk from 'chalk';
import { createRequire } from 'node:module';
import { getApiKey, getBaseUrl } from './config.js';

const require = createRequire(import.meta.url);
const pkg = require('../../package.json') as { version: string };

/**
 * Swarms palette: brand red, white, dim gray. Three colors, used with intent.
 *  - `brand` for the product name, mascot, accents
 *  - `text`  for normal prose
 *  - `dim`   for metadata, hints, separators
 *  - `error` for failures (same red, always bold)
 */
export const theme = {
  brand: chalk.hex('#FF2D2D').bold,
  brandSoft: chalk.hex('#FF6B6B'),
  text: chalk.hex('#F5F5F5'),
  textMuted: chalk.hex('#8B8B8B'),
  dim: chalk.hex('#5A5A5A'),
  bold: chalk.bold.hex('#F5F5F5'),
  error: chalk.hex('#FF2D2D').bold,
  warn: chalk.hex('#FFB347'),
  chip: chalk.bgHex('#FF2D2D').hex('#0A0A0A').bold,
};

function mask(key: string): string {
  if (key.length <= 8) return '••••';
  return `${key.slice(0, 4)}…${key.slice(-4)}`;
}

const TIPS: string[] = [
  `Get an API key with ${theme.bold('swarms api-key')}, then ${theme.bold('export SWARMS_API_KEY="…"')}`,
  `Try ${theme.bold('swarms claim-all --dry-run')} to preview what would be claimed`,
  `Set ${theme.bold('$PRIVATE_KEY')} to skip the wallet prompt on ${theme.bold('claim')} / ${theme.bold('launch token')}`,
  `${theme.bold('swarms tree')} renders every tokenized product as a red/white tree`,
  `Pipe a manifest via stdin: ${theme.bold('cat agent.json | swarms launch agent -m -')}`,
  `Inspect your account quickly with ${theme.bold('swarms whoami')}`,
];

function pickTip(): string {
  return TIPS[Math.floor(Math.random() * TIPS.length)];
}

/**
 * Big ASCII space invader, two frames, rendered with half-block characters.
 * Each terminal line packs two pixel rows so the alien stays squat & wide
 * (which is how a real Space Invader looks). Frame A has legs spread,
 * Frame B has legs together — alternating gives a marching gait.
 *
 * Mascot footprint: 5 lines tall × 14 cells wide (incl. side padding).
 */
const FRAME_A: string[] = [
  '   ▄▄    ▄▄   ',
  '  ██████████  ',
  ' ██▀██▄▄██▀██ ',
  ' █▀█▀▀██▀▀█▀█ ',
  ' ▀          ▀ ',
];

const FRAME_B: string[] = [
  '   ▄▄    ▄▄   ',
  '  ██████████  ',
  ' ██▀██▄▄██▀██ ',
  ' █▀█▀▀██▀▀█▀█ ',
  '  ▀▀      ▀▀  ',
];

export const MASCOT_HEIGHT = FRAME_A.length;

/**
 * Returns the mascot painted in brand red, padded to a consistent width.
 * `frame` selects which leg position to render. The body is solid red;
 * the eyes/face (the inverted "▀" pixels) get the lighter brand tint so
 * the silhouette reads at a glance.
 */
function renderMascot(frame: 'A' | 'B'): string[] {
  const rows = frame === 'A' ? FRAME_A : FRAME_B;
  return rows.map((row) => theme.brand(row));
}

/**
 * The right-hand metadata column — title, tagline, host, key status, hint.
 * Five lines so it lines up with MASCOT_HEIGHT.
 */
function metadataColumn(): string[] {
  const key = getApiKey();
  const keyState = key
    ? `${theme.textMuted('KEY')} ${theme.text(mask(key))}`
    : `${theme.textMuted('KEY')} ${theme.warn('not set')}  ${theme.dim('· run `swarms api-key`')}`;

  return [
    '',
    `${theme.bold('Swarms Marketplace')}  ${theme.dim('v' + pkg.version)}`,
    `${theme.text('Launch agents, prompts, tokens. Claim fees.')}`,
    `${theme.textMuted('API')} ${theme.text(getBaseUrl())}  ${theme.dim('·')}  ${keyState}`,
    `${theme.dim('?')} ${theme.textMuted('swarms <command> --help')}`,
  ];
}

/** Render the full card (mascot beside metadata) for a given frame. */
function renderCard(frame: 'A' | 'B'): string[] {
  const left = renderMascot(frame);
  const right = metadataColumn();
  const gap = '   ';
  const lines: string[] = [];
  for (let i = 0; i < MASCOT_HEIGHT; i++) {
    lines.push(`  ${left[i]}${gap}${right[i] ?? ''}`);
  }
  return lines;
}

/**
 * The Tip line that sits above the card.
 */
function tipLine(): string {
  return `  ${theme.brand('▎')} ${theme.warn('Tip:')} ${theme.text(pickTip())}`;
}

/**
 * Static banner used in --help output (no animation; help may be piped).
 */
export function banner(): string {
  return ['', tipLine(), '', ...renderCard('A'), ''].join('\n');
}

export function divider(): string {
  return `  ${theme.dim('─'.repeat(58))}`;
}

export function label(key: string, value: string): string {
  return `  ${theme.textMuted(key.padEnd(16))}${theme.text(value)}`;
}

export function bullet(msg: string): string {
  return `  ${theme.brand('›')} ${theme.text(msg)}`;
}

export function ok(msg: string): string {
  return `  ${theme.brand('✓')} ${theme.text(msg)}`;
}

export function fail(msg: string): string {
  return `  ${theme.error('✗')} ${theme.text(msg)}`;
}

export function info(msg: string): string {
  return `  ${theme.brandSoft('›')} ${theme.text(msg)}`;
}

export function section(title: string, sub?: string): string {
  const head = `  ${theme.brand('▎')} ${theme.bold(title)}`;
  if (!sub) return head;
  return `${head}  ${theme.dim(sub)}`;
}

export function footer(): string {
  return [
    '',
    `  ${theme.dim('?')} ${theme.textMuted('swarms <command> --help')}  ${theme.dim('·')}  ${theme.textMuted('docs')} ${theme.text('https://docs.swarms.ai/docs/marketplace')}`,
    '',
  ].join('\n');
}

const ESC = '\x1b[';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Print the banner with a brief marching-legs animation. Used only on the
 * no-args welcome screen — `--help` always uses the static banner so its
 * output remains pipe-safe and snapshot-stable.
 *
 * Animation:
 *   1. Print the tip line, a blank line, then Frame A of the card.
 *   2. For ~6 cycles, move the cursor up by MASCOT_HEIGHT rows and reprint
 *      the card with the alternate frame, sleeping ~170ms between frames.
 *   3. End on Frame A so the static look matches `banner()`.
 *
 * Set $SWARMS_NO_ANIM=1 (or pipe stdout) to skip the animation entirely.
 */
export async function animatedBanner(): Promise<void> {
  const out = process.stdout;
  const animEnabled =
    out.isTTY === true &&
    !process.env.SWARMS_NO_ANIM &&
    !process.env.CI &&
    process.env.TERM !== 'dumb';

  out.write('\n' + tipLine() + '\n\n');

  // Initial paint — Frame A.
  let lines = renderCard('A');
  out.write(lines.join('\n') + '\n');

  if (!animEnabled) {
    out.write('\n');
    return;
  }

  // Hide cursor during the wiggle, restore on exit.
  out.write(ESC + '?25l');
  const restore = () => out.write(ESC + '?25h');
  process.once('exit', restore);
  process.once('SIGINT', () => {
    restore();
    process.exit(130);
  });

  const FRAMES: Array<'A' | 'B'> = ['B', 'A', 'B', 'A', 'B', 'A'];
  for (const frame of FRAMES) {
    await sleep(170);
    // Move cursor up MASCOT_HEIGHT rows to the first mascot line.
    out.write(`${ESC}${MASCOT_HEIGHT}A`);
    // Clear and redraw each line.
    lines = renderCard(frame);
    for (const line of lines) {
      out.write(`${ESC}2K${line}\n`);
    }
  }

  restore();
  out.write('\n');
}
