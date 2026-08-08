import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registerList } from '../src/commands/list.js';
import { jsonResponse, mockFetch, runCommand, withEnv } from './helpers.js';

const USER_PRODUCTS = {
  user_id: '11111111-2222-3333-4444-555555555555',
  username: 'kye',
  total_products: 3,
  agents: [
    {
      id: 'a1',
      name: 'Research Agent',
      type: 'agent',
      business_model: 'tokenized',
    },
    { id: 'a2', name: 'Free Agent', type: 'agent', business_model: 'free' },
  ],
  prompts: [
    { id: 'p1', name: 'Paid Prompt', type: 'prompt', business_model: 'paid' },
  ],
  tools: [],
  summary: {
    total_prompts: 1,
    total_agents: 2,
    total_tools: 0,
    free_products: 1,
    paid_products: 1,
    tokenized_products: 1,
  },
};

test('list renders the tree scoped to the API-key holder', async () => {
  const restoreEnv = withEnv({ SWARMS_API_KEY: 'sk-test-key' });
  const { calls, restore } = mockFetch(() => jsonResponse(USER_PRODUCTS));
  try {
    const { output, exitCode } = await runCommand(registerList, ['list']);

    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, 'https://swarms.world/api/user-products');
    assert.equal(calls[0].headers['authorization'], 'Bearer sk-test-key');
    const body = JSON.parse(calls[0].body ?? '{}');
    assert.deepEqual(body, { page: 1, limit: 100, product_type: 'all' });
    assert.ok(!('username' in body) && !('user_id' in body),
      'the server resolves the caller from the key; no identity in the body');

    assert.match(output, /@kye/);
    assert.match(output, /3 products/);
    assert.match(output, /1 tokenized/);
    assert.match(output, /agents/);
    assert.match(output, /Research Agent/);
    assert.match(output, /Paid Prompt/);
    assert.match(output, /claim fees with\s+swarms claim-all/);
    assert.notEqual(exitCode, 1);
  } finally {
    restore();
    restoreEnv();
  }
});

test('list --tokenized filters out non-tokenized products', async () => {
  const restoreEnv = withEnv({ SWARMS_API_KEY: 'sk-test-key' });
  const { restore } = mockFetch(() => jsonResponse(USER_PRODUCTS));
  try {
    const { output } = await runCommand(registerList, ['list', '--tokenized']);
    assert.match(output, /Research Agent/);
    assert.ok(!output.includes('Free Agent'), 'free products should be hidden');
  } finally {
    restore();
    restoreEnv();
  }
});

test('list --json prints the raw API payload', async () => {
  const restoreEnv = withEnv({ SWARMS_API_KEY: 'sk-test-key' });
  const { restore } = mockFetch(() => jsonResponse(USER_PRODUCTS));
  try {
    const { output } = await runCommand(registerList, ['list', '--json']);
    const parsed = JSON.parse(output);
    assert.equal(parsed.username, 'kye');
    assert.equal(parsed.total_products, 3);
  } finally {
    restore();
    restoreEnv();
  }
});

test('list shows an empty-state hint when the account has no products', async () => {
  const restoreEnv = withEnv({ SWARMS_API_KEY: 'sk-test-key' });
  const { restore } = mockFetch(() =>
    jsonResponse({
      ...USER_PRODUCTS,
      agents: [],
      prompts: [],
      tools: [],
      total_products: 0,
      summary: { ...USER_PRODUCTS.summary, tokenized_products: 0 },
    }),
  );
  try {
    const { output } = await runCommand(registerList, ['list']);
    assert.match(output, /No products yet/);
  } finally {
    restore();
    restoreEnv();
  }
});

test('list fails with a login hint when the API key is missing', async () => {
  const restoreEnv = withEnv({ SWARMS_API_KEY: undefined });
  const { calls, restore } = mockFetch(() => jsonResponse({}));
  try {
    const { output, exitCode } = await runCommand(registerList, ['list']);
    assert.equal(calls.length, 0, 'must fail before any network call');
    assert.match(output, /SWARMS_API_KEY is not set/);
    assert.match(output, /swarms login/);
    assert.equal(exitCode, 1);
  } finally {
    restore();
    restoreEnv();
  }
});

test('list surfaces HTTP errors and exits 1', async () => {
  const restoreEnv = withEnv({ SWARMS_API_KEY: 'sk-test-key' });
  const { restore } = mockFetch(() =>
    jsonResponse({ error: 'boom' }, 500),
  );
  try {
    const { output, exitCode } = await runCommand(registerList, ['list']);
    assert.match(output, /HTTP 500/);
    assert.match(output, /boom/);
    assert.equal(exitCode, 1);
  } finally {
    restore();
    restoreEnv();
  }
});
