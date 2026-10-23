import { spyOnFetch } from './fixtures';
import { afterEach, expect, test } from 'bun:test';
import { fetchGitHubOwnerRepos, fetchGitHubRepoData } from '../src/lib/github';
import { parseGitHubUrl } from '../src/lib/repositoryTarget';

const fetchMock = spyOnFetch();
afterEach(() => fetchMock.mockReset());

test('resolves slash-containing branch names and never substitutes another branch', async () => {
  let contentsUrl = '';
  fetchMock.mockImplementation(async (input) => {
    const url = String(input);
    if (url.includes('matching-refs')) return Response.json([{ ref: 'refs/heads/feature/fix' }]);
    if (url.includes('/contents/')) {
      contentsUrl = url;
      return Response.json({ encoding: 'base64', content: Buffer.from(JSON.stringify({ dependencies: { example: '1.0.0' } })).toString('base64') });
    }
    return Response.json({ full_name: 'owner/repo', default_branch: 'main' });
  });
  const { repoMeta } = await fetchGitHubRepoData(parseGitHubUrl('https://github.com/owner/repo/tree/feature/fix/packages/app')!);
  expect(contentsUrl).toContain('/contents/packages/app/package.json?ref=feature%2Ffix');
  expect(repoMeta.target?.branch).toBe('feature/fix');
  expect(repoMeta.defaultBranch).toBe('main');
  fetchMock.mockImplementation(async (input) => String(input).includes('/contents/') ? new Response('', { status: 404 }) : Response.json({ full_name: 'owner/repo', default_branch: 'main' }));
  await expect(fetchGitHubRepoData({ owner: 'owner', repo: 'repo', branch: 'missing' })).rejects.toThrow('404');
  expect(fetchMock.mock.calls.some(([input]) => String(input).includes('raw.githubusercontent'))).toBe(false);
});

test('validates manifests fetched from GitHub', async () => {
  fetchMock.mockImplementation(async (input) => String(input).includes('/contents/')
    ? Response.json({ encoding: 'base64', content: Buffer.from('{"dependencies":{"bad":42}}').toString('base64') })
    : Response.json({ full_name: 'owner/repo', default_branch: 'main' }));
  await expect(fetchGitHubRepoData({ owner: 'owner', repo: 'repo' })).rejects.toThrow('valid dependencies');
});

test('owner scans enforce the same hard repository budget', async () => {
  fetchMock.mockImplementation(async () => Response.json(Array.from({ length: 21 }, (_, i) => ({ name: `repo${i}` }))));
  await expect(fetchGitHubOwnerRepos('owner', undefined, undefined, 20)).rejects.toThrow('20-repository');
});
