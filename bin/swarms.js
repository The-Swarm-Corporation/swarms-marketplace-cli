#!/usr/bin/env node
const [major] = process.versions.node.split('.').map(Number);
if (major < 18) {
  console.error(
    `swarms: requires Node.js >= 18 (you have ${process.versions.node}).`,
  );
  process.exit(1);
}

import('../dist/index.js').catch((err) => {
  console.error('swarms: failed to start.');
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
});
