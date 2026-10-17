import { RepoMeta, RawPackageJson } from '@/types';

export interface ParsedRepoTarget {
  owner: string;
  repo: string;
  path?: string;
  branch?: string;
}

interface GitHubRepository {
  name: string;
  full_name: string;
  default_branch?: string;
}

function createGitHubHeaders(customToken?: string): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'Upcheck-Dependency-Scanner/1.0',
  };

  if (customToken) {
    headers.Authorization = `Bearer ${customToken}`;
  }

  return headers;
}

// A bare GitHub handle is intentionally distinct from the owner/repo shorthand.
export function parseGitHubOwner(input: string): string | null {
  const trimmed = input.trim();
  return /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/.test(trimmed)
    ? trimmed
    : null;
}

// Fetch every public repository owned by a GitHub user or organization.
// Authenticated requests also benefit from the caller's higher GitHub rate limit.
export async function fetchGitHubOwnerRepos(
  owner: string,
  customToken?: string
): Promise<ParsedRepoTarget[]> {
  const headers = createGitHubHeaders(customToken);
  const repositories: GitHubRepository[] = [];
  let endpoint = `https://api.github.com/users/${encodeURIComponent(owner)}/repos?type=owner`;
  let requestHeaders = headers;

  // When the supplied token belongs to the requested user, use the authenticated
  // endpoint so private repositories are included as well.
  if (customToken) {
    const viewerResponse = await fetch('https://api.github.com/user', { headers });
    if (viewerResponse.ok) {
      const viewer = (await viewerResponse.json()) as { login?: string };
      if (viewer.login?.toLowerCase() === owner.toLowerCase()) {
        endpoint = 'https://api.github.com/user/repos?affiliation=owner&visibility=all';
      }
    } else {
      // An expired or malformed saved token must not prevent scans of public
      // repositories. Fall back to GitHub's unauthenticated public endpoint.
      requestHeaders = createGitHubHeaders();
    }
  }

  for (let page = 1; ; page++) {
    const response = await fetch(
      `${endpoint}&sort=updated&direction=desc&per_page=100&page=${page}`,
      { headers: requestHeaders }
    );

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`GitHub user or organization "${owner}" was not found.`);
      }
      if (response.status === 401 || response.status === 403 || response.status === 429) {
        const remaining = response.headers.get('x-ratelimit-remaining');
        const reset = response.headers.get('x-ratelimit-reset');
        if (remaining === '0') {
          const resetAt = reset ? new Date(Number(reset) * 1000).toLocaleTimeString() : undefined;
          throw new Error(`GitHub's API rate limit has been reached${resetAt ? `; it resets around ${resetAt}.` : '.'} Add a valid token to continue.`);
        }
        const responseBody = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(responseBody?.message || 'GitHub rejected the repository-list request. Check that your token has repository Metadata read access.');
      }
      throw new Error(`GitHub could not list repositories for "${owner}" (${response.status}).`);
    }

    const pageRepositories = (await response.json()) as GitHubRepository[];
    repositories.push(...pageRepositories);
    if (pageRepositories.length < 100) break;
  }

  return repositories.map((repository) => ({
    owner,
    repo: repository.name,
    branch: repository.default_branch,
  }));
}

// Parses arbitrary GitHub URL or "owner/repo" string
export function parseGitHubUrl(input: string): ParsedRepoTarget | null {
  if (!input) return null;
  const trimmed = input.trim();

  // Pattern 1: https://github.com/owner/repo or https://github.com/owner/repo/tree/branch/subpath
  const urlMatch = trimmed.match(
    /(?:https?:\/\/)?(?:www\.)?github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)(?:\/(?:tree|blob)\/([^/]+)(?:\/(.+))?)?/i
  );

  if (urlMatch) {
    const owner = urlMatch[1];
    let repo = urlMatch[2];
    if (repo && repo.endsWith('.git')) {
      repo = repo.replace(/\.git$/, '');
    }
    const branch = urlMatch[3];
    let path = urlMatch[4];

    if (path && !path.endsWith('package.json')) {
      path = path.replace(/\/$/, '') + '/package.json';
    }

    if (owner && repo) {
      return { owner, repo, branch, path };
    }
  }

  // Pattern 2: owner/repo
  const simpleMatch = trimmed.match(/^([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)$/);
  if (simpleMatch) {
    const owner = simpleMatch[1];
    let repo = simpleMatch[2];
    if (repo && repo.endsWith('.git')) {
      repo = repo.replace(/\.git$/, '');
    }
    if (owner && repo) {
      return { owner, repo };
    }
  }

  return null;
}

