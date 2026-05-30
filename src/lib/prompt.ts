import readline from 'node:readline';
import { theme } from './theme.js';

/**
 * Minimal stdin prompt utilities. Avoids inquirer/prompts deps.
 * `promptSecret` masks input by suppressing terminal echo while still
 * tracking keystrokes for backspace.
 */

export async function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true,
  });
  return new Promise((resolve) => {
    rl.question(`  ${theme.brand('?')} ${theme.text(question)} `, (ans) => {
      rl.close();
      resolve(ans.trim());
    });
  });
}

export async function promptSecret(question: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const stdin = process.stdin;
    const stdout = process.stdout;
    const wasRaw = stdin.isRaw;
    if (!stdin.isTTY) {
      // Non-TTY (piped). Read a line normally.
      let buf = '';
      stdin.setEncoding('utf8');
      stdin.on('data', (chunk) => (buf += chunk));
      stdin.on('end', () => resolve(buf.replace(/\r?\n$/, '')));
      stdin.on('error', reject);
      return;
    }
    stdout.write(`  ${theme.brand('?')} ${theme.text(question)} `);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');

    let value = '';
    const onData = (raw: string) => {
      for (const ch of raw) {
        const code = ch.charCodeAt(0);
        if (code === 3) {
          // Ctrl-C
          stdin.setRawMode(wasRaw);
          stdin.pause();
          stdin.removeListener('data', onData);
          stdout.write('\n');
          reject(new Error('Aborted'));
          return;
        }
        if (code === 13 || code === 10) {
          // Enter
          stdin.setRawMode(wasRaw);
          stdin.pause();
          stdin.removeListener('data', onData);
          stdout.write('\n');
          resolve(value);
          return;
        }
        if (code === 127 || code === 8) {
          // Backspace
          if (value.length > 0) {
            value = value.slice(0, -1);
            stdout.write('\b \b');
          }
          continue;
        }
        if (code < 32) continue; // ignore other control chars
        value += ch;
        stdout.write('•');
      }
    };
    stdin.on('data', onData);
  });
}
