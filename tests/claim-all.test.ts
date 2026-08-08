import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registerClaimAll } from '../src/commands/claim-all.js';
import { jsonResponse, mockFetch, runCommand, withEnv } from './helpers.js';

const CA1 = '5XyFakeMintAddress1111111111111111111111';
const CA2 = '3AbcFakeMintAddress222222222222222222222';

const OWN_TOKENIZED = {
  total: 2,
  counts: { agents: 1, prompts: 1 },
  data: [
    { id: 'a1', name: 'Research Agent', type: 'agent', token_address: CA1 },
    { id: 'p1', name: 'Trading Prompt', type: 'prompt', token_address: CA2 },
  ],
  pagination: { page: 1, limit: 500, total_pages: 1, has_next: false, has_prev: false },
};

test('claim-all requires an API key to enumerate mints', async () => {
  const restoreEnv = withEnv({ SWARMS_API_KEY: undefined });
  const { calls, restore } = mockFetch(() => jsonResponse({}));
  try {
    const { output, exitCode } = await runCommand(registerClaimAll, ['claim-all']);
    assert.equal(calls.length, 0, 'must fail before any network call');
    assert.match(output, /SWARMS_API_KEY is not set/);
    assert.match(output, /Run `swarms login` to set an API key\./);
    assert.equal(exitCode, 1);
  } finally {
    restore();
    restoreEnv();
  }
});

test('claim-all --dry-run lists the caller\'s mints and submits nothing', async () => {
  const restoreEnv = withEnv({ SWARMS_API_KEY: 'sk-test-key' });
  const { calls, restore } = mockFetch(() => jsonResponse(OWN_TOKENIZED));
  try {
    const { output, exitCode } = await runCommand(registerClaimAll, [
      'claim-all',
      '--dry-run',
    ]);

    assert.equal(calls.length, 1, 'only the enumeration GET, no claims');
    assert.equal(calls[0].method, 'GET');
    const url = new URL(calls[0].url);
    assert.equal(url.pathname, '/api/get-tokenized-products');
    assert.equal(calls[0].headers['authorization'], 'Bearer sk-test-key');

    assert.match(output, /CLAIM ALL/);
    assert.match(output, /2 mints/);
    assert.match(output, /\[agent\] Research Agent/);
    assert.ok(output.includes(CA1) && output.includes(CA2));
    assert.match(output, /Dry run — no claims submitted\./);
    assert.notEqual(exitCode, 1);
  } finally {
    restore();
    restoreEnv();
  }
});

test('claim-all reports the empty state when the caller owns no tokens', async () => {
  const restoreEnv = withEnv({ SWARMS_API_KEY: 'sk-test-key' });
  const { restore } = mockFetch(() =>
    jsonResponse({ ...OWN_TOKENIZED, total: 0, data: [] }),
  );
  try {
    const { output, exitCode } = await runCommand(registerClaimAll, ['claim-all']);
    assert.match(output, /You have no tokenized products yet/);
    assert.match(output, /swarms launch token/);
    assert.notEqual(exitCode, 1);
  } finally {
    restore();
    restoreEnv();
  }
});

test('claim-all claims each mint without Bearer auth and totals the results', async () => {
  const restoreEnv = withEnv({ SWARMS_API_KEY: 'sk-test-key' });
  const { calls, restore } = mockFetch((url, init) => {
    if (url.includes('/api/get-tokenized-products')) {
      return jsonResponse(OWN_TOKENIZED);
    }
    const { ca } = JSON.parse(String(init?.body ?? '{}'));
    // First mint pays out, second has nothing to claim.
    return jsonResponse({
      success: true,
      signature: `sig-for-${ca}`,
      amountClaimedSol: ca === CA1 ? 0.5 : 0,
    });
  });
  try {
    const { output, exitCode } = await runCommand(registerClaimAll, [
      'claim-all',
      '--private-key', 'wallet-secret',
    ]);

    const claims = calls.filter((c) => c.url.endsWith('/api/product/claimfees'));
    assert.equal(claims.length, 2);
    for (const c of claims) {
      assert.equal(c.method, 'POST');
      assert.equal(c.headers['authorization'], undefined,
        'claimfees is wallet-signed; the API key must not be sent');
      assert.equal(JSON.parse(c.body ?? '{}').privateKey, 'wallet-secret');
    }

    assert.match(output, /1 claimed · 1 nothing-to-claim · 0 failed · 0\.5 SOL total/);
    assert.notEqual(exitCode, 1);
  } finally {
    restore();
    restoreEnv();
  }
});

test('claim-all continues past a failed mint and exits 1', async () => {
  const restoreEnv = withEnv({ SWARMS_API_KEY: 'sk-test-key' });
  const { calls, restore } = mockFetch((url, init) => {
    if (url.includes('/api/get-tokenized-products')) {
      return jsonResponse(OWN_TOKENIZED);
    }
    const { ca } = JSON.parse(String(init?.body ?? '{}'));
    if (ca === CA1) return jsonResponse({ error: 'rpc unavailable' }, 500);
    return jsonResponse({ success: true, amountClaimedSol: 0.25 });
  });
  try {
    const { output, exitCode } = await runCommand(registerClaimAll, [
      'claim-all',
      '--private-key', 'wallet-secret',
    ]);

    const claims = calls.filter((c) => c.url.endsWith('/api/product/claimfees'));
    assert.equal(claims.length, 2, 'a failure must not abort the batch');
    assert.match(output, /rpc unavailable/);
    assert.match(output, /1 claimed · 0 nothing-to-claim · 1 failed · 0\.25 SOL total/);
    assert.equal(exitCode, 1);
  } finally {
    restore();
    restoreEnv();
  }
});

test('claim-all paginates the enumeration until the total is reached', async () => {
  const restoreEnv = withEnv({ SWARMS_API_KEY: 'sk-test-key' });
  const page1 = {
    total: 501,
    data: Array.from({ length: 500 }, (_, i) => ({
      id: `id-${i}`,
      name: `Agent ${i}`,
      type: 'agent',
      token_address: `Mint${String(i).padStart(36, '0')}`,
    })),
    pagination: { page: 1, limit: 500, total_pages: 2, has_next: true, has_prev: false },
  };
  const page2 = {
    total: 501,
    data: [{ id: 'id-500', name: 'Agent 500', type: 'agent', token_address: CA1 }],
    pagination: { page: 2, limit: 500, total_pages: 2, has_next: false, has_prev: true },
  };
  const { calls, restore } = mockFetch((url) => {
    const page = new URL(url).searchParams.get('page');
    return jsonResponse(page === '1' ? page1 : page2);
  });
  try {
    const { output } = await runCommand(registerClaimAll, [
      'claim-all',
      '--dry-run',
    ]);
    assert.equal(calls.length, 2, 'expected two enumeration pages');
    assert.match(output, /501 mints/);
  } finally {
    restore();
    restoreEnv();
  }
});
