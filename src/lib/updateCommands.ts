import { PackageAnalysis, PackageManager, RepoAnalysisResult } from '@/types';

export type UpdatePreset = 'security' | 'safe' | 'major' | 'all';
export type UpdatePromptLanguage = 'en' | 'fr';

export function isPackageEligibleForUpdate(pkg: PackageAnalysis) {
  return !pkg.isUpdateDeferred;
}

export function getUpdatePresetPackages(packages: PackageAnalysis[], preset: UpdatePreset) {
  switch (preset) {
    case 'security':
      return packages.filter((pkg) => isPackageEligibleForUpdate(pkg) && (pkg.category === 'critical' || pkg.category === 'security'));
    case 'safe':
      return packages.filter((pkg) => isPackageEligibleForUpdate(pkg) && (pkg.category === 'minor' || pkg.category === 'patch'));
    case 'major':
      return packages.filter((pkg) => isPackageEligibleForUpdate(pkg) && pkg.category === 'major');
    case 'all':
      return packages.filter((pkg) => isPackageEligibleForUpdate(pkg) && pkg.category !== 'up_to_date');
  }
}

export function buildUpdateCommand(
  packages: PackageAnalysis[],
  manager: PackageManager,
  force: boolean,
  target: 'latest' | 'compatible' = 'latest',
) {
  const command = manager === 'npm' ? 'npm i' : `${manager} add`;
  const devFlag = manager === 'bun' ? '-d' : '-D';
  const forceFlag = force ? ' --force' : '';
  const formatPackage = (pkg: PackageAnalysis) =>
    `${pkg.name}@${target === 'compatible' ? `^${pkg.latestVersion}` : 'latest'}`;
  const production = packages.filter((pkg) => !pkg.isDevDependency).map(formatPackage);
  const development = packages.filter((pkg) => pkg.isDevDependency).map(formatPackage);
  const commands: string[] = [];

  if (production.length) commands.push(`${command}${forceFlag} ${production.join(' ')}`);
  if (development.length) commands.push(`${command} ${devFlag}${forceFlag} ${development.join(' ')}`);

  return commands.join(' && ');
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
) {
  if (!packages.length) return '';

  const packageList = formatPackagesForPrompt(packages);
  const updateCommand = buildUpdateCommand(
    packages,
    manager,
    force,
    preset === 'safe' ? 'compatible' : 'latest',
  );
  const forceInstruction = force
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
) {
  const repositoriesWithUpdates = repositories
    .map((repository) => ({ repository, packages: getUpdatePresetPackages(repository.packages, preset) }))
    .filter(({ packages }) => packages.length > 0);

  if (!repositoriesWithUpdates.length) return '';

  const title = language === 'fr'
    ? `Prépare une procédure de mise à jour ${preset === 'security' ? 'des alertes de sécurité' : 'des dépendances'} pour les dépôts ci-dessous. Travaille dépôt par dépôt : exécute uniquement la commande prévue dans le dépôt concerné, puis vérifie le lockfile et lance les tests de ce dépôt.`
    : `Prepare a ${preset === 'security' ? 'security' : 'dependency'} update procedure for the repositories below. Work repository by repository: run only the intended command in its matching repository, then verify that repository's lockfile and run its tests.`;
  const forceInstruction = force
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
    const command = buildUpdateCommand(packages, manager, force, preset === 'safe' ? 'compatible' : 'latest');
    return `## ${repository.repoInfo.repo}\n${commandLabel}\n${command}\n\n${packagesLabel}\n${formatPackagesForPrompt(packages)}`;
  });

  return `${title}${forceInstruction}${verificationInstruction}\n\n${sections.join('\n\n---\n\n')}`;
}
