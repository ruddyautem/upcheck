import { PackageAnalysis } from '@/types';

/**
 * Resolves the most specific migration / release notes URL for a package:
 * 1. GitHub releases / changelog page if a GitHub repo URL exists.
 * 2. Package homepage if available.
 * 3. Fallback to npm package page.
 */
export function getMigrationUrl(pkg: PackageAnalysis): string {
  if (pkg.repositoryUrl) {
    const cleanRepo = pkg.repositoryUrl.replace(/\/$/, '');
    return `${cleanRepo}/releases`;
  }
  if (pkg.homepage) {
    return pkg.homepage;
  }
  return pkg.npmUrl;
}
