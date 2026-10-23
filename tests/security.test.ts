import { spyOnFetch } from './fixtures';
import { afterEach, expect, test } from 'bun:test';
import { NextRequest } from 'next/server';
import { POST } from '../src/app/api/analyze/route';
import { parseRepositoryTargets } from '../src/lib/scanLimits';
import { acquireScanSlot, checkRateLimit, getClientIdentifier } from '../src/lib/rateLimit';
import { readLimitedText, readRequestJson } from '../src/lib/http';

const fetchMock = spyOnFetch();
const trusted = process.env.UPCHECK_TRUST_PROXY_HEADERS;
afterEach(() => {
  fetchMock.mockReset();
  if (trusted === undefined) delete process.env.UPCHECK_TRUST_PROXY_HEADERS;
  else process.env.UPCHECK_TRUST_PROXY_HEADERS = trusted;
});

test('deduplicates targets but rejects malformed entries and token-based limit bypass', () => {
  expect(parseRepositoryTargets(['owner/repo', 'https://github.com/OWNER/REPO'], false)).toHaveLength(1);
  expect(() => parseRepositoryTargets(['owner/repo', 123], true)).toThrow();
  expect(() => parseRepositoryTargets(Array.from({ length: 21 }, (_, i) => `owner/repo${i}`), true)).toThrow('20');
  expect(() => parseRepositoryTargets(Array.from({ length: 11 }, (_, i) => `owner/repo${i}`), false)).toThrow('10');
});

test('does not trust arbitrary forwarding headers by default', () => {
  delete process.env.UPCHECK_TRUST_PROXY_HEADERS;
  expect(getClientIdentifier(new Headers({ 'x-forwarded-for': 'spoofed' }))).toBe('shared');
  const key = `rate-test-${crypto.randomUUID()}`;
  expect(checkRateLimit(key, 1, 60_000).allowed).toBe(true);
  expect(checkRateLimit(key, 1, 60_000).allowed).toBe(false);
});

test('limits simultaneous scans and releases capacity exactly once', () => {
  const first = acquireScanSlot()!;
  const second = acquireScanSlot()!;
  expect(acquireScanSlot()).toBeNull();
  first(); first();
  const next = acquireScanSlot();
  expect(next).not.toBeNull();
  expect(acquireScanSlot()).toBeNull();
  next!(); second();
});

test('limits request bytes even without content-length and rejects invalid JSON', async () => {
  await expect(readLimitedText(new Request('https://example.test', { method: 'POST', body: '123456' }), 5)).rejects.toThrow('too large');
  await expect(readRequestJson(new Request('https://example.test', { method: 'POST', body: '{' }))).rejects.toThrow('valid JSON');
});

test('cancels a stalled body when its deadline expires', async () => {
  const controller = new AbortController();
  const response = new Response(new ReadableStream({ start() {} }));
  const pending = readLimitedText(response, 10, controller.signal);
  controller.abort(new Error('deadline'));
  await expect(pending).rejects.toThrow('deadline');
});

test('API returns 400 for malformed JSON, mixed invalid groups, and excessive batches before doing network work', async () => {
  fetchMock.mockImplementation(async () => { throw new Error('Network must not be used'); });
  for (const body of ['{', JSON.stringify({ customPackageJson: { dependencies: { valid: '1.0.0' }, devDependencies: { invalid: 42 } } }),
    JSON.stringify({ githubToken: 'arbitrary', repoUrls: Array.from({ length: 21 }, (_, i) => `owner/repo${i}`) })]) {
    const response = await POST(new NextRequest('https://upcheck.test/api/analyze', { method: 'POST', body }));
    expect(response.status).toBe(400);
  }
  expect(fetchMock).not.toHaveBeenCalled();
});
