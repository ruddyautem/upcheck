import { PackageAnalysis, PackageManager, RepoAnalysisResult } from '@/types';
import semver from 'semver';
import { DEPENDENCY_GROUPS, isPackageName, resolvePackageSpec } from './manifest';
import { getRepositoryTarget } from './repositoryTarget';

export type UpdatePreset = 'security' | 'safe' | 'major' | 'all';
export type UpdatePromptLanguage = 'en' | 'fr';
export interface UpdateOptions { allowTypeScript7?: boolean }

export function isTypeScript7Update(pkg: PackageAnalysis) {
  return (pkg.registryName || pkg.name) === 'typescript' && Boolean(semver.valid(pkg.latestVersion)) && semver.major(pkg.latestVersion) >= 7;
}

export function isPackageUpdateDeferred(pkg: PackageAnalysis, options: UpdateOptions = {}) {
  if (isTypeScript7Update(pkg)) return !options.allowTypeScript7;
  return Boolean(pkg.isUpdateDeferred);
}

export function isPackageEligibleForUpdate(pkg: PackageAnalysis, options: UpdateOptions = {}) {
  return !isPackageUpdateDeferred(pkg, options) && pkg.category !== 'unknown'
    && pkg.versionSource !== 'unsupported'
    && isPackageName(pkg.name) && isPackageName(pkg.registryName || pkg.name)
    && Boolean(semver.valid(pkg.currentVersion) && semver.valid(pkg.latestVersion))
    && semver.gt(pkg.latestVersion, pkg.currentVersion)
    && Object.values(pkg.declaredSpecs || {}).every((spec) => {
      const resolved = resolvePackageSpec(pkg.name, spec);
      return resolved && resolved.registryName === (pkg.registryName || pkg.name) && semver.lte(resolved.version, pkg.latestVersion);
    });
}

export function getUpdatePresetPackages(packages: PackageAnalysis[], preset: UpdatePreset, options: UpdateOptions = {}) {
  switch (preset) {
    case 'security':
      return packages.filter((pkg) => isPackageEligibleForUpdate(pkg, options) && (pkg.category === 'critical' || pkg.category === 'security'));
    case 'safe':
      return packages.filter((pkg) => isPackageEligibleForUpdate(pkg, options) && (pkg.category === 'minor' || pkg.category === 'patch'));
    case 'major':
      return packages.filter((pkg) => isPackageEligibleForUpdate(pkg, options) && pkg.category === 'major');
    case 'all':
      return packages.filter((pkg) => isPackageEligibleForUpdate(pkg, options) && pkg.category !== 'up_to_date');
  }
}

export function buildUpdateCommand(
  packages: PackageAnalysis[],
  manager: PackageManager,
  force: boolean,
  target: 'latest' | 'compatible' = 'latest',
  options: UpdateOptions = {},
) {
  const command = manager === 'npm' ? 'npm i' : `${manager} add`;
  const devFlag = manager === 'bun' ? '-d' : '-D';
  const forceFlag = force && manager !== 'yarn' ? ' --force' : '';
  const formatPackage = (pkg: PackageAnalysis) => {
    const version = target === 'compatible' ? `^${pkg.latestVersion}` : pkg.latestVersion;
    const spec = pkg.registryName && pkg.registryName !== pkg.name ? `npm:${pkg.registryName}@${version}` : version;
    return `"${pkg.name}@${spec}"`;
  };
  const commands: string[] = [];
  const eligible = packages.filter((pkg) => isPackageEligibleForUpdate(pkg, options));
  for (const group of DEPENDENCY_GROUPS) {
    const selected = eligible.filter((pkg) => (pkg.dependencyGroups || [pkg.isPeerDependency ? 'peerDependencies' : pkg.isDevDependency ? 'devDependencies' : 'dependencies']).includes(group));
    const flag = group === 'devDependencies' ? ` ${devFlag}`
      : group === 'peerDependencies' ? (manager === 'npm' || manager === 'pnpm' ? ' --save-peer' : ' --peer')
      : group === 'optionalDependencies' ? (manager === 'npm' || manager === 'pnpm' ? ' --save-optional' : ' --optional') : '';
    if (selected.length) commands.push(`${command}${flag}${forceFlag} ${selected.map(formatPackage).join(' ')}`);
  }

  return commands.join(' && ');
}

