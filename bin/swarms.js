#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const [major] = process.versions.node.split('.').map(Number);
if (major < 18) {
  console.error(
    `swarms: requires Node.js >= 18 (you have ${process.versions.node}).`,
  );
  process.exit(1);
}

const here = dirname(fileURLToPath(import.meta.url));
const srcEntry = join(here, '..', 'src', 'index.ts');
const distEntry = join(here, '..', 'dist', 'index.js');

try {
  if (existsSync(srcEntry)) {
    const { register } = await import('tsx/esm/api');
    register();
    await import(srcEntry);
  } else {
    await import(distEntry);
  }
} catch (err) {
  console.error('swarms: failed to start.');
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
}
