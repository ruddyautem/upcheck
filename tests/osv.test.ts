import { spyOnFetch } from './fixtures';
import { afterEach, expect, test } from 'bun:test';
import { getAffectedRange, queryOSVBatch } from '../src/lib/osv';

const fetchMock = spyOnFetch();
afterEach(() => fetchMock.mockReset());

test('fetches all details beyond the old per-package and global caps with bounded concurrency', async () => {
  let active = 0;
  let maxActive = 0;
  let count = 0;
  fetchMock.mockImplementation(async (input) => {
    if (String(input).includes('querybatch')) return Response.json({ results: [{ vulns: Array.from({ length: 45 }, (_, i) => ({ id: `GHSA-cap-${i}` })) }] });
    const id = String(input).split('/').at(-1);
    active++; count++; maxActive = Math.max(maxActive, active);
    await new Promise((resolve) => setTimeout(resolve, 1));
    active--;
    return Response.json({ id, database_specific: { severity: 'CRITICAL' } });
  });
  const result = await queryOSVBatch([{ name: 'example', version: '1.0.0' }]);
  expect(count).toBe(45);
  expect(maxActive).toBeLessThanOrEqual(6);
  expect(result.get('example@1.0.0')).toHaveLength(45);
  expect(result.get('example@1.0.0')!.every((item) => item.severity === 'CRITICAL')).toBe(true);
});

test('follows per-query pagination and rejects incomplete responses', async () => {
  let calls = 0;
  fetchMock.mockImplementation(async (_input, init) => {
    calls++;
    const payload = JSON.parse(String(init?.body));
    if (calls === 1) return Response.json({ results: [{ next_page_token: 'page2' }, {}] });
    expect(payload.queries).toHaveLength(1);
    expect(payload.queries[0].page_token).toBe('page2');
    return Response.json({ results: [{}] });
  });
  await queryOSVBatch([{ name: 'a', version: '1.0.0' }, { name: 'b', version: '1.0.0' }]);
  expect(calls).toBe(2);
  fetchMock.mockImplementation(async () => Response.json({ results: [] }));
  await expect(queryOSVBatch([{ name: 'a', version: '1.0.0' }])).rejects.toThrow('Incomplete');
});

test('fails explicitly if advisory detail lookup fails', async () => {
  fetchMock.mockImplementation(async (input) => String(input).includes('querybatch')
    ? Response.json({ results: [{ vulns: [{ id: 'GHSA-missing-detail' }] }] }) : new Response('', { status: 503 }));
  await expect(queryOSVBatch([{ name: 'example', version: '1.0.0' }])).rejects.toThrow();
});

test('matches fixes to the queried package and vulnerable release interval', () => {
  const detail = { id: 'GHSA-interval', affected: [
    { package: { name: 'example', ecosystem: 'npm' }, ranges: [{ type: 'SEMVER', events: [
      { introduced: '0' }, { fixed: '1.0.5' }, { introduced: '2.0.0' }, { fixed: '2.0.3' }, { introduced: '3.0.0' },
    ] }] },
    { package: { name: 'other', ecosystem: 'npm' }, ranges: [{ type: 'SEMVER', events: [{ introduced: '0' }, { fixed: '99.0.0' }] }] },
  ] };
  expect(getAffectedRange(detail, 'example', '1.0.1').fixedIn).toBe('1.0.5');
  expect(getAffectedRange(detail, 'example', '2.0.1').fixedIn).toBe('2.0.3');
  expect(getAffectedRange(detail, 'example', '3.0.1').fixedIn).toBeUndefined();
  expect(getAffectedRange(detail, 'example', '1.0.5').fixedIn).toBeUndefined();
});
