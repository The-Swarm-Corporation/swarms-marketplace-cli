import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { loadManifest } from '../../src/lib/manifest.js';
import fs from 'node:fs';

vi.mock('node:fs');

describe('loadManifest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('file path', () => {
    it('should load valid JSON from file', async () => {
      const manifest = { name: 'Test Agent', description: 'Test' };
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(manifest));

      const result = await loadManifest('/path/to/manifest.json');
      
      expect(result).toEqual(manifest);
      expect(fs.existsSync).toHaveBeenCalledWith('/path/to/manifest.json');
      expect(fs.readFileSync).toHaveBeenCalledWith('/path/to/manifest.json', 'utf8');
    });

    it('should throw error when file does not exist', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      await expect(loadManifest('/missing/file.json')).rejects.toThrow(
        'Manifest file not found: /missing/file.json'
      );
    });

    it('should throw error on invalid JSON in file', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue('{ invalid json }');

      await expect(loadManifest('/path/to/bad.json')).rejects.toThrow(
        /Manifest is not valid JSON.*bad\.json/
      );
    });

    it('should include parse error details in error message', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue('{ "unclosed": ');

      await expect(loadManifest('/path/to/broken.json')).rejects.toThrow(
        /Manifest is not valid JSON.*broken\.json/
      );
    });
  });

  describe('stdin (-)', () => {
    it('should load valid JSON from stdin via integration test', async () => {
      const { spawnSync } = await import('node:child_process');
      const { join } = await import('node:path');
      
      const manifest = { name: 'Stdin Agent', description: 'Test from stdin' };
      const binPath = join(process.cwd(), 'bin', 'swarms.js');
      
      // Use launch agent with -m - to test stdin manifest loading
      const result = spawnSync('node', [binPath, 'launch', 'agent', '-m', '-'], {
        input: JSON.stringify(manifest),
        encoding: 'utf8',
        timeout: 5000,
        env: { ...process.env, SWARMS_API_KEY: 'test-key' },
      });

      // Should fail with API error (no real server), but proves stdin was parsed
      // If stdin parsing failed, we'd see "Manifest is not valid JSON"
      expect(result.status).toBe(1);
      expect(result.stdout + result.stderr).not.toContain('Manifest is not valid JSON');
      expect(result.stdout + result.stderr).not.toContain('Manifest file not found');
    });

    it('should error on invalid JSON from stdin', async () => {
      const { spawnSync } = await import('node:child_process');
      const { join } = await import('node:path');
      
      const binPath = join(process.cwd(), 'bin', 'swarms.js');
      
      const result = spawnSync('node', [binPath, 'launch', 'agent', '-m', '-'], {
        input: '{ invalid json }',
        encoding: 'utf8',
        timeout: 5000,
        env: { ...process.env, SWARMS_API_KEY: 'test-key' },
      });

      expect(result.status).toBe(1);
      expect(result.stdout + result.stderr).toContain('Manifest is not valid JSON');
      expect(result.stdout + result.stderr).toContain('stdin');
    });

    it('should error on empty stdin', async () => {
      const { spawnSync } = await import('node:child_process');
      const { join } = await import('node:path');
      
      const binPath = join(process.cwd(), 'bin', 'swarms.js');
      
      const result = spawnSync('node', [binPath, 'launch', 'agent', '-m', '-'], {
        input: '',
        encoding: 'utf8',
        timeout: 5000,
        env: { ...process.env, SWARMS_API_KEY: 'test-key' },
      });

      expect(result.status).toBe(1);
      expect(result.stdout + result.stderr).toContain('Manifest is not valid JSON');
    });
  });

  describe('type safety', () => {
    it('should return typed manifest', async () => {
      interface TestManifest {
        name: string;
        count: number;
      }
      
      const manifest: TestManifest = { name: 'Test', count: 42 };
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(manifest));

      const result = await loadManifest<TestManifest>('/test.json');
      
      expect(result.name).toBe('Test');
      expect(result.count).toBe(42);
    });
  });
});
