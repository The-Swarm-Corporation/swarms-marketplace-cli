import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { formatHttpError, ApiError, get, post } from './api.js';

describe('formatHttpError', () => {
  it('should prefer parsed body message over raw body', () => {
    const res = new Response('raw body text', {
      status: 400,
      statusText: 'Bad Request',
    });
    const parsedBody = { error: 'Validation failed' };
    const result = formatHttpError('POST', 'https://api.test/endpoint', res, parsedBody, 'raw body text');
    
    expect(result).toContain('POST https://api.test/endpoint');
    expect(result).toContain('HTTP 400 Bad Request');
    expect(result).toContain('Validation failed');
    expect(result).not.toContain('raw body text');
  });

  it('should truncate raw body at 300 chars when no parsed message', () => {
    const longBody = 'x'.repeat(400);
    const res = new Response(longBody, { status: 500 });
    const result = formatHttpError('GET', 'https://api.test/data', res, {}, longBody);
    
    expect(result).toContain('body: ' + 'x'.repeat(300) + '…');
    expect(result.length).toBeLessThan(longBody.length + 200);
  });

  it('should include rate-limit headers when present', () => {
    const headers = new Headers({
      'retry-after': '60',
      'x-ratelimit-limit': '100',
      'x-ratelimit-remaining': '0',
    });
    const res = new Response('', { status: 429, headers });
    const result = formatHttpError('POST', 'https://api.test/submit', res, {}, '');
    
    expect(result).toContain('retry-after: 60');
    expect(result).toContain('x-ratelimit-limit: 100');
    expect(result).toContain('x-ratelimit-remaining: 0');
  });

  it('should show rate-limit hint for 429 with retry-after header', () => {
    const headers = new Headers({ 'retry-after': '30' });
    const res = new Response('', { status: 429, headers });
    const result = formatHttpError('GET', 'https://api.test/list', res, {}, '');
    
    expect(result).toContain('Rate limited — retry after 30s');
  });

  it('should show generic rate-limit hint for 429 without retry-after', () => {
    const res = new Response('', { status: 429 });
    const result = formatHttpError('GET', 'https://api.test/list', res, {}, '');
    
    expect(result).toContain('Rate limited — back off and retry in 30–60s');
  });

  it('should handle Vercel checkpoint case (429 with HTML body)', () => {
    const htmlBody = '<html><body>Rate limited by Vercel</body></html>';
    const headers = new Headers({ 'retry-after': '45' });
    const res = new Response(htmlBody, { status: 429, headers });
    const result = formatHttpError('POST', 'https://api.test/action', res, {}, htmlBody);
    
    expect(result).toContain('HTTP 429');
    expect(result).toContain('Rate limited — retry after 45s');
    expect(result).toContain('body: <html>');
  });

  it('should extract message from various body field names', () => {
    const testCases = [
      { error: 'Error field' },
      { message: 'Message field' },
      { details: 'Details field' },
      { detail: 'Detail field' },
    ];

    testCases.forEach((body) => {
      const res = new Response('', { status: 400 });
      const result = formatHttpError('POST', 'https://api.test/test', res, body, '');
      const expectedMsg = Object.values(body)[0];
      expect(result).toContain(expectedMsg);
    });
  });
});

describe('ApiError', () => {
  it('should create error with status and details', () => {
    const err = new ApiError('Test error', 404, { id: 'not-found' });
    
    expect(err.message).toBe('Test error');
    expect(err.status).toBe(404);
    expect(err.details).toEqual({ id: 'not-found' });
    expect(err instanceof Error).toBe(true);
  });
});

