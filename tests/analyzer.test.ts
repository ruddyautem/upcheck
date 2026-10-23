import { spyOnFetch } from './fixtures';
import { afterEach, describe, expect, test } from 'bun:test';
import { analyzeDependencies, cleanSemver, computeSemverDiff } from '../src/lib/analyzer';
import { isValidPackageManifest, resolvePackageSpec } from '../src/lib/manifest';

const repo = { owner: 'owner', repo: 'repo', fullName: 'owner/repo' };
const fetchMock = spyOnFetch();
afterEach(() => fetchMock.mockReset());

describe('versions and manifest validation', () => {
  test('does not recommend downgrades across version components', () => {
    for (const [current, latest] of [['2.0.0', '1.9.1'], ['1.9.0', '1.8.9'], ['2.1.0', '2.0.5']]) {
      expect(computeSemverDiff(current, latest).type).toBe('none');
    }
  });
  test('preserves prereleases and identifies prerelease major upgrades', () => {
    expect(cleanSemver('1.0.0-beta.1')).toBe('1.0.0-beta.1');
    expect(computeSemverDiff('1.0.0-beta.1', '1.0.0').type).toBe('prerelease');
    expect(computeSemverDiff('1.0.0', '2.0.0-beta.1').type).toBe('major');
  });
  test('resolves scoped aliases without pretending workspace sources are versions', () => {
    expect(resolvePackageSpec('alias', 'npm:@scope/real@^2.0.0')).toEqual({ registryName: '@scope/real', version: '2.0.0', source: 'range' });
    for (const spec of ['workspace:*', 'file:../lib', 'git+https://github.com/a/b#v1.0.0', 'latest']) expect(resolvePackageSpec('lib', spec)).toBeNull();
  });
  test('rejects every malformed group and validates names and total size', () => {
    expect(isValidPackageManifest({ dependencies: { valid: '1.0.0' }, devDependencies: { invalid: 42 } })).toBe(false);
    expect(isValidPackageManifest({ dependencies: { valid: '1.0.0' }, peerDependencies: [] })).toBe(false);
    expect(isValidPackageManifest({ dependencies: { 'bad; echo hi': '1.0.0' } })).toBe(false);
    expect(isValidPackageManifest({ peerDependencies: { react: '^19.0.0' } })).toBe(true);
    expect(isValidPackageManifest({ optionalDependencies: { native: '1.0.0' } })).toBe(true);
    expect(isValidPackageManifest({ dependencies: Object.fromEntries(Array.from({ length: 501 }, (_, i) => [`pkg${i}`, '1.0.0'])) })).toBe(false);
  });
});

test('partial npm failure is unverified, not up to date', async () => {
  fetchMock.mockImplementation(async (input, init) => {
    const url = String(input);
    if (url.includes('querybatch')) return Response.json({ results: JSON.parse(String(init?.body)).queries.map(() => ({})) });
    if (url.endsWith('/missing/latest')) return new Response('', { status: 503 });
    return Response.json({ version: '1.2.0' });
  });
  const result = await analyzeDependencies({ dependencies: { valid: '1.0.0', missing: '1.0.0' } }, repo);
  expect(result.packages.find((pkg) => pkg.name === 'missing')?.category).toBe('unknown');
  expect(result.summaryCounts.up_to_date).toBe(0);
  expect(result.isIncomplete).toBe(true);
});

test('queries aliases by registry identity and labels estimated ranges', async () => {
  let queried: unknown;
  fetchMock.mockImplementation(async (input, init) => {
    if (String(input).includes('querybatch')) {
      queried = JSON.parse(String(init?.body));
      return Response.json({ results: [{}] });
    }
    expect(String(input)).toEndWith('/real/latest');
    return Response.json({ version: '2.1.0' });
  });
  const result = await analyzeDependencies({ dependencies: { alias: 'npm:real@^2.0.0', workspace: 'workspace:*' } }, repo);
  expect(queried).toMatchObject({ queries: [{ package: { name: 'real', ecosystem: 'npm' }, version: '2.0.0' }] });
  expect(result.isEstimated).toBe(true);
  expect(result.packages.find((pkg) => pkg.name === 'workspace')?.category).toBe('unknown');
});

test('TypeScript 7 remains deferred even when categorized as a security update', async () => {
  fetchMock.mockImplementation(async (input) => {
    if (String(input).includes('querybatch')) return Response.json({ results: [{ vulns: [{ id: 'GHSA-typescript-hold' }] }] });
    if (String(input).includes('/vulns/')) return Response.json({ id: 'GHSA-typescript-hold', database_specific: { severity: 'HIGH' } });
    return Response.json({ version: '7.0.0' });
  });
  const result = await analyzeDependencies({ devDependencies: { typescript: '^6.0.3' } }, repo);
  expect(result.packages[0].category).toBe('critical');
  expect(result.packages[0].isUpdateDeferred).toBe(true);
});

test('retains duplicate dependency groups and original project configuration', async () => {
  fetchMock.mockImplementation(async (input) => String(input).includes('querybatch')
    ? Response.json({ results: [{}] }) : Response.json({ version: '19.1.0' }));
  const manifest = { type: 'module', scripts: { test: 'bun test' }, devDependencies: { react: '19.0.0' }, peerDependencies: { react: '^19.0.0' } };
  const result = await analyzeDependencies(manifest, repo);
  expect(result.originalManifest).toEqual(manifest);
  expect(result.packages[0].dependencyGroups).toEqual(['devDependencies', 'peerDependencies']);
});

test('checks every distinct version declared in multiple groups', async () => {
  let versions: string[] = [];
  fetchMock.mockImplementation(async (input, init) => {
    if (String(input).includes('querybatch')) {
      const queries = JSON.parse(String(init?.body)).queries as Array<{ version: string }>;
      versions = queries.map((query) => query.version);
      return Response.json({ results: queries.map(() => ({})) });
    }
    return Response.json({ version: '2.1.0' });
  });
  const result = await analyzeDependencies({ devDependencies: { example: '2.0.0' }, peerDependencies: { example: '^1.0.0' } }, repo);
  expect(versions.toSorted()).toEqual(['1.0.0', '2.0.0']);
  expect(result.packages[0].currentVersion).toBe('1.0.0');
  expect(result.isEstimated).toBe(true);
});
