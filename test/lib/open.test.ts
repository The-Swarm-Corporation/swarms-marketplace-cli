import { describe, it, expect, vi } from 'vitest';

// Mock child_process to prevent actual browser launches
vi.mock('node:child_process', () => ({
  spawn: vi.fn(() => ({
    on: vi.fn(),
    unref: vi.fn(),
  })),
}));

import { openInBrowser } from '../../src/lib/open.js';

describe('openInBrowser', () => {

  describe('isSafeBrowserUrl validation', () => {
    it('should accept http:// URLs', () => {
      const result = openInBrowser('http://swarms.world/agent/123');
      expect(result).toBe(true);
    });

    it('should accept https:// URLs', () => {
      const result = openInBrowser('https://swarms.world/agent/123');
      expect(result).toBe(true);
    });

    it('should reject javascript: URLs', () => {
      const result = openInBrowser('javascript:alert(1)');
      expect(result).toBe(false);
    });

    it('should reject data: URLs', () => {
      const result = openInBrowser('data:text/html,<script>alert(1)</script>');
      expect(result).toBe(false);
    });

    it('should reject file: URLs', () => {
      const result = openInBrowser('file:///etc/passwd');
      expect(result).toBe(false);
    });

    it('should reject URLs with control characters', () => {
      expect(openInBrowser('https://swarms.world/\x00')).toBe(false);
      expect(openInBrowser('https://swarms.world/\r\n')).toBe(false);
      expect(openInBrowser('https://swarms.world/\x1f')).toBe(false);
    });

    it('should reject URLs with shell metacharacters', () => {
      expect(openInBrowser('https://swarms.world/test"')).toBe(false);
      expect(openInBrowser("https://swarms.world/test'")).toBe(false);
      expect(openInBrowser('https://swarms.world/test`')).toBe(false);
      expect(openInBrowser('https://swarms.world/test$')).toBe(false);
      expect(openInBrowser('https://swarms.world/test|')).toBe(false);
      expect(openInBrowser('https://swarms.world/test&')).toBe(false);
      expect(openInBrowser('https://swarms.world/test;')).toBe(false);
      expect(openInBrowser('https://swarms.world/test<')).toBe(false);
      expect(openInBrowser('https://swarms.world/test>')).toBe(false);
      expect(openInBrowser('https://swarms.world/test^')).toBe(false);
    });

    it('should reject malformed URLs', () => {
      expect(openInBrowser('not a url')).toBe(false);
      expect(openInBrowser('://missing-scheme')).toBe(false);
      expect(openInBrowser('')).toBe(false);
    });

    it('should reject URLs with & (shell metacharacter)', () => {
      const result = openInBrowser('https://swarms.world/search?q=test&page=1');
      expect(result).toBe(false);
    });

    it('should accept URLs with safe fragments', () => {
      const result = openInBrowser('https://swarms.world/docs#section-1');
      expect(result).toBe(true);
    });

    it('should accept simple URLs without query params', () => {
      const result = openInBrowser('https://swarms.world/agent/123');
      expect(result).toBe(true);
    });

    it('should reject ftp:// URLs', () => {
      expect(openInBrowser('ftp://example.com/file.txt')).toBe(false);
    });

    it('should reject about: URLs', () => {
      expect(openInBrowser('about:blank')).toBe(false);
    });

    it('should reject blob: URLs', () => {
      expect(openInBrowser('blob:https://example.com/uuid')).toBe(false);
    });
  });
});
