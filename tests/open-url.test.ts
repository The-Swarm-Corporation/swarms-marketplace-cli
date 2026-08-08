/**
 * Safety tests for the browser launcher. Only rejection paths are exercised —
 * a passing URL would spawn the OS launcher and open a real browser, so the
 * positive path is covered indirectly by the `open` command tests (--print).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openInBrowser } from '../src/lib/open.js';

const UNSAFE_URLS: Array<[string, string]> = [
  ['javascript:alert(1)', 'javascript: scheme'],
  ['data:text/html,<script>alert(1)</script>', 'data: scheme'],
  ['file:///etc/passwd', 'file: scheme'],
  ['ftp://example.com/x', 'ftp: scheme'],
  ['not a url at all', 'unparseable string'],
  ['https://swarms.world/x"y', 'double quote'],
  ["https://swarms.world/x'y", 'single quote'],
  ['https://swarms.world/x`y', 'backtick'],
  ['https://swarms.world/x;rm%20-rf|z', 'pipe shell-meta'],
  ['https://swarms.world/x&y=$(id)', 'ampersand and dollar'],
  ['https://swarms.world/x<y>', 'angle brackets'],
];

for (const [url, why] of UNSAFE_URLS) {
  test(`openInBrowser refuses to launch: ${why}`, () => {
    assert.equal(openInBrowser(url), false);
  });
}
