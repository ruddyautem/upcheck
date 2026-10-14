export type UpdateCategory = 
  | 'critical'     // Critical / High Security Vulnerability (CVSS >= 7 or CRITICAL/HIGH)
  | 'security'     // Medium / Low Security Advisory
  | 'deprecated'   // Package maintainer announced deprecation / abandonment
  | 'major'        // Major version bump (likely breaking changes)
  | 'minor'        // Minor version bump (backwards-compatible new features)
  | 'patch'        // Patch version bump (backwards-compatible bug fixes)
  | 'up_to_date';  // Already at the latest version

export type AdvisorySeverity = 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW' | 'UNKNOWN';

export interface SecurityAdvisory {
  id: string; // e.g., GHSA-xxxx-xxxx-xxxx or CVE-2023-xxxxx
  title: string;
  summary: string;
  severity: AdvisorySeverity;
  cvssScore?: number;
  affectedRange: string;
  fixedIn?: string;
  advisoryUrl: string;
  publishedAt?: string;
}

export interface SemverDiffInfo {
  type: 'major' | 'minor' | 'patch' | 'none' | 'prerelease' | 'unknown';
  majorDiff: number;
  minorDiff: number;
  patchDiff: number;
}

export interface PackageAnalysis {
  name: string;
  currentSpec: string;          // e.g. "^18.2.0"
  currentVersion: string;       // cleaned semver e.g. "18.2.0"
  latestVersion: string;        // e.g. "19.0.0"
  category: UpdateCategory;
  categoryLabel: string;
  urgencyScore: number;         // 1 (lowest) to 5 (highest critical)
  isDevDependency: boolean;
  isPeerDependency: boolean;
  deprecatedReason?: string | null; // Maintainer announcement / deprecation note
  homepage?: string;
  repositoryUrl?: string;
  npmUrl: string;
  publishedAt?: string;
  latestPublishedAt?: string;
  advisories: SecurityAdvisory[];
  hasBreakingChanges: boolean;
  breakingWarning?: string;
  updateDiff: SemverDiffInfo;
}

export type PackageManager = 'bun' | 'npm' | 'pnpm' | 'yarn';

export interface HealthScore {
  score: number; // 0 - 100
  grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  label: string;
  color: string;
  description: string;
}

export interface RawPackageJson {
  name?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

export interface RepoMeta {
  owner: string;
  repo: string;
  fullName: string;
  defaultBranch?: string;
  description?: string;
  stars?: number;
  forks?: number;
  openIssues?: number;
  updatedAt?: string;
  isCustomJson?: boolean;
}

export interface RepoAnalysisResult {
  repoInfo: RepoMeta;
  totalPackages: number;
  dependenciesCount: number;
  devDependenciesCount: number;
  summaryCounts: {
    critical: number;
    security: number;
    deprecated: number;
    major: number;
    minor: number;
    patch: number;
    up_to_date: number;
  };
  healthScore: HealthScore;
  packages: PackageAnalysis[];
  analyzedAt: string;
}
