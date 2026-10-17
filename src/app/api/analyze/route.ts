import { NextRequest, NextResponse } from 'next/server';
import { ParsedRepoTarget, parseGitHubUrl, parseGitHubOwner, fetchGitHubOwnerRepos, fetchGitHubRepoData } from '@/lib/github';
import { analyzeDependencies } from '@/lib/analyzer';
import { OwnerAnalysisResult, RawPackageJson, RepoMeta, RepoAnalysisResult, SkippedRepository } from '@/types';
import { checkRateLimit, getClientIdentifier } from '@/lib/rateLimit';

const MAX_CUSTOM_DEPENDENCIES = 500;

function isStringRecord(value: unknown): value is Record<string, string> {
  return typeof value === 'object' && value !== null && !Array.isArray(value) && Object.values(value).every((entry) => typeof entry === 'string');
}

function isValidPackageManifest(value: unknown): value is RawPackageJson {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const manifest = value as Record<string, unknown>;
  const dependencyGroups = ['dependencies', 'devDependencies', 'peerDependencies']
    .map((key) => manifest[key])
    .filter((group): group is Record<string, string> => isStringRecord(group));
  const dependencyCount = dependencyGroups.reduce((count, group) => count + Object.keys(group).length, 0);
  return dependencyGroups.length > 0 && dependencyCount > 0 && dependencyCount <= MAX_CUSTOM_DEPENDENCIES;
}

async function scanRepositoryTargets(
  owner: string,
  targets: ParsedRepoTarget[],
  githubToken?: string
): Promise<OwnerAnalysisResult> {
  const results: RepoAnalysisResult[] = [];
  const skipped: SkippedRepository[] = [];
  const queue = [...targets];

  // Each repository scan includes NPM and OSV requests. Keep this intentionally small
  // so an account-wide scan remains useful without overwhelming upstream APIs.
  await Promise.all(
    Array.from({ length: Math.min(3, queue.length) }, async () => {
      while (queue.length > 0) {
        const target = queue.shift();
        if (!target) return;

        try {
          const { packageJson, repoMeta } = await fetchGitHubRepoData(target, githubToken);
          const dependencyCount =
            Object.keys(packageJson.dependencies || {}).length +
            Object.keys(packageJson.devDependencies || {}).length +
            Object.keys(packageJson.peerDependencies || {}).length;

          if (dependencyCount === 0) {
            skipped.push({
              fullName: repoMeta.fullName,
              reason: 'No dependencies were declared in the root package.json.',
            });
            continue;
          }

          results.push(await analyzeDependencies(packageJson, repoMeta));
        } catch (error) {
          skipped.push({
            fullName: `${target.owner}/${target.repo}`,
            reason: error instanceof Error ? error.message : 'The repository could not be scanned.',
          });
        }
      }
    })
  );

  results.sort((left, right) => left.repoInfo.fullName.localeCompare(right.repoInfo.fullName));
  skipped.sort((left, right) => left.fullName.localeCompare(right.fullName));

  return { owner, results, skipped, analyzedAt: new Date().toISOString() };
}

async function scanOwnerRepositories(owner: string, githubToken?: string): Promise<OwnerAnalysisResult> {
  const targets = await fetchGitHubOwnerRepos(owner, githubToken);
  if (targets.length === 0) {
    throw new Error(`No repositories were found for "${owner}".`);
  }
  return scanRepositoryTargets(owner, targets, githubToken);
}

