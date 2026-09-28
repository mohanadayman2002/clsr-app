import { ClsrError } from '../errors';
import { HttpClsrApi, normalizeHost } from '../http';

function mockFetch(status: number, body: unknown) {
  const fn = jest.fn(async () => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }));
  globalThis.fetch = fn as unknown as typeof fetch;
  return fn;
}

const headersOf = (fn: jest.Mock) => (fn.mock.calls[0] as unknown as [string, RequestInit])[1].headers as Record<string, string>;

describe('normalizeHost', () => {
  it.each([
    ['10.37.122.125', 'http://10.37.122.125:8765'],
    ['10.37.122.125:8765', 'http://10.37.122.125:8765'],
    ['http://10.37.122.125:8765/', 'http://10.37.122.125:8765'],
    ['  studio.local:9000 ', 'http://studio.local:9000'],
    ['https://clsr.example.com', 'https://clsr.example.com:8765'],
    ['', ''],
  ])('%s → %s', (input, expected) => {
    expect(normalizeHost(input)).toBe(expected);
  });
});

describe('HttpClsrApi', () => {
  it('sends X-CLSR-Token on every request when a token is set', async () => {
    const fn = mockFetch(200, { coohom: true, ollama: true, blender: true });
    await new HttpClsrApi('http://h:8765', 's3cret').health();
    expect((fn.mock.calls[0] as unknown as [string])[0]).toBe('http://h:8765/api/health');
    expect(headersOf(fn)['X-CLSR-Token']).toBe('s3cret');
  });

  it('keeps the token alongside JSON headers on POST', async () => {
    const fn = mockFetch(200, { job: { id: 'j1' } });
    await new HttpClsrApi('http://h:8765', 's3cret').batch(27, [], 'draft', '03_living_and_dining_NW');
    const headers = headersOf(fn);
    expect(headers['X-CLSR-Token']).toBe('s3cret');
    expect(headers['Content-Type']).toBe('application/json');
  });

  it('sends no token header when none is set', async () => {
    const fn = mockFetch(200, []);
    await new HttpClsrApi('http://h:8765').projects();
    expect(headersOf(fn)['X-CLSR-Token']).toBeUndefined();
  });

  it('adds the token to image sources', () => {
    expect(new HttpClsrApi('http://h:8765', 't').imageSource('/thumbs/a.png')).toEqual({
      uri: 'http://h:8765/thumbs/a.png',
      headers: { 'X-CLSR-Token': 't' },
    });
    expect(new HttpClsrApi('http://h:8765').imageSource('/thumbs/a.png')).toEqual({ uri: 'http://h:8765/thumbs/a.png' });
  });

  it.each([
    [401, 'unauthorized'],
    [409, 'busy'],
    [404, 'not_found'],
    [400, 'bad_request'],
    [500, 'server'],
  ])('maps HTTP %i to %s and keeps the server message', async (status, kind) => {
    mockFetch(status, { error: 'nope' });
    const err = await new HttpClsrApi('http://h:8765').project(1).catch((e) => e);
    expect(err).toBeInstanceOf(ClsrError);
    expect(err.kind).toBe(kind);
    expect(err.message).toBe('nope');
  });

  it('reports network failures as unreachable', async () => {
    globalThis.fetch = jest.fn(async () => {
      throw new TypeError('Network request failed');
    }) as unknown as typeof fetch;
    const err = await new HttpClsrApi('http://h:8765').projects().catch((e) => e);
    expect(err.kind).toBe('unreachable');
  });
});
