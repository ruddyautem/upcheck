import type { RepoMeta, RawPackageJson, RepoTarget } from '@/types';
import { fetchJson, RequestError } from './http';
import { isValidPackageManifest } from './manifest';
export { parseGitHubOwner, parseGitHubUrl } from './repositoryTarget';
export type ParsedRepoTarget = RepoTarget;

interface GitHubRepository {
  name: string;
  full_name: string;
  default_branch?: string;
  description?: string;
  stargazers_count?: number;
  forks_count?: number;
  open_issues_count?: number;
  updated_at?: string;
}

function createGitHubHeaders(token?: string) {
  return { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'Upcheck-Dependency-Scanner/1.0', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

export const MAX_DISCOVERED_REPOSITORIES = 500;

export async function fetchGitHubOwnerRepos(owner: string, token?: string, signal?: AbortSignal, limit = MAX_DISCOVERED_REPOSITORIES): Promise<RepoTarget[]> {
  const headers = createGitHubHeaders(token);
  let endpoint = `https://api.github.com/users/${encodeURIComponent(owner)}/repos?type=owner`;
  if (token) {
    const viewer = await fetchJson<{ login: string }>('https://api.github.com/user', { headers, signal });
    if (typeof viewer.login !== 'string') throw new Error('Invalid GitHub account response.');
    if (viewer.login.toLowerCase() === owner.toLowerCase()) endpoint = 'https://api.github.com/user/repos?affiliation=owner&visibility=all';
  }
  const repositories: RepoTarget[] = [];
  const maximum = Math.min(limit, MAX_DISCOVERED_REPOSITORIES);
  for (let page = 1; repositories.length <= maximum; page++) {
    signal?.throwIfAborted();
    const data = await fetchJson<GitHubRepository[]>(`${endpoint}&per_page=100&sort=updated&page=${page}`, { headers, signal });
    if (!Array.isArray(data) || data.some((repo) => !repo || typeof repo.name !== 'string')) throw new Error('Invalid repository list response.');
    repositories.push(...data.map((repo) => ({ owner, repo: repo.name, branch: repo.default_branch, path: 'package.json' })));
    if (repositories.length > maximum) throw new RequestError(`This account exceeds the ${maximum}-repository limit. Select a smaller set of repositories.`, 400);
    if (data.length < 100) return repositories;
  }
  throw new RequestError(`This account exceeds the ${maximum}-repository limit. Select a smaller set of repositories.`, 400);
}

export async function fetchGitHubRepoData(target: RepoTarget, token?: string, signal?: AbortSignal): Promise<{ packageJson: RawPackageJson; repoMeta: RepoMeta }> {
  const headers = createGitHubHeaders(token);
  const base = `https://api.github.com/repos/${encodeURIComponent(target.owner)}/${encodeURIComponent(target.repo)}`;
  const data = await fetchJson<GitHubRepository>(base, { headers, signal });
  let branch = target.branch || data.default_branch;
  let filePath = target.path || 'package.json';
  if (!branch || typeof data.full_name !== 'string') throw new Error('Invalid GitHub repository metadata.');
  // Resolve slash-containing branch names in ambiguous GitHub tree URLs.
  if (target.resolveBranch && target.branch && filePath !== 'package.json' && !target.branch.includes('/')) {
    const refs = await fetchJson<Array<{ ref: string }>>(`${base}/git/matching-refs/heads/${encodeURIComponent(target.branch)}`, { headers, signal });
    const combined = `${target.branch}/${filePath}`;
    if (!Array.isArray(refs) || refs.some((ref) => typeof ref.ref !== 'string')) throw new Error('Invalid GitHub branch response.');
    const match = refs.map((ref) => ref.ref.replace(/^refs\/heads\//, '')).filter((ref) => combined.startsWith(`${ref}/`)).sort((a, b) => b.length - a.length)[0];
    if (match) { branch = match; filePath = combined.slice(match.length + 1); }
  }
  const encodedPath = filePath.split('/').map(encodeURIComponent).join('/');
  const manifest = await fetchJson<{ content?: string; encoding?: string }>(`${base}/contents/${encodedPath}?ref=${encodeURIComponent(branch)}`, { headers, signal }, 512 * 1024);
  if (manifest.encoding !== 'base64' || typeof manifest.content !== 'string') throw new RequestError('The package manifest is missing or too large.', 400);
  let parsed: unknown;
  try { parsed = JSON.parse(Buffer.from(manifest.content, 'base64').toString('utf8')); }
  catch { throw new RequestError('The package manifest is not valid JSON.', 400); }
  if (!isValidPackageManifest(parsed)) throw new RequestError('package.json must declare 1 to 500 valid dependencies.', 400);
  return {
    packageJson: parsed,
    repoMeta: { owner: target.owner, repo: target.repo, fullName: data.full_name, defaultBranch: data.default_branch,
      target: { ...target, path: filePath, branch, resolveBranch: false }, description: data.description,
      stars: data.stargazers_count, forks: data.forks_count, openIssues: data.open_issues_count, updatedAt: data.updated_at },
  };
}
