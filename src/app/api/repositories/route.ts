import { NextRequest, NextResponse } from 'next/server';
import { fetchGitHubOwnerRepos } from '@/lib/github';
import { parseGitHubOwner } from '@/lib/repositoryTarget';
import { checkRateLimit, getClientIdentifier } from '@/lib/rateLimit';
import { readRequestJson, RequestError } from '@/lib/http';

export async function POST(req: NextRequest) {
  const rate = checkRateLimit(`repositories:${getClientIdentifier(req.headers)}`, 20, 10 * 60 * 1000);
  if (!rate.allowed) return NextResponse.json({ success: false, error: 'Too many repository requests. Please retry shortly.' }, { status: 429, headers: { 'Retry-After': String(rate.retryAfterSeconds) } });
  const signal = AbortSignal.any([req.signal, AbortSignal.timeout(30_000)]);
  try {
    const body = await readRequestJson(req, signal);
    const owner = typeof body.owner === 'string' ? parseGitHubOwner(body.owner) : null;
    if (!owner) throw new RequestError('Provide a valid GitHub username or organization name.');
    if (body.githubToken !== undefined && (typeof body.githubToken !== 'string' || body.githubToken.length > 500 || /[\r\n]/.test(body.githubToken))) throw new RequestError('GitHub token is invalid.');
    const token = typeof body.githubToken === 'string' ? body.githubToken.trim() || undefined : undefined;
    const repositories = await fetchGitHubOwnerRepos(owner, token, signal);
    return NextResponse.json({ success: true, data: repositories.map((repo) => ({ fullName: `${repo.owner}/${repo.repo}`, name: repo.repo })) });
  } catch (error) {
    const isInputError = error instanceof RequestError && [400, 413].includes(error.status);
    return NextResponse.json({ success: false, error: isInputError ? error.message : 'Unable to list repositories. Check your token and retry.' }, { status: signal.aborted ? 504 : isInputError ? error.status : 502 });
  }
}
