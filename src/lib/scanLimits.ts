import type { RepoTarget } from '@/types';
import { RequestError } from './http';
import { parseGitHubUrl, repositoryTargetKey } from './repositoryTarget';

export const MAX_SCAN_REPOSITORIES = 20;
export const ANONYMOUS_SCAN_REPOSITORIES = 10;

export function parseRepositoryTargets(value: unknown, hasToken: boolean): RepoTarget[] {
  if (!Array.isArray(value) || !value.length || value.length > 100) throw new RequestError('Select between 1 and 20 repositories.');
  const unique = new Map<string, RepoTarget>();
  for (const input of value) {
    const target = typeof input === 'string' ? parseGitHubUrl(input) : null;
    if (!target) throw new RequestError('Every selected repository must be a valid GitHub target.');
    unique.set(repositoryTargetKey(target), target);
  }
  enforceScanLimit(unique.size, hasToken);
  return Array.from(unique.values());
}

export function enforceScanLimit(count: number, hasToken: boolean) {
  const limit = hasToken ? MAX_SCAN_REPOSITORIES : ANONYMOUS_SCAN_REPOSITORIES;
  if (count > limit) throw new RequestError(`You can scan up to ${limit} repositories at once. Select a smaller set.`);
}
