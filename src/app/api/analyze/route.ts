import { NextRequest, NextResponse } from 'next/server';
import { parseGitHubUrl, fetchGitHubRepoData } from '@/lib/github';
import { analyzeDependencies } from '@/lib/analyzer';
import { RawPackageJson, RepoMeta } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { repoUrl, githubToken, customPackageJson, customRepoName } = body;

    // 1. Direct package.json paste mode
    if (customPackageJson && typeof customPackageJson === 'object') {
      const repoMeta: RepoMeta = {
        owner: 'custom',
        repo: customRepoName || 'pasted-package.json',
        fullName: customRepoName || 'Custom / Uploaded package.json',
        description: 'Locally pasted or uploaded package manifest',
        isCustomJson: true,
      };

      const result = await analyzeDependencies(customPackageJson as RawPackageJson, repoMeta);
      return NextResponse.json({ success: true, data: result });
    }

    // 2. GitHub repository URL mode
    if (!repoUrl || typeof repoUrl !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Please provide a valid GitHub repository URL or owner/repo identifier.' },
        { status: 400 }
      );
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

    const { packageJson, repoMeta } = await fetchGitHubRepoData(parsedTarget, githubToken);

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
    return NextResponse.json({ success: true, data: result });
  } catch (err: any) {
    console.error('API Error /api/analyze:', err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'An unexpected error occurred while analyzing the repository.',
      },
      { status: 500 }
    );
  }
}
