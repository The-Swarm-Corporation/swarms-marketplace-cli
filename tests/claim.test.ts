import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registerClaim } from '../src/commands/claim.js';
import { forbidFetch, jsonResponse, mockFetch, runCommand, withEnv } from './helpers.js';

const CA = '5XyFakeMintAddress1111111111111111111111';

test('claim rejects a malformed --ca before any network call', async () => {
  const { calls, restore } = forbidFetch();
  try {
    const { output, exitCode } = await runCommand(registerClaim, [
      'claim',
      '--ca', 'too-short',
      '--private-key', 'wallet-secret',
    ]);
    assert.equal(calls.length, 0);
    assert.match(output, /Invalid --ca \(token mint format\)\./);
    assert.equal(exitCode, 1);
  } finally {
    restore();
  }
});

test('claim posts to claimfees with the wallet key and WITHOUT Bearer auth', async () => {
  // Wallet-signed endpoint: the API key must never ride along, even when set.
  const restoreEnv = withEnv({
    SWARMS_API_KEY: 'sk-test-key',
    SWARMS_WALLET_PRIVATE_KEY: undefined,
    PRIVATE_KEY: undefined,
  });
  const { calls, restore } = mockFetch(() =>
    jsonResponse({
      success: true,
      signature: 'sig123456789abcdef',
      amountClaimedSol: 0.5,
      fees: { unclaimedSol: 0, claimedSol: 0.5, totalSol: 1.25 },
    }),
  );
  try {
    const { output, exitCode } = await runCommand(registerClaim, [
      'claim',
      '--ca', CA,
      '--private-key', 'wallet-secret',
    ]);

    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, 'https://swarms.world/api/product/claimfees');
    assert.equal(calls[0].method, 'POST');
    assert.equal(calls[0].headers['authorization'], undefined);
    assert.deepEqual(JSON.parse(calls[0].body ?? '{}'), {
      ca: CA,
      privateKey: 'wallet-secret',
    });

    assert.match(output, /Claim submitted\./);
    assert.match(output, /Signature\s*sig123456789abcdef/);
    assert.match(output, /Claimed\s*0\.5 SOL/);
    assert.match(output, /unclaimed=0 claimed=0\.5 lifetime=1\.25/);
    assert.notEqual(exitCode, 1);
  } finally {
    restore();
    restoreEnv();
  }
});

test('claim falls back to $SWARMS_WALLET_PRIVATE_KEY when --private-key is omitted', async () => {
  const restoreEnv = withEnv({
    SWARMS_WALLET_PRIVATE_KEY: 'env-wallet-secret',
    PRIVATE_KEY: undefined,
  });
  const { calls, restore } = mockFetch(() =>
    jsonResponse({ success: true, amountClaimedSol: 0 }),
  );
  try {
    await runCommand(registerClaim, ['claim', '--ca', CA]);
    assert.equal(
      JSON.parse(calls[0].body ?? '{}').privateKey,
      'env-wallet-secret',
    );
  } finally {
    restore();
    restoreEnv();
  }
});

test('claim surfaces API errors and exits 1', async () => {
  const { restore } = mockFetch(() =>
    jsonResponse({ error: 'No fees to claim' }, 400),
  );
  try {
    const { output, exitCode } = await runCommand(registerClaim, [
      'claim',
      '--ca', CA,
      '--private-key', 'wallet-secret',
    ]);
    assert.match(output, /HTTP 400/);
    assert.match(output, /No fees to claim/);
    assert.equal(exitCode, 1);
  } finally {
    restore();
  }
});