export function buildUpdatedManifest(result: RepoAnalysisResult, options: UpdateOptions = {}) {
  if (!result.originalManifest) return null;
  const manifest = structuredClone(result.originalManifest);
  for (const pkg of result.packages.filter((pkg) => isPackageEligibleForUpdate(pkg, options))) {
    for (const group of DEPENDENCY_GROUPS) {
      if (!manifest[group] || !Object.hasOwn(manifest[group], pkg.name)) continue;
      const current = manifest[group]?.[pkg.name];
      if (current === undefined) continue;
      // Keep aliases and each declaration's pin/range style intact.
      const prefix = current.startsWith('npm:') ? `npm:${pkg.registryName}@` : '';
      const versionSpec = prefix ? current.slice(current.lastIndexOf('@') + 1) : current;
      const operator = versionSpec.startsWith('^') ? '^' : versionSpec.startsWith('~') ? '~' : '';
      manifest[group]![pkg.name] = `${prefix}${operator}${pkg.latestVersion}`;
    }
  }
  return manifest;
}

function formatPackagesForPrompt(packages: PackageAnalysis[]) {
  return packages
    .map((pkg) => `- ${pkg.name}: ${pkg.currentVersion} → ${pkg.latestVersion}`)
    .join('\n');
}

export function buildAiUpdatePrompt(
  packages: PackageAnalysis[],
  preset: UpdatePreset,
  manager: PackageManager,
  force: boolean,
  language: UpdatePromptLanguage,
  options: UpdateOptions = {},
) {
  packages = packages.filter((pkg) => isPackageEligibleForUpdate(pkg, options));
  if (!packages.length) return '';

  const packageList = formatPackagesForPrompt(packages);
  const updateCommand = buildUpdateCommand(
    packages,
    manager,
    force,
    preset === 'safe' ? 'compatible' : 'latest',
    options,
  );
  const forceInstruction = force && manager !== 'yarn'
    ? language === 'fr'
      ? `\n\nLe mode « Force Update » est activé. Utilise la commande prévue, y compris --force, puis vérifie le lockfile et exécute les tests après la mise à jour.`
      : `\n\nForce Update is enabled. Use the intended command, including --force, then verify the lockfile and run the tests after the update.`
    : '';
  const verificationInstruction = language === 'fr'
    ? `\n\nAprès chaque mise à jour, exécute les tests et vérifications pertinents du projet. Si un échec est causé par la mise à jour, diagnostique-le et corrige-le, puis recommence les vérifications jusqu'à ce qu'elles réussissent. Avant toute correction de compatibilité, consulte la documentation officielle et les notes de migration du paquet concerné. N'apporte pas de changement sans rapport avec la mise à jour.`
    : `\n\nAfter each update, run the project's relevant tests and checks. If an update causes a failure, diagnose and fix it, then repeat the checks until they pass. Before making a compatibility fix, consult the affected package's official documentation and migration notes. Do not make changes unrelated to the update.`;

  const prompts = language === 'fr'
    ? {
        security: `Prépare une procédure de mise à jour des dépendances ci-dessous afin de corriger les alertes de sécurité dans ce projet ${manager}. Respecte strictement la commande prévue et indique les vérifications essentielles avant et après l'installation.`,
        safe: `Prépare une procédure de mise à jour limitée aux versions mineures et correctifs ci-dessous pour ce projet ${manager}. N'ajoute aucune version majeure. Respecte strictement la commande prévue et indique les tests à exécuter après l'installation.`,
        major: `Prépare une procédure de mise à jour pour les dépendances majeures ci-dessous dans ce projet ${manager}. Respecte strictement la commande prévue, signale les changements incompatibles possibles et indique les tests à exécuter après l'installation.`,
        all: `Prépare une procédure de mise à jour progressive des dépendances ci-dessous dans ce projet ${manager}. Respecte strictement la commande prévue, traite d'abord les alertes de sécurité, puis les mises à jour mineures et correctifs, puis les majeures. Indique les tests à exécuter après l'installation.`,
      }
    : {
        security: `Prepare a dependency update procedure for the packages below to address security advisories in this ${manager} project. Follow the intended command exactly and list the essential checks before and after installation.`,
        safe: `Prepare an update procedure limited to the minor and patch releases below for this ${manager} project. Do not add any major versions. Follow the intended command exactly and list the tests to run after installation.`,
        major: `Prepare an update procedure for the major dependencies below in this ${manager} project. Follow the intended command exactly, flag possible breaking changes, and list the tests to run after installation.`,
        all: `Prepare a staged update procedure for the dependencies below in this ${manager} project. Follow the intended command exactly, address security advisories first, then minor and patch updates, then major versions. List the tests to run after installation.`,
      };

  const commandLabel = language === 'fr' ? 'Commande prévue :' : 'Intended command:';
  return `${prompts[preset]}${forceInstruction}${verificationInstruction}\n\n${commandLabel}\n${updateCommand}\n\n${language === 'fr' ? 'Paquets à mettre à jour :' : 'Packages to update:'}\n${packageList}`;
}

