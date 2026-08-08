import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  API_BASE,
  getApiKey,
  getBaseUrl,
  getWalletPrivateKey,
  isAllowedSwarmsHost,
} from '../src/lib/config.js';
import { withEnv } from './helpers.js';

test('getApiKey returns undefined when unset', () => {
  const restore = withEnv({ SWARMS_API_KEY: undefined });
  try {
    assert.equal(getApiKey(), undefined);
  } finally {
    restore();
  }
});

test('getApiKey treats whitespace-only values as unset', () => {
  const restore = withEnv({ SWARMS_API_KEY: '   ' });
  try {
    assert.equal(getApiKey(), undefined);
  } finally {
    restore();
  }
});

test('getApiKey trims surrounding whitespace', () => {
  const restore = withEnv({ SWARMS_API_KEY: '  sk-test-123  ' });
  try {
    assert.equal(getApiKey(), 'sk-test-123');
  } finally {
    restore();
  }
});

test('base URL is hardcoded to swarms.world with no env override', () => {
  const restore = withEnv({ SWARMS_API_BASE_URL: 'https://evil.example.com' });
  try {
    assert.equal(API_BASE, 'https://swarms.world');
    assert.equal(getBaseUrl(), 'https://swarms.world');
  } finally {
    restore();
  }
});

test('isAllowedSwarmsHost accepts swarms.world and its subdomains', () => {
  assert.equal(isAllowedSwarmsHost('swarms.world'), true);
  assert.equal(isAllowedSwarmsHost('api.swarms.world'), true);
  assert.equal(isAllowedSwarmsHost('deep.sub.swarms.world'), true);
});

test('isAllowedSwarmsHost rejects lookalike and foreign hosts', () => {
  assert.equal(isAllowedSwarmsHost('evilswarms.world'), false);
  assert.equal(isAllowedSwarmsHost('swarms.world.evil.com'), false);
  assert.equal(isAllowedSwarmsHost('example.com'), false);
  assert.equal(isAllowedSwarmsHost(''), false);
});

test('getWalletPrivateKey prefers SWARMS_WALLET_PRIVATE_KEY over PRIVATE_KEY', () => {
  const restore = withEnv({
    SWARMS_WALLET_PRIVATE_KEY: 'scoped-key',
    PRIVATE_KEY: 'generic-key',
  });
  try {
    assert.equal(getWalletPrivateKey(), 'scoped-key');
  } finally {
    restore();
  }
});

test('getWalletPrivateKey falls back to PRIVATE_KEY', () => {
  const restore = withEnv({
    SWARMS_WALLET_PRIVATE_KEY: undefined,
    PRIVATE_KEY: '  generic-key  ',
  });
  try {
    assert.equal(getWalletPrivateKey(), 'generic-key');
  } finally {
    restore();
  }
});

test('getWalletPrivateKey returns undefined when neither var is set', () => {
  const restore = withEnv({
    SWARMS_WALLET_PRIVATE_KEY: undefined,
    PRIVATE_KEY: undefined,
  });
  try {
    assert.equal(getWalletPrivateKey(), undefined);
  } finally {
    restore();
  }
});
