import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registerListTokenized } from '../src/commands/list-tokenized.js';
import { jsonResponse, mockFetch, runCommand, withEnv } from './helpers.js';

const TOKENIZED = {
  user_id: '11111111-2222-3333-4444-555555555555',
  username: 'kye',
  total: 2,
  counts: { agents: 1, prompts: 1 },
  data: [
    {
      id: 'a1',
      name: 'Research Agent',
      type: 'agent',
      token_address: '5XyFakeMintAddress1111111111111111111111',
      created_at: '2026-01-01T00:00:00Z',
      listing_url: 'https://swarms.world/agent/a1',
    },
    {
      id: 'p1',
      name: 'Trading Prompt',
      type: 'prompt',
      token_address: '3AbcFakeMintAddress222222222222222222222',
      created_at: '2026-01-02T00:00:00Z',
      listing_url: 'https://swarms.world/prompt/p1',
    },
  ],
  pagination: { page: 1, limit: 100, total_pages: 1, has_next: false, has_prev: false },
};

test('list-tokenized sends Bearer auth and renders the caller-scoped view', async () => {
  const restoreEnv = withEnv({ SWARMS_API_KEY: 'sk-test-key' });
  const { calls, restore } = mockFetch(() => jsonResponse(TOKENIZED));
  try {
    const { output, exitCode } = await runCommand(registerListTokenized, [
      'list-tokenized',
    ]);

    assert.equal(calls.length, 1);
    const url = new URL(calls[0].url);
    assert.equal(url.pathname, '/api/get-tokenized-products');
    assert.equal(url.searchParams.get('type'), 'all');
    assert.equal(url.searchParams.get('limit'), '100');
    assert.equal(url.searchParams.get('page'), '1');
    assert.equal(calls[0].headers['authorization'], 'Bearer sk-test-key');

    assert.match(output, /TOKENIZED/);
    assert.match(output, /2 total · page 1\/1 · 2 shown/);
    assert.match(output, /owner=kye\s+agents=1\s+prompts=1/);
    assert.match(output, /\[agent\] Research Agent/);
    assert.match(output, /5XyFakeMintAddress1111111111111111111111/);
    assert.match(output, /https:\/\/swarms\.world\/agent\/a1/);
    assert.notEqual(exitCode, 1);
  } finally {
    restore();
    restoreEnv();
  }
});

test('list-tokenized forwards --type, --limit, and --page to the query string', async () => {
  const restoreEnv = withEnv({ SWARMS_API_KEY: 'sk-test-key' });
  const { calls, restore } = mockFetch(() => jsonResponse(TOKENIZED));
  try {
    await runCommand(registerListTokenized, [
      'list-tokenized',
      '--type', 'agent',
      '--limit', '50',
      '--page', '3',
    ]);
    const url = new URL(calls[0].url);
    assert.equal(url.searchParams.get('type'), 'agent');
    assert.equal(url.searchParams.get('limit'), '50');
    assert.equal(url.searchParams.get('page'), '3');
  } finally {
    restore();
    restoreEnv();
  }
});

test('list-tokenized is aliased as tokens', async () => {
  const restoreEnv = withEnv({ SWARMS_API_KEY: 'sk-test-key' });
  const { calls, restore } = mockFetch(() => jsonResponse(TOKENIZED));
  try {
    const { output } = await runCommand(registerListTokenized, ['tokens']);
    assert.equal(calls.length, 1);
    assert.match(output, /owner=kye/);
  } finally {
    restore();
    restoreEnv();
  }
});

test('list-tokenized hints at the next page when has_next is true', async () => {
  const restoreEnv = withEnv({ SWARMS_API_KEY: 'sk-test-key' });
  const { restore } = mockFetch(() =>
    jsonResponse({
      ...TOKENIZED,
      pagination: { page: 1, limit: 1, total_pages: 2, has_next: true, has_prev: false },
    }),
  );
  try {
    const { output } = await runCommand(registerListTokenized, ['list-tokenized']);
    assert.match(output, /More results — re-run with\s+--page 2\./);
  } finally {
    restore();
    restoreEnv();
  }
});

test('list-tokenized shows an empty-state hint when the caller has no tokens', async () => {
  const restoreEnv = withEnv({ SWARMS_API_KEY: 'sk-test-key' });
  const { restore } = mockFetch(() =>
    jsonResponse({
      ...TOKENIZED,
      total: 0,
      counts: { agents: 0, prompts: 0 },
      data: [],
    }),
  );
  try {
    const { output } = await runCommand(registerListTokenized, ['list-tokenized']);
    assert.match(output, /You have no tokenized products yet/);
    assert.match(output, /swarms launch token/);
  } finally {
    restore();
    restoreEnv();
  }
});

test('list-tokenized --json round-trips the raw payload', async () => {
  const restoreEnv = withEnv({ SWARMS_API_KEY: 'sk-test-key' });
  const { restore } = mockFetch(() => jsonResponse(TOKENIZED));
  try {
    const { output } = await runCommand(registerListTokenized, [
      'list-tokenized',
      '--json',
    ]);
    const parsed = JSON.parse(output);
    assert.equal(parsed.username, 'kye');
    assert.equal(parsed.data.length, 2);
    assert.deepEqual(parsed.counts, { agents: 1, prompts: 1 });
  } finally {
    restore();
    restoreEnv();
  }
});

test('list-tokenized requires an API key and prints the login hint on 401', async () => {
  const restoreEnv = withEnv({ SWARMS_API_KEY: undefined });
  const { calls, restore } = mockFetch(() => jsonResponse({}));
  try {
    const { output, exitCode } = await runCommand(registerListTokenized, [
      'list-tokenized',
    ]);
    assert.equal(calls.length, 0, 'must fail before any network call');
    assert.match(output, /SWARMS_API_KEY is not set/);
    assert.match(output, /Run `swarms login` to set an API key\./);
    assert.equal(exitCode, 1);
  } finally {
    restore();
    restoreEnv();
  }
});

test('list-tokenized surfaces a server 400 for an invalid type', async () => {
  const restoreEnv = withEnv({ SWARMS_API_KEY: 'sk-test-key' });
  const { restore } = mockFetch(() =>
    jsonResponse(
      { error: "Invalid 'type'. Use one of: all, agent, prompt (plurals also accepted)." },
      400,
    ),
  );
  try {
    const { output, exitCode } = await runCommand(registerListTokenized, [
      'list-tokenized',
      '--type', 'tool',
    ]);
    assert.match(output, /HTTP 400/);
    assert.match(output, /Invalid 'type'/);
    assert.equal(exitCode, 1);
  } finally {
    restore();
    restoreEnv();
  }
});