export function buildMultiRepoAiUpdatePrompt(
  repositories: RepoAnalysisResult[],
  preset: UpdatePreset,
  manager: PackageManager,
  force: boolean,
  language: UpdatePromptLanguage,
  options: UpdateOptions = {},
) {
  const repositoriesWithUpdates = repositories
    .map((repository) => ({ repository, packages: getUpdatePresetPackages(repository.packages, preset, options) }))
    .filter(({ packages }) => packages.length > 0);

  if (!repositoriesWithUpdates.length) return '';

  const title = language === 'fr'
    ? `Prépare une procédure de mise à jour ${preset === 'security' ? 'des alertes de sécurité' : 'des dépendances'} pour les dépôts ci-dessous. Travaille dépôt par dépôt : exécute uniquement la commande prévue dans le dépôt concerné, puis vérifie le lockfile et lance les tests de ce dépôt.`
    : `Prepare a ${preset === 'security' ? 'security' : 'dependency'} update procedure for the repositories below. Work repository by repository: run only the intended command in its matching repository, then verify that repository's lockfile and run its tests.`;
  const forceInstruction = force && manager !== 'yarn'
    ? language === 'fr'
      ? '\n\nLe mode « Force Update » est activé : conserve --force dans chaque commande et signale ce risque avant exécution.'
      : '\n\nForce Update is enabled: keep --force in every command and flag this risk before execution.'
    : '';
  const verificationInstruction = language === 'fr'
    ? `\n\nTraite strictement un seul dépôt à la fois. Après chaque dépôt, exécute ses tests et vérifications pertinents. Si un échec est causé par la mise à jour, diagnostique-le et corrige-le, puis recommence les vérifications jusqu'à ce qu'elles réussissent. Avant toute correction de compatibilité, consulte la documentation officielle et les notes de migration du paquet concerné. N'apporte pas de changement sans rapport avec la mise à jour. Une fois le dépôt validé, résume les actions et les résultats, puis demande explicitement à l'utilisateur l'autorisation de passer au dépôt suivant. Ne poursuis jamais automatiquement.`
    : `\n\nProcess strictly one repository at a time. After each repository, run its relevant tests and checks. If an update causes a failure, diagnose and fix it, then repeat the checks until they pass. Before making a compatibility fix, consult the affected package's official documentation and migration notes. Do not make changes unrelated to the update. Once the repository is validated, summarize the actions and results, then explicitly ask the user for permission to continue to the next repository. Never continue automatically.`;
  const commandLabel = language === 'fr' ? 'Commande prévue :' : 'Intended command:';
  const packagesLabel = language === 'fr' ? 'Paquets à mettre à jour :' : 'Packages to update:';
  const sections = repositoriesWithUpdates.map(({ repository, packages }) => {
    const command = buildUpdateCommand(packages, manager, force, preset === 'safe' ? 'compatible' : 'latest', options);
    const target = getRepositoryTarget(repository.repoInfo);
    const location = language === 'fr'
      ? `Branche : ${target.branch || 'branche par défaut'}. Manifeste : ${target.path || 'package.json'}. Exécute la commande dans le dossier de ce manifeste.`
      : `Branch: ${target.branch || 'default branch'}. Manifest: ${target.path || 'package.json'}. Run the command in this manifest's directory.`;
    return `## ${repository.repoInfo.fullName}\n${location}\n${commandLabel}\n${command}\n\n${packagesLabel}\n${formatPackagesForPrompt(packages)}`;
  });

  return `${title}${forceInstruction}${verificationInstruction}\n\n${sections.join('\n\n---\n\n')}`;
}