export async function POST(req: NextRequest) {
  const rateLimit = checkRateLimit(`analyze:${getClientIdentifier(req.headers)}`, 10, 10 * 60 * 1000);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { success: false, error: 'Too many analysis requests. Please try again shortly.' },
      { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) } }
    );
  }

  try {
    const body: unknown = await req.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ success: false, error: 'Request body must be a JSON object.' }, { status: 400 });
    }
    const { repoUrl, repoUrls, githubToken, customPackageJson, customRepoName } = body as Record<string, unknown>;
    const token = typeof githubToken === 'string' ? githubToken.trim() : undefined;
    if (token && token.length > 500) {
      return NextResponse.json({ success: false, error: 'GitHub token is invalid.' }, { status: 400 });
    }

    // 1. Direct package.json paste mode
    if (customPackageJson !== undefined) {
      if (!isValidPackageManifest(customPackageJson)) {
        return NextResponse.json(
          { success: false, error: `package.json must contain 1 to ${MAX_CUSTOM_DEPENDENCIES} string dependency entries.` },
          { status: 400 }
        );
      }
      const repoName = typeof customRepoName === 'string' && customRepoName.trim().length <= 120
        ? customRepoName.trim()
        : 'pasted-package.json';
      const repoMeta: RepoMeta = {
        owner: 'custom',
        repo: repoName,
        fullName: repoName === 'pasted-package.json' ? 'Custom / Uploaded package.json' : repoName,
        description: 'Locally pasted or uploaded package manifest',
        isCustomJson: true,
      };

      const result = await analyzeDependencies(customPackageJson as RawPackageJson, repoMeta);
      return NextResponse.json({ success: true, mode: 'repository', data: result });
    }

    // 2. Explicitly selected repositories from the account picker.
    if (Array.isArray(repoUrls)) {
        const targets = repoUrls
        .filter((repo: unknown): repo is string => typeof repo === 'string')
        .map(parseGitHubUrl)
        .filter((target): target is ParsedRepoTarget => target !== null);
      const hasToken = Boolean(token);

      if (targets.length === 0) {
        return NextResponse.json({ success: false, error: 'Select at least one valid repository.' }, { status: 400 });
      }
      if (!hasToken && targets.length > 10) {
        return NextResponse.json(
          { success: false, error: 'Without a GitHub token, you can scan up to 10 repositories at once.' },
          { status: 400 }
        );
      }

      const data = await scanRepositoryTargets(targets[0].owner, targets, token);
      if (data.results.length === 0) {
        return NextResponse.json({ success: false, error: 'None of the selected repositories could be scanned.' }, { status: 400 });
      }
      return NextResponse.json({ success: true, mode: 'owner', data });
    }

    // 3. GitHub repository URL mode
    if (!repoUrl || typeof repoUrl !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Please provide a valid GitHub repository URL or owner/repo identifier.' },
        { status: 400 }
      );
    }

    const owner = parseGitHubOwner(repoUrl);
    if (owner) {
      const data = await scanOwnerRepositories(owner, token);
      if (data.results.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: `No JavaScript projects with dependencies could be scanned for "${owner}".`,
            skipped: data.skipped,
          },
          { status: 400 }
        );
      }
      return NextResponse.json({ success: true, mode: 'owner', data });
    }

    const parsedTarget = parseGitHubUrl(repoUrl);
    if (!parsedTarget) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Invalid GitHub URL format. Use format "owner/repo" (e.g. facebook/react) or full URL (e.g. https://github.com/vercel/next.js).',
        },
        { status: 400 }
      );
    }

    const { packageJson, repoMeta } = await fetchGitHubRepoData(parsedTarget, token);

    if (
      (!packageJson.dependencies || Object.keys(packageJson.dependencies).length === 0) &&
      (!packageJson.devDependencies || Object.keys(packageJson.devDependencies).length === 0)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: `The repository ${repoMeta.fullName} does not have any dependencies or devDependencies in its package.json.`,
        },
        { status: 400 }
      );
    }

    const result = await analyzeDependencies(packageJson, repoMeta);
    return NextResponse.json({ success: true, mode: 'repository', data: result });
  } catch (err: any) {
    console.error('API Error /api/analyze:', err);
    return NextResponse.json(
      {
        success: false,
        error: 'An unexpected error occurred while analyzing the repository.',
      },
      { status: 500 }
    );
  }
}
