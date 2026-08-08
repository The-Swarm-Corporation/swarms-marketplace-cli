import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getApiKey, getBaseUrl, getWalletPrivateKey, isAllowedSwarmsHost } from '../../src/lib/config.js';

describe('config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('getApiKey', () => {
    it('should return SWARMS_API_KEY when set', () => {
      process.env.SWARMS_API_KEY = 'test-api-key-123';
      expect(getApiKey()).toBe('test-api-key-123');
    });

    it('should trim whitespace from SWARMS_API_KEY', () => {
      process.env.SWARMS_API_KEY = '  test-key  ';
      expect(getApiKey()).toBe('test-key');
    });

    it('should return undefined when SWARMS_API_KEY is not set', () => {
      delete process.env.SWARMS_API_KEY;
      expect(getApiKey()).toBeUndefined();
    });

    it('should return undefined when SWARMS_API_KEY is empty', () => {
      process.env.SWARMS_API_KEY = '';
      expect(getApiKey()).toBeUndefined();
    });

    it('should return undefined when SWARMS_API_KEY is only whitespace', () => {
      process.env.SWARMS_API_KEY = '   ';
      expect(getApiKey()).toBeUndefined();
    });
  });

  describe('getBaseUrl', () => {
    it('should always return https://swarms.world', () => {
      expect(getBaseUrl()).toBe('https://swarms.world');
    });

    it('should not be affected by environment variables', () => {
      process.env.SWARMS_API_BASE_URL = 'https://evil.com';
      expect(getBaseUrl()).toBe('https://swarms.world');
    });
  });

  describe('getWalletPrivateKey', () => {
    it('should prefer SWARMS_WALLET_PRIVATE_KEY over PRIVATE_KEY', () => {
      process.env.SWARMS_WALLET_PRIVATE_KEY = 'swarms-key';
      process.env.PRIVATE_KEY = 'generic-key';
      expect(getWalletPrivateKey()).toBe('swarms-key');
    });

    it('should fall back to PRIVATE_KEY when SWARMS_WALLET_PRIVATE_KEY is not set', () => {
      delete process.env.SWARMS_WALLET_PRIVATE_KEY;
      process.env.PRIVATE_KEY = 'generic-key';
      expect(getWalletPrivateKey()).toBe('generic-key');
    });

    it('should trim whitespace from SWARMS_WALLET_PRIVATE_KEY', () => {
      process.env.SWARMS_WALLET_PRIVATE_KEY = '  key123  ';
      expect(getWalletPrivateKey()).toBe('key123');
    });

    it('should trim whitespace from PRIVATE_KEY', () => {
      delete process.env.SWARMS_WALLET_PRIVATE_KEY;
      process.env.PRIVATE_KEY = '  key456  ';
      expect(getWalletPrivateKey()).toBe('key456');
    });

    it('should return undefined when neither is set', () => {
      delete process.env.SWARMS_WALLET_PRIVATE_KEY;
      delete process.env.PRIVATE_KEY;
      expect(getWalletPrivateKey()).toBeUndefined();
    });

    it('should return undefined when both are empty', () => {
      process.env.SWARMS_WALLET_PRIVATE_KEY = '';
      process.env.PRIVATE_KEY = '';
      expect(getWalletPrivateKey()).toBeUndefined();
    });

    it('should fall back to PRIVATE_KEY when SWARMS_WALLET_PRIVATE_KEY is whitespace-only', () => {
      process.env.SWARMS_WALLET_PRIVATE_KEY = '   ';
      process.env.PRIVATE_KEY = 'fallback-key';
      expect(getWalletPrivateKey()).toBe('fallback-key');
    });
  });

  describe('isAllowedSwarmsHost', () => {
    it('should accept swarms.world', () => {
      expect(isAllowedSwarmsHost('swarms.world')).toBe(true);
    });

    it('should accept subdomains of swarms.world', () => {
      expect(isAllowedSwarmsHost('api.swarms.world')).toBe(true);
      expect(isAllowedSwarmsHost('staging.swarms.world')).toBe(true);
      expect(isAllowedSwarmsHost('dev.api.swarms.world')).toBe(true);
    });

    it('should reject non-swarms.world domains', () => {
      expect(isAllowedSwarmsHost('evil.com')).toBe(false);
      expect(isAllowedSwarmsHost('swarms.world.evil.com')).toBe(false);
      expect(isAllowedSwarmsHost('notswarms.world')).toBe(false);
    });

    it('should reject typo-squat domains', () => {
      expect(isAllowedSwarmsHost('swarns.world')).toBe(false);
      expect(isAllowedSwarmsHost('swarms.worl')).toBe(false);
    });

    it('should reject localhost', () => {
      expect(isAllowedSwarmsHost('localhost')).toBe(false);
    });
  });
});