// Fetch package.json and repo metadata from GitHub
export async function fetchGitHubRepoData(
  target: ParsedRepoTarget,
  customToken?: string
): Promise<{
  packageJson: RawPackageJson;
  repoMeta: RepoMeta;
}> {
  const headers = createGitHubHeaders(customToken);

  // 1. Fetch Repository Metadata
  let repoMeta: RepoMeta = {
    owner: target.owner,
    repo: target.repo,
    fullName: `${target.owner}/${target.repo}`,
  };

  let defaultBranch = target.branch || 'main';

  try {
    const repoRes = await fetch(`https://api.github.com/repos/${target.owner}/${target.repo}`, {
      headers,
    });

    if (repoRes.ok) {
      const data = await repoRes.json();
      defaultBranch = target.branch || data.default_branch || 'main';
      repoMeta = {
        owner: target.owner,
        repo: target.repo,
        fullName: data.full_name || `${target.owner}/${target.repo}`,
        defaultBranch,
        description: data.description,
        stars: data.stargazers_count,
        forks: data.forks_count,
        openIssues: data.open_issues_count,
        updatedAt: data.updated_at,
      };
    } else if (repoRes.status === 404) {
      throw new Error(`GitHub repository "${target.owner}/${target.repo}" not found or is private.`);
    }
  } catch (err: any) {
    if (err.message && err.message.includes('not found')) {
      throw err;
    }
    console.warn('Could not fetch repo metadata, proceeding with basic info:', err);
  }

  repoMeta.defaultBranch = defaultBranch;
  const filePath = target.path || 'package.json';

  // 2. Fetch package.json via GitHub REST contents API
  let packageJsonContent: string | null = null;
  let contentsStatus: number | null = null;
  let contentsConnectionFailed = false;

  try {
    const contentsUrl = `https://api.github.com/repos/${target.owner}/${target.repo}/contents/${filePath}${
      target.branch ? `?ref=${encodeURIComponent(target.branch)}` : ''
    }`;
    const fileRes = await fetch(contentsUrl, { headers });
    contentsStatus = fileRes.status;

    if (fileRes.ok) {
      const fileData = await fileRes.json();
      if (fileData.content && fileData.encoding === 'base64') {
        packageJsonContent = Buffer.from(fileData.content, 'base64').toString('utf-8');
      } else if (fileData.download_url) {
        const rawRes = await fetch(fileData.download_url);
        if (rawRes.ok) {
          packageJsonContent = await rawRes.text();
        }
      }
    }
  } catch (err) {
    contentsConnectionFailed = true;
    console.warn('GitHub API contents endpoint failed, attempting raw fallback:', err);
  }

  // 3. Fallback: Raw GitHub UserContent (reliable when API is rate-limited)
  if (!packageJsonContent) {
    const candidateBranches = [target.branch, defaultBranch, 'main', 'master'].filter(
      Boolean
    ) as string[];
    const uniqueBranches = Array.from(new Set(candidateBranches));

    let rawConnectionFailed = false;
    let rawResponded = false;
    for (const b of uniqueBranches) {
      try {
        const rawUrl = `https://raw.githubusercontent.com/${target.owner}/${target.repo}/${b}/${filePath}`;
        const rawRes = await fetch(rawUrl);
        rawResponded = true;
        if (rawRes.ok) {
          packageJsonContent = await rawRes.text();
          break;
        }
      } catch {
        rawConnectionFailed = true;
      }
    }

    if (!packageJsonContent) {
      if (contentsStatus === 401 || contentsStatus === 403 || contentsStatus === 429) {
        throw new Error('GitHub denied the scan request. Check your GitHub token or API rate limit, then try again.');
      }
      if (contentsConnectionFailed && rawConnectionFailed && !rawResponded) {
        throw new Error('Upcheck cannot connect to GitHub from the analysis server. Check the server’s network access and try again.');
      }
      if (contentsStatus !== null && contentsStatus >= 500 && !rawResponded) {
        throw new Error('GitHub is temporarily unavailable. Please retry the scan in a moment.');
      }
    }
  }

  if (!packageJsonContent) {
    throw new Error(
      `Could not find "${filePath}" in ${target.owner}/${target.repo}. If the manifest is in a subfolder, paste the GitHub URL for that folder.`
    );
  }

  let parsed: RawPackageJson;
  try {
    parsed = JSON.parse(packageJsonContent);
  } catch (err) {
    throw new Error(`Failed to parse "${filePath}" as valid JSON.`);
  }

  return {
    packageJson: parsed,
    repoMeta,
  };
}
