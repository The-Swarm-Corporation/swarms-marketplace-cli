/**
 * `open` command tests. All runs use --print so no real browser is launched.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registerOpen } from '../src/commands/open.js';
import { forbidFetch, jsonResponse, mockFetch, runCommand } from './helpers.js';

const UUID = '11111111-2222-3333-4444-555555555555';
const CA = '5XyFakeMintAddress1111111111111111111111';

test('open rejects a ref that is neither a UUID nor a base58 mint', async () => {
  const { calls, restore } = forbidFetch();
  try {
    const { output, exitCode } = await runCommand(registerOpen, [
      'open', 'not_a_valid_ref!', '--print',
    ]);
    assert.equal(calls.length, 0);
    assert.match(output, /Could not recognize "not_a_valid_ref!"/);
    assert.equal(exitCode, 1);
  } finally {
    restore();
  }
});

test('open requires --type for a UUID ref', async () => {
  const { calls, restore } = forbidFetch();
  try {
    const { output, exitCode } = await runCommand(registerOpen, [
      'open', UUID, '--print',
    ]);
    assert.equal(calls.length, 0);
    assert.match(output, /UUIDs need a type\./);
    assert.equal(exitCode, 1);
  } finally {
    restore();
  }
});

test('open rejects an invalid --type', async () => {
  const { restore } = forbidFetch();
  try {
    const { output, exitCode } = await runCommand(registerOpen, [
      'open', UUID, '--type', 'bogus', '--print',
    ]);
    assert.match(output, /--type must be one of agent \| prompt \| tool/);
    assert.equal(exitCode, 1);
  } finally {
    restore();
  }
});

test('open builds the listing URL directly for a UUID + type (no lookup)', async () => {
  const { calls, restore } = forbidFetch();
  try {
    const { output, exitCode } = await runCommand(registerOpen, [
      'open', UUID, '--type', 'agent', '--print',
    ]);
    assert.equal(calls.length, 0, 'UUID fast path must not hit the API');
    assert.match(output, new RegExp(`URL\\s*https://swarms\\.world/agent/${UUID}`));
    assert.notEqual(exitCode, 1);
  } finally {
    restore();
  }
});

test('open resolves a mint via the tokenized-products API', async () => {
  const { calls, restore } = mockFetch(() =>
    jsonResponse({
      data: [
        {
          id: 'a1',
          name: 'Research Agent',
          type: 'agent',
          token_address: CA,
          listing_url: 'https://swarms.world/agent/a1',
        },
      ],
      pagination: { page: 1, total_pages: 1, has_next: false },
    }),
  );
  try {
    const { output, exitCode } = await runCommand(registerOpen, [
      'open', CA, '--print',
    ]);
    assert.equal(calls.length, 1);
    assert.ok(calls[0].url.includes('/api/get-tokenized-products'));
    assert.match(output, /AGENT/);
    assert.match(output, /Research Agent/);
    assert.match(output, /URL\s*https:\/\/swarms\.world\/agent\/a1/);
    assert.notEqual(exitCode, 1);
  } finally {
    restore();
  }
});

test('open fails when no product matches the mint', async () => {
  const { restore } = mockFetch(() =>
    jsonResponse({
      data: [],
      pagination: { page: 1, total_pages: 1, has_next: false },
    }),
  );
  try {
    const { output, exitCode } = await runCommand(registerOpen, [
      'open', CA, '--print',
    ]);
    assert.match(output, new RegExp(`No tokenized product found for mint "${CA}"`));
    assert.equal(exitCode, 1);
  } finally {
    restore();
  }
});

test('open refuses a server-supplied listing URL on a foreign host', async () => {
  const { restore } = mockFetch(() =>
    jsonResponse({
      data: [
        {
          id: 'a1',
          name: 'Poisoned Listing',
          type: 'agent',
          token_address: CA,
          listing_url: 'https://evil.example.com/agent/a1',
        },
      ],
      pagination: { page: 1, total_pages: 1, has_next: false },
    }),
  );
  try {
    const { output, exitCode } = await runCommand(registerOpen, [
      'open', CA, '--print',
    ]);
    assert.match(output, /Refusing to open untrusted listing URL/);
    assert.match(output, /evil\.example\.com/);
    assert.equal(exitCode, 1);
  } finally {
    restore();
  }
});

test('open refuses a non-https listing URL even on an allowed host', async () => {
  const { restore } = mockFetch(() =>
    jsonResponse({
      data: [
        {
          id: 'a1',
          name: 'Downgraded Listing',
          type: 'agent',
          token_address: CA,
          listing_url: 'http://swarms.world/agent/a1',
        },
      ],
      pagination: { page: 1, total_pages: 1, has_next: false },
    }),
  );
  try {
    const { output, exitCode } = await runCommand(registerOpen, [
      'open', CA, '--print',
    ]);
    assert.match(output, /Refusing to open untrusted listing URL/);
    assert.equal(exitCode, 1);
  } finally {
    restore();
  }
});
