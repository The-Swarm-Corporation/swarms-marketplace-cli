import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { loadManifest } from '../src/lib/manifest.js';

function tmpFile(name: string, content: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'swarms-cli-test-'));
  const p = path.join(dir, name);
  fs.writeFileSync(p, content);
  return p;
}

test('loadManifest parses a valid JSON file', async () => {
  const p = tmpFile('agent.json', JSON.stringify({ name: 'Test', tags: 'a,b' }));
  const manifest = await loadManifest<{ name: string; tags: string }>(p);
  assert.equal(manifest.name, 'Test');
  assert.equal(manifest.tags, 'a,b');
});

test('loadManifest throws a clear error for a missing file', async () => {
  await assert.rejects(
    () => loadManifest('/nonexistent/path/agent.json'),
    /Manifest file not found: \/nonexistent\/path\/agent\.json/,
  );
});

test('loadManifest throws a clear error for invalid JSON, naming the file', async () => {
  const p = tmpFile('bad.json', '{ not json ');
  await assert.rejects(
    () => loadManifest(p),
    (err: unknown) => {
      assert.ok(err instanceof Error);
      assert.match(err.message, /Manifest is not valid JSON/);
      assert.ok(err.message.includes(p));
      return true;
    },
  );
});
