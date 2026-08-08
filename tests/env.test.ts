import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { getEnvFileStatus, isFromEnvFile, loadEnvFile, parseEnvFile } from '../src/lib/env.js';
import { withEnv } from './helpers.js';

function tmpDirWithEnv(content: string | null): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'swarms-env-test-'));
  if (content !== null) fs.writeFileSync(path.join(dir, '.env'), content);
  return dir;
}

test('parseEnvFile handles quotes, export prefix, comments, and CRLF', () => {
  const parsed = parseEnvFile(
    [
      '# a comment',
      'SWARMS_API_KEY="sk-quoted"',
      "PRIVATE_KEY='single-quoted'",
      'export SWARMS_NO_ANIM=1',
      'NO_COLOR=yes # trailing comment',
      '',
      'not a valid line',
      '=nokey',
      '1BAD=starts-with-digit ok actually invalid name? no: valid chars but starts with digit',
    ].join('\r\n'),
  );
  assert.equal(parsed['SWARMS_API_KEY'], 'sk-quoted');
  assert.equal(parsed['PRIVATE_KEY'], 'single-quoted');
  assert.equal(parsed['SWARMS_NO_ANIM'], '1');
  assert.equal(parsed['NO_COLOR'], 'yes');
  assert.ok(!('1BAD' in parsed), 'keys starting with a digit are rejected');
  assert.ok(!('' in parsed));
});

test('parseEnvFile keeps # inside quoted values', () => {
  const parsed = parseEnvFile('SWARMS_API_KEY="sk-with#hash"');
  assert.equal(parsed['SWARMS_API_KEY'], 'sk-with#hash');
});

test('loadEnvFile loads allowlisted keys into process.env', () => {
  const restore = withEnv({ SWARMS_API_KEY: undefined, SWARMS_NO_ANIM: undefined });
  const dir = tmpDirWithEnv('SWARMS_API_KEY="sk-from-file"\nSWARMS_NO_ANIM=1\n');
  try {
    const status = loadEnvFile(dir);
    assert.equal(process.env.SWARMS_API_KEY, 'sk-from-file');
    assert.equal(process.env.SWARMS_NO_ANIM, '1');
    assert.deepEqual(status.loaded.sort(), ['SWARMS_API_KEY', 'SWARMS_NO_ANIM']);
    assert.equal(status.path, path.join(dir, '.env'));
    assert.equal(isFromEnvFile('SWARMS_API_KEY'), true);
    assert.equal(getEnvFileStatus().loaded.length, 2);
  } finally {
    restore();
    loadEnvFile(tmpDirWithEnv(null)); // reset module status
  }
});

test('loadEnvFile never overrides values already set in the shell', () => {
  const restore = withEnv({ SWARMS_API_KEY: 'sk-from-shell' });
  const dir = tmpDirWithEnv('SWARMS_API_KEY="sk-from-file"\n');
  try {
    const status = loadEnvFile(dir);
    assert.equal(process.env.SWARMS_API_KEY, 'sk-from-shell');
    assert.deepEqual(status.loaded, []);
    assert.deepEqual(status.skipped, ['SWARMS_API_KEY']);
    assert.equal(isFromEnvFile('SWARMS_API_KEY'), false);
  } finally {
    restore();
    loadEnvFile(tmpDirWithEnv(null));
  }
});

test('loadEnvFile ignores keys outside the allowlist', () => {
  const restore = withEnv({});
  const dir = tmpDirWithEnv('EVIL_VAR=1\nPATH=/tmp/hijack\nSWARMS_API_BASE_URL=https://evil.example\n');
  const beforePath = process.env.PATH;
  try {
    const status = loadEnvFile(dir);
    assert.equal(process.env.EVIL_VAR, undefined);
    assert.equal(process.env.PATH, beforePath, 'PATH must never be touched');
    assert.equal(process.env.SWARMS_API_BASE_URL, undefined);
    assert.deepEqual(status.loaded, []);
  } finally {
    restore();
    loadEnvFile(tmpDirWithEnv(null));
  }
});

test('loadEnvFile is a no-op without a .env file', () => {
  const restore = withEnv({ SWARMS_API_KEY: undefined });
  const dir = tmpDirWithEnv(null);
  try {
    const status = loadEnvFile(dir);
    assert.equal(status.path, null);
    assert.deepEqual(status.loaded, []);
    assert.equal(process.env.SWARMS_API_KEY, undefined);
  } finally {
    restore();
  }
});

test('loadEnvFile skips empty values in the file', () => {
  const restore = withEnv({ SWARMS_API_KEY: undefined });
  const dir = tmpDirWithEnv('SWARMS_API_KEY=""\n');
  try {
    const status = loadEnvFile(dir);
    assert.equal(process.env.SWARMS_API_KEY, undefined);
    assert.deepEqual(status.loaded, []);
  } finally {
    restore();
    loadEnvFile(tmpDirWithEnv(null));
  }
});
