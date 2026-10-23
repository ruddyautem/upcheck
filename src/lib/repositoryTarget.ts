import type { RepoMeta, RepoTarget } from '@/types';

export function parseGitHubOwner(input: string): string | null {
  return /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/.test(input.trim()) ? input.trim() : null;
}

export function parseGitHubUrl(input: string): RepoTarget | null {
  const value = input.trim();
  if (!value || value.length > 2048) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(value) ? value : `https://github.com/${value.replace(/^(?:www\.)?github\.com\//i, '')}`);
    if (!['https:', 'http:'].includes(url.protocol) || !['github.com', 'www.github.com'].includes(url.hostname) || url.username || url.password || url.port) return null;
    const parts = url.pathname.replace(/\/$/, '').split('/').slice(1).map(decodeURIComponent);
    const [owner, rawRepo, mode, branch, ...rest] = parts;
    const repo = rawRepo?.replace(/\.git$/, '');
    if (!owner || !repo || !/^[\w.-]+$/.test(owner) || !/^[\w.-]+$/.test(repo) || [owner, repo].some((s) => s === '.' || s === '..')) return null;
    if (mode && (!['tree', 'blob'].includes(mode) || !branch)) return null;
    let path = url.searchParams.get('path') || (mode ? rest.join('/') : 'package.json');
    if (!path || path.endsWith('/')) path += 'package.json';
    else if (!path.endsWith('package.json')) path += '/package.json';
    if (path.split('/').some((part) => !part || part === '.' || part === '..') || /[\x00-\x1f\\]/.test(path)) return null;
    const ref = url.searchParams.get('ref') || branch;
    if (ref && (ref.length > 200 || /[\x00-\x20?&#\\]/.test(ref))) return null;
    return { owner, repo, branch: ref, path, ...(mode && !url.searchParams.has('ref') ? { resolveBranch: true } : {}) };
  } catch { return null; }
}

export function repositoryTargetKey(target: RepoTarget) {
  return JSON.stringify([target.owner.toLowerCase(), target.repo.toLowerCase(), target.branch || '', target.path || 'package.json']);
}

export function repositoryTargetUrl(target: RepoTarget) {
  const query = new URLSearchParams();
  if (target.branch) query.set('ref', target.branch);
  if (target.path && target.path !== 'package.json') query.set('path', target.path);
  return `https://github.com/${target.owner}/${target.repo}${query.size ? `?${query}` : ''}`;
}

export function getRepositoryTarget(meta: RepoMeta) {
  return meta.target || { owner: meta.owner, repo: meta.repo, path: 'package.json' };
}
