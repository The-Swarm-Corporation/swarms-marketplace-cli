import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

describe('bin/swarms.js', () => {
  const binPath = join(process.cwd(), 'bin', 'swarms.js');

  describe('--version flag', () => {
    it('should print version and exit 0', () => {
      const result = spawnSync('node', [binPath, '--version'], {
        encoding: 'utf8',
        timeout: 5000,
      });

      expect(result.status).toBe(0);
      expect(result.stdout).toMatch(/\d+\.\d+\.\d+/);
    });
  });

  describe('--help flag', () => {
    it('should print help text and exit 0', () => {
      const result = spawnSync('node', [binPath, '--help'], {
        encoding: 'utf8',
        timeout: 5000,
      });

      expect(result.status).toBe(0);
      expect(result.stdout).toContain('swarms');
      expect(result.stdout).toContain('Usage');
    });
  });

  describe('invalid command', () => {
    it('should exit non-zero with error message', () => {
      const result = spawnSync('node', [binPath, 'nonexistent-command'], {
        encoding: 'utf8',
        timeout: 5000,
      });

      expect(result.status).not.toBe(0);
      expect(result.stderr || result.stdout).toContain('unknown command');
    });
  });

  describe('missing required option', () => {
    it('should exit 1 when claim is missing --ca', () => {
      const result = spawnSync('node', [binPath, 'claim'], {
        encoding: 'utf8',
        timeout: 5000,
      });

      expect(result.status).toBe(1);
      expect(result.stderr).toContain('--ca');
    });
  });
});
