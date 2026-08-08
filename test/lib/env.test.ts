import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { loadEnvFile, parseEnvFile, isFromEnvFile } from '../../src/lib/env.js';

function tmpDirWithEnv(content: string | null): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'swarms-env-vitest-'));
  if (content !== null) fs.writeFileSync(path.join(dir, '.env'), content);
  return dir;
}

describe('env auto-loader', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.SWARMS_API_KEY;
    delete process.env.SWARMS_NO_ANIM;
  });

  afterEach(() => {
    process.env = originalEnv;
    loadEnvFile(tmpDirWithEnv(null)); // reset module-level status
  });

  describe('parseEnvFile', () => {
    it('parses quoted and unquoted values', () => {
      const parsed = parseEnvFile('SWARMS_API_KEY="sk-abc"\nSWARMS_NO_ANIM=1');
      expect(parsed.SWARMS_API_KEY).toBe('sk-abc');
      expect(parsed.SWARMS_NO_ANIM).toBe('1');
    });

    it('ignores comments and blank lines', () => {
      const parsed = parseEnvFile('# comment\n\nSWARMS_API_KEY=sk-abc\n');
      expect(Object.keys(parsed)).toEqual(['SWARMS_API_KEY']);
    });

    it('accepts export-prefixed lines', () => {
      const parsed = parseEnvFile('export SWARMS_API_KEY=sk-abc');
      expect(parsed.SWARMS_API_KEY).toBe('sk-abc');
    });
  });

  describe('loadEnvFile', () => {
    it('loads allowlisted keys from ./.env', () => {
      const dir = tmpDirWithEnv('SWARMS_API_KEY="sk-file"\n');
      const status = loadEnvFile(dir);
      expect(process.env.SWARMS_API_KEY).toBe('sk-file');
      expect(status.loaded).toContain('SWARMS_API_KEY');
      expect(isFromEnvFile('SWARMS_API_KEY')).toBe(true);
    });

    it('lets shell environment win over the file', () => {
      process.env.SWARMS_API_KEY = 'sk-shell';
      const dir = tmpDirWithEnv('SWARMS_API_KEY="sk-file"\n');
      const status = loadEnvFile(dir);
      expect(process.env.SWARMS_API_KEY).toBe('sk-shell');
      expect(status.skipped).toContain('SWARMS_API_KEY');
    });

    it('never loads keys outside the allowlist', () => {
      const dir = tmpDirWithEnv('SOME_RANDOM_VAR=1\n');
      loadEnvFile(dir);
      expect(process.env.SOME_RANDOM_VAR).toBeUndefined();
    });

    it('is a no-op when .env is absent', () => {
      const dir = tmpDirWithEnv(null);
      const status = loadEnvFile(dir);
      expect(status.path).toBeNull();
      expect(status.loaded).toEqual([]);
    });
  });
});
