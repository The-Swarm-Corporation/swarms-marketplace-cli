import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ApiError, formatHttpError, get, post } from '../src/lib/api.js';
import { forbidFetch, jsonResponse, mockFetch, withEnv } from './helpers.js';

test('post throws ApiError(401) before any network call when the key is missing', async () => {
  const restoreEnv = withEnv({ SWARMS_API_KEY: undefined });
  const { calls, restore } = forbidFetch();
  try {
    await assert.rejects(
      () => post('/api/user-products', {}),
      (err: unknown) => {
        assert.ok(err instanceof ApiError);
        assert.equal(err.status, 401);
        assert.match(err.message, /SWARMS_API_KEY is not set/);
        return true;
      },
    );
    assert.equal(calls.length, 0);
  } finally {
    restore();
    restoreEnv();
  }
});

test('post sends Bearer auth, JSON body, and parses the response', async () => {
  const restoreEnv = withEnv({ SWARMS_API_KEY: 'sk-test-key' });
  const { calls, restore } = mockFetch(() => jsonResponse({ hello: 'world' }));
  try {
    const data = await post<{ hello: string }>('/api/user-products', {
      page: 1,
    });
    assert.equal(data.hello, 'world');
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, 'https://swarms.world/api/user-products');
    assert.equal(calls[0].method, 'POST');
    assert.equal(calls[0].headers['authorization'], 'Bearer sk-test-key');
    assert.equal(calls[0].headers['content-type'], 'application/json');
    assert.deepEqual(JSON.parse(calls[0].body ?? ''), { page: 1 });
  } finally {
    restore();
    restoreEnv();
  }
});

test('post with auth:false omits the Authorization header even when a key is set', async () => {
  const restoreEnv = withEnv({ SWARMS_API_KEY: 'sk-test-key' });
  const { calls, restore } = mockFetch(() => jsonResponse({ ok: true }));
  try {
    await post('/api/product/claimfees', { ca: 'x' }, { auth: false });
    assert.equal(calls[0].headers['authorization'], undefined);
  } finally {
    restore();
    restoreEnv();
  }
});

test('get is unauthenticated by default and adds Bearer only with auth:true', async () => {
  const restoreEnv = withEnv({ SWARMS_API_KEY: 'sk-test-key' });
  const { calls, restore } = mockFetch(() => jsonResponse({ ok: true }));
  try {
    await get('/api/get-tokenized-products?page=1');
    assert.equal(calls[0].headers['authorization'], undefined);

    await get('/api/get-tokenized-products?page=1', { auth: true });
    assert.equal(calls[1].headers['authorization'], 'Bearer sk-test-key');
  } finally {
    restore();
    restoreEnv();
  }
});

test('get with auth:true throws ApiError(401) when the key is missing', async () => {
  const restoreEnv = withEnv({ SWARMS_API_KEY: undefined });
  const { calls, restore } = forbidFetch();
  try {
    await assert.rejects(
      () => get('/api/get-tokenized-products', { auth: true }),
      (err: unknown) => err instanceof ApiError && err.status === 401,
    );
    assert.equal(calls.length, 0);
  } finally {
    restore();
    restoreEnv();
  }
});

test('non-2xx responses become ApiError with status and the body message', async () => {
  const restoreEnv = withEnv({ SWARMS_API_KEY: 'sk-test-key' });
  const { restore } = mockFetch(() =>
    jsonResponse({ error: "Invalid 'type'." }, 400),
  );
  try {
    await assert.rejects(
      () => get('/api/get-tokenized-products?type=bogus', { auth: true }),
      (err: unknown) => {
        assert.ok(err instanceof ApiError);
        assert.equal(err.status, 400);
        assert.match(err.message, /HTTP 400/);
        assert.match(err.message, /Invalid 'type'\./);
        return true;
      },
    );
  } finally {
    restore();
    restoreEnv();
  }
});

test('network failures become ApiError with status 0', async () => {
  const restoreEnv = withEnv({ SWARMS_API_KEY: 'sk-test-key' });
  const { restore } = mockFetch(() => {
    throw new TypeError('fetch failed');
  });
  try {
    await assert.rejects(
      () => post('/api/user-products', {}),
      (err: unknown) => {
        assert.ok(err instanceof ApiError);
        assert.equal(err.status, 0);
        assert.match(err.message, /Network error/);
        assert.match(err.message, /fetch failed/);
        return true;
      },
    );
  } finally {
    restore();
    restoreEnv();
  }
});

test('formatHttpError includes method, URL, status, and empty-body marker', () => {
  const res = new Response('', { status: 500 });
  const msg = formatHttpError('POST', 'https://swarms.world/api/x', res, {}, '');
  assert.match(msg, /POST https:\/\/swarms\.world\/api\/x/);
  assert.match(msg, /HTTP 500/);
  assert.match(msg, /\(empty response body\)/);
});

test('formatHttpError truncates long non-JSON bodies to a 300-char snippet', () => {
  const raw = 'x'.repeat(500);
  const res = new Response(raw, { status: 502 });
  const msg = formatHttpError('GET', 'https://swarms.world/api/x', res, raw, raw);
  assert.match(msg, /body: x{300}…/);
  assert.ok(!msg.includes('x'.repeat(301)));
});

test('formatHttpError surfaces rate-limit headers and a 429 retry hint', () => {
  const res = new Response('', {
    status: 429,
    headers: { 'retry-after': '30', 'x-ratelimit-remaining': '0' },
  });
  const msg = formatHttpError('GET', 'https://swarms.world/api/x', res, {}, '');
  assert.match(msg, /retry-after: 30/);
  assert.match(msg, /x-ratelimit-remaining: 0/);
  assert.match(msg, /Rate limited — retry after 30s\./);
});
