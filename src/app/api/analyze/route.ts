import { NextRequest, NextResponse } from 'next/server';
import { fetchGitHubOwnerRepos, fetchGitHubRepoData } from '@/lib/github';
import { parseGitHubUrl, parseGitHubOwner, repositoryTargetKey } from '@/lib/repositoryTarget';
import { analyzeDependencies } from '@/lib/analyzer';
import type { OwnerAnalysisResult, RepoTarget, RepoAnalysisResult, SkippedRepository } from '@/types';
import { acquireScanSlot, checkRateLimit, getClientIdentifier } from '@/lib/rateLimit';
import { isValidPackageManifest } from '@/lib/manifest';
import { mapConcurrent, readRequestJson, RequestError } from '@/lib/http';
import { ANONYMOUS_SCAN_REPOSITORIES, MAX_SCAN_REPOSITORIES, parseRepositoryTargets } from '@/lib/scanLimits';

async function scanTargets(owner: string, targets: RepoTarget[], token: string | undefined, signal: AbortSignal): Promise<OwnerAnalysisResult> {
  const results: RepoAnalysisResult[] = [];
  const skipped: SkippedRepository[] = [];
  await mapConcurrent(targets, 2, async (target) => {
    signal.throwIfAborted();
    try {
      const { packageJson, repoMeta } = await fetchGitHubRepoData(target, token, signal);
      results.push(await analyzeDependencies(packageJson, repoMeta, signal));
    } catch (error) {
      signal.throwIfAborted();
      skipped.push({ fullName: `${target.owner}/${target.repo}`, reason: error instanceof RequestError && error.status === 400 ? error.message : 'The repository could not be verified. Check access and try again.' });
    }
  });
  results.sort((a, b) => repositoryTargetKey(a.repoInfo.target!).localeCompare(repositoryTargetKey(b.repoInfo.target!)));
  skipped.sort((a, b) => a.fullName.localeCompare(b.fullName));
  return { owner, results, skipped, analyzedAt: new Date().toISOString() };
}

export async function POST(req: NextRequest) {
  const rate = checkRateLimit(`analyze:${getClientIdentifier(req.headers)}`, 10, 10 * 60 * 1000);
  if (!rate.allowed) return NextResponse.json({ success: false, error: 'Too many analysis requests. Please try again shortly.' }, { status: 429, headers: { 'Retry-After': String(rate.retryAfterSeconds) } });
  const release = acquireScanSlot();
  if (!release) return NextResponse.json({ success: false, error: 'The scanner is busy. Please retry shortly.' }, { status: 429, headers: { 'Retry-After': '15' } });
  const controller = new AbortController();
  const signal = AbortSignal.any([req.signal, controller.signal, AbortSignal.timeout(90_000)]);
  try {
    const { repoUrl, repoUrls, githubToken, customPackageJson, customRepoName } = await readRequestJson(req, signal);
    if (githubToken !== undefined && (typeof githubToken !== 'string' || githubToken.length > 500 || /[\r\n]/.test(githubToken))) throw new RequestError('GitHub token is invalid.');
    const token = typeof githubToken === 'string' ? githubToken.trim() || undefined : undefined;
    if (customPackageJson !== undefined) {
      if (!isValidPackageManifest(customPackageJson)) throw new RequestError('package.json must declare 1 to 500 valid string dependencies.');
      const name = typeof customRepoName === 'string' && customRepoName.trim() && customRepoName.length <= 120 ? customRepoName.trim() : 'pasted-package.json';
      const data = await analyzeDependencies(customPackageJson, { owner: 'custom', repo: name, fullName: name, isCustomJson: true }, signal);
      return NextResponse.json({ success: true, mode: 'repository', data });
    }
    if (repoUrls !== undefined) {
      const targets = parseRepositoryTargets(repoUrls, Boolean(token));
      const data = await scanTargets(targets[0].owner, targets, token, signal);
      if (!data.results.length) throw new RequestError('None of the selected repositories could be verified. Check your token and repository manifests.');
      return NextResponse.json({ success: true, mode: 'owner', data });
    }
    if (typeof repoUrl !== 'string' || repoUrl.length > 2048) throw new RequestError('Provide a valid GitHub repository URL or owner/repo identifier.');
    const owner = parseGitHubOwner(repoUrl);
    if (owner) {
      const targets = await fetchGitHubOwnerRepos(owner, token, signal, token ? MAX_SCAN_REPOSITORIES : ANONYMOUS_SCAN_REPOSITORIES);
      if (!targets.length) throw new RequestError('No repositories were found for this account.');
      const data = await scanTargets(owner, targets, token, signal);
      if (!data.results.length) throw new RequestError('No repositories with valid dependency manifests could be scanned.');
      return NextResponse.json({ success: true, mode: 'owner', data });
    }
    const target = parseGitHubUrl(repoUrl);
    if (!target) throw new RequestError('Invalid GitHub repository URL.');
    const { packageJson, repoMeta } = await fetchGitHubRepoData(target, token, signal);
    const data = await analyzeDependencies(packageJson, repoMeta, signal);
    return NextResponse.json({ success: true, mode: 'repository', data });
  } catch (error) {
    const status = signal.aborted ? 504 : error instanceof RequestError ? (error.status === 401 || error.status === 403 || error.status === 404 ? error.status : error.status >= 500 ? 502 : error.status) : 502;
    const message = signal.aborted ? 'The scan timed out. Try fewer repositories.'
      : error instanceof RequestError && [400, 413].includes(error.status) ? error.message
      : status === 401 || status === 403 ? 'GitHub rejected access. Check your token permissions or API rate limit.'
      : status === 404 ? 'The repository, branch, or manifest was not found. Check the URL and token.'
      : 'The scan could not be verified. An upstream service may be unavailable. Please retry.';
    return NextResponse.json({ success: false, error: message }, { status });
  } finally { controller.abort(); release(); }
}
