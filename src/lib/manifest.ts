import semver from 'semver';
import type { DependencyGroup, RawPackageJson } from '@/types';

export const DEPENDENCY_GROUPS: DependencyGroup[] = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'];
export const MAX_DEPENDENCIES = 500;

export function isPackageName(name: string): boolean {
  return name.length <= 214 && /^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/i.test(name);
}

export function isValidPackageManifest(value: unknown): value is RawPackageJson {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const manifest = value as Record<string, unknown>;
  if (manifest.name !== undefined && typeof manifest.name !== 'string') return false;
  let count = 0;
  for (const key of DEPENDENCY_GROUPS) {
    const group = manifest[key];
    if (group === undefined) continue;
    if (!group || typeof group !== 'object' || Array.isArray(group)) return false;
    for (const [name, spec] of Object.entries(group)) {
      if (!isPackageName(name) || typeof spec !== 'string' || !spec.trim() || spec.length > 1000) return false;
      count++;
    }
  }
  return count > 0 && count <= MAX_DEPENDENCIES;
}

export function resolvePackageSpec(name: string, spec: string) {
  let registryName = name;
  let versionSpec = spec.trim();
  if (versionSpec.startsWith('npm:')) {
    const match = versionSpec.match(/^npm:((?:@[^/]+\/)?[^@]+)@(.+)$/);
    if (!match || !isPackageName(match[1])) return null;
    [, registryName, versionSpec] = match;
  }
  const exact = semver.valid(versionSpec);
  const minimum = exact || (semver.validRange(versionSpec) ? semver.minVersion(versionSpec)?.version : null);
  if (!minimum) return null;
  return { registryName, version: minimum, source: exact ? 'exact' as const : 'range' as const };
}
