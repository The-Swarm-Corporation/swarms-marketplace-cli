import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MASCOT_HEIGHT, banner } from './theme.js';

describe('theme', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('mask', () => {
    it('should mask short keys (<=8 chars) completely', () => {
      process.env.SWARMS_API_KEY = 'short';
      const output = banner();
      expect(output).toContain('••••');
    });

    it('should show first 4 and last 4 chars for longer keys', () => {
      process.env.SWARMS_API_KEY = 'abcdefghijklmnop';
      const output = banner();
      expect(output).toContain('abcd…mnop');
    });

    it('should handle exactly 9 character keys', () => {
      process.env.SWARMS_API_KEY = '123456789';
      const output = banner();
      expect(output).toContain('1234…6789');
    });

    it('should handle very long keys', () => {
      process.env.SWARMS_API_KEY = 'a'.repeat(100);
      const output = banner();
      expect(output).toMatch(/aaaa…aaaa/);
    });
  });

  describe('MASCOT_HEIGHT', () => {
    it('should match the frame length', () => {
      expect(MASCOT_HEIGHT).toBe(5);
    });

    it('should ensure banner has correct number of mascot lines', () => {
      const output = banner();
      const lines = output.split('\n');
      
      const mascotLines = lines.filter(line => 
        line.includes('▄') || line.includes('█') || line.includes('▀')
      );
      
      expect(mascotLines.length).toBeGreaterThanOrEqual(MASCOT_HEIGHT);
    });
  });

  describe('banner', () => {
    it('should render without errors', () => {
      const output = banner();
      expect(output).toBeTruthy();
      expect(typeof output).toBe('string');
    });

    it('should include version number', () => {
      const output = banner();
      expect(output).toMatch(/v\d+\.\d+\.\d+/);
    });

    it('should include API base URL', () => {
      const output = banner();
      expect(output).toContain('https://swarms.world');
    });

    it('should show "not set" when API key is missing', () => {
      delete process.env.SWARMS_API_KEY;
      const output = banner();
      expect(output).toContain('not set');
    });

    it('should show masked key when API key is set', () => {
      process.env.SWARMS_API_KEY = 'test-key-12345';
      const output = banner();
      expect(output).toMatch(/test…2345|••••/);
    });

    it('should include tip line', () => {
      const output = banner();
      expect(output).toContain('Tip:');
    });

    it('should start and end with newlines', () => {
      const output = banner();
      expect(output.startsWith('\n')).toBe(true);
      expect(output.endsWith('\n')).toBe(true);
    });
  });
});
