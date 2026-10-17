import { NextRequest, NextResponse } from 'next/server';
import { fetchGitHubOwnerRepos, parseGitHubOwner } from '@/lib/github';
import { checkRateLimit, getClientIdentifier } from '@/lib/rateLimit';

export async function POST(req: NextRequest) {
  const rateLimit = checkRateLimit(`repositories:${getClientIdentifier(req.headers)}`, 20, 10 * 60 * 1000);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { success: false, error: 'Too many repository requests. Please try again shortly.' },
      { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) } }
    );
  }

  try {
    const body: unknown = await req.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ success: false, error: 'Request body must be a JSON object.' }, { status: 400 });
    }
    const { owner: ownerValue, githubToken: tokenValue } = body as Record<string, unknown>;
    const owner = typeof ownerValue === 'string' ? parseGitHubOwner(ownerValue) : null;
    const githubToken = typeof tokenValue === 'string' ? tokenValue.trim() : undefined;
    if (githubToken && githubToken.length > 500) {
      return NextResponse.json({ success: false, error: 'GitHub token is invalid.' }, { status: 400 });
    }

    if (!owner) {
      return NextResponse.json(
        { success: false, error: 'Please provide a valid GitHub username or organization name.' },
        { status: 400 }
      );
    }

    const repositories = await fetchGitHubOwnerRepos(owner, githubToken);
    return NextResponse.json({
      success: true,
      data: repositories.map((repository) => ({
        fullName: `${repository.owner}/${repository.repo}`,
        name: repository.repo,
      })),
    });
  } catch (error) {
    console.error('API Error /api/repositories:', error);
    return NextResponse.json(
      { success: false, error: 'Unable to list GitHub repositories.' },
      { status: 500 }
    );
  }
}