describe('post', () => {
  const originalFetch = global.fetch;
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env = originalEnv;
  });

  it('should send User-Agent header', async () => {
    process.env.SWARMS_API_KEY = 'test-key';
    (global.fetch as any).mockResolvedValue(
      new Response(JSON.stringify({ success: true }), { status: 200 })
    );

    await post('/api/test', { data: 'test' });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/test'),
      expect.objectContaining({
        headers: expect.objectContaining({
          'User-Agent': expect.stringContaining('swarms-marketplace-cli'),
        }),
      })
    );
  });

  it('should toggle Authorization header based on auth flag', async () => {
    process.env.SWARMS_API_KEY = 'test-key';
    (global.fetch as any).mockResolvedValue(
      new Response(JSON.stringify({}), { status: 200 })
    );

    await post('/api/test', {}, { auth: false });

    const callArgs = (global.fetch as any).mock.calls[0][1];
    expect(callArgs.headers.Authorization).toBeUndefined();
  });

  it('should include Authorization header by default', async () => {
    process.env.SWARMS_API_KEY = 'test-key-123';
    (global.fetch as any).mockResolvedValue(
      new Response(JSON.stringify({}), { status: 200 })
    );

    await post('/api/test', {});

    const callArgs = (global.fetch as any).mock.calls[0][1];
    expect(callArgs.headers.Authorization).toBe('Bearer test-key-123');
  });

  it('should throw ApiError 401 when SWARMS_API_KEY is missing', async () => {
    delete process.env.SWARMS_API_KEY;

    await expect(post('/api/test', {})).rejects.toThrow(ApiError);
    await expect(post('/api/test', {})).rejects.toMatchObject({
      status: 401,
      message: expect.stringContaining('SWARMS_API_KEY is not set'),
    });
  });

  it('should throw ApiError with formatted message on non-2xx', async () => {
    process.env.SWARMS_API_KEY = 'test-key';
    (global.fetch as any).mockResolvedValue(
      new Response(JSON.stringify({ error: 'Invalid request' }), { status: 400 })
    );

    try {
      await post('/api/test', {});
      expect.fail('Should have thrown ApiError');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).status).toBe(400);
      expect((err as ApiError).message).toContain('Invalid request');
    }
  });

  it('should throw ApiError(0) on network error', async () => {
    process.env.SWARMS_API_KEY = 'test-key';
    (global.fetch as any).mockRejectedValue(new Error('Network failure'));

    try {
      await post('/api/test', {});
      expect.fail('Should have thrown ApiError');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).status).toBe(0);
      expect((err as ApiError).message).toContain('Network error');
    }
  });

  it('should parse JSON response body', async () => {
    process.env.SWARMS_API_KEY = 'test-key';
    const responseData = { id: '123', name: 'Test' };
    (global.fetch as any).mockResolvedValue(
      new Response(JSON.stringify(responseData), { status: 200 })
    );

    const result = await post('/api/test', {});
    expect(result).toEqual(responseData);
  });
});

describe('get', () => {
  const originalFetch = global.fetch;
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env = originalEnv;
  });

  it('should send User-Agent header', async () => {
    (global.fetch as any).mockResolvedValue(
      new Response(JSON.stringify({ data: [] }), { status: 200 })
    );

    await get('/api/list');

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/list'),
      expect.objectContaining({
        headers: expect.objectContaining({
          'User-Agent': expect.stringContaining('swarms-marketplace-cli'),
        }),
      })
    );
  });

  it('should not include Authorization by default', async () => {
    (global.fetch as any).mockResolvedValue(
      new Response(JSON.stringify({}), { status: 200 })
    );

    await get('/api/public');

    const callArgs = (global.fetch as any).mock.calls[0][1];
    expect(callArgs.headers.Authorization).toBeUndefined();
  });

  it('should include Authorization when auth=true', async () => {
    process.env.SWARMS_API_KEY = 'test-key';
    (global.fetch as any).mockResolvedValue(
      new Response(JSON.stringify({}), { status: 200 })
    );

    await get('/api/private', { auth: true });

    const callArgs = (global.fetch as any).mock.calls[0][1];
    expect(callArgs.headers.Authorization).toBe('Bearer test-key');
  });

  it('should throw ApiError 401 when auth=true and key missing', async () => {
    delete process.env.SWARMS_API_KEY;

    try {
      await get('/api/test', { auth: true });
      expect.fail('Should have thrown ApiError');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).status).toBe(401);
    }
  });

  it('should throw ApiError on network error', async () => {
    (global.fetch as any).mockRejectedValue(new Error('Connection refused'));

    try {
      await get('/api/test');
      expect.fail('Should have thrown ApiError');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).status).toBe(0);
      expect((err as ApiError).message).toContain('Network error');
    }
  });

  it('should parse JSON response', async () => {
    const data = { items: [1, 2, 3] };
    (global.fetch as any).mockResolvedValue(
      new Response(JSON.stringify(data), { status: 200 })
    );

    const result = await get('/api/items');
    expect(result).toEqual(data);
  });
});
