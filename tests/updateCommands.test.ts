import { expect, test } from 'bun:test';
import { buildAiUpdatePrompt, buildMultiRepoAiUpdatePrompt, buildUpdateCommand, buildUpdatedManifest, getUpdatePresetPackages } from '../src/lib/updateCommands';
import { pkg, report } from './fixtures';

test('pins reviewed versions rather than a moving latest tag', () => {
  for (const manager of ['bun', 'npm', 'pnpm', 'yarn'] as const) {
    const command = buildUpdateCommand([pkg()], manager, false);
    expect(command).toContain('"example@1.2.0"');
    expect(command).not.toContain('@latest');
  }
});

test('keeps peer, development, and optional dependency command flags', () => {
  expect(buildUpdateCommand([pkg({ dependencyGroups: ['peerDependencies'], isPeerDependency: true })], 'bun', false)).toContain(' --peer ');
  expect(buildUpdateCommand([pkg({ dependencyGroups: ['peerDependencies'], isPeerDependency: true })], 'npm', false)).toContain(' --save-peer ');
  expect(buildUpdateCommand([pkg({ dependencyGroups: ['devDependencies'], isDevDependency: true })], 'bun', false)).toContain(' -d ');
  expect(buildUpdateCommand([pkg({ dependencyGroups: ['optionalDependencies'] })], 'bun', false)).toContain(' --optional ');
});

test('excludes TypeScript 7, downgrades, unverified data, and invalid names from every command', () => {
  const blocked = [pkg({ name: 'typescript', latestVersion: '7.0.0', currentVersion: '6.0.3', category: 'critical' }),
    pkg({ currentVersion: '2.0.0', latestVersion: '1.9.1' }), pkg({ category: 'unknown' }), pkg({ name: 'bad; echo marker' })];
  expect(buildUpdateCommand(blocked, 'bun', true)).toBe('');
  expect(buildAiUpdatePrompt(blocked, 'all', 'bun', true, 'en')).toBe('');
  expect(buildMultiRepoAiUpdatePrompt([report({ packages: blocked })], 'all', 'bun', true, 'en')).toBe('');
  for (const preset of ['security', 'safe', 'major', 'all'] as const) expect(getUpdatePresetPackages(blocked, preset)).toHaveLength(0);
});

test('explicit TypeScript opt-in applies to commands, prompts, and manifest exports and can be reversed', () => {
  const typescript = pkg({ name: 'typescript', currentVersion: '6.0.3', currentSpec: '^6.0.3', latestVersion: '7.0.2',
    category: 'major', isDevDependency: true, dependencyGroups: ['devDependencies'], isUpdateDeferred: true });
  const result = report({ packages: [typescript], originalManifest: { devDependencies: { typescript: '^6.0.3' } } });
  const options = { allowTypeScript7: true };
  expect(getUpdatePresetPackages(result.packages, 'major', options)).toHaveLength(1);
  expect(getUpdatePresetPackages(result.packages, 'safe', options)).toHaveLength(0);
  expect(buildUpdateCommand(result.packages, 'bun', false, 'latest', options)).toBe('bun add -d "typescript@7.0.2"');
  expect(buildAiUpdatePrompt(result.packages, 'all', 'bun', false, 'en', options)).toContain('typescript@7.0.2');
  expect(buildMultiRepoAiUpdatePrompt([result], 'all', 'bun', false, 'en', options)).toContain('typescript@7.0.2');
  expect(buildUpdatedManifest(result, options)?.devDependencies?.typescript).toBe('^7.0.2');
  expect(buildUpdateCommand(result.packages, 'bun', false)).toBe('');
  expect(buildUpdatedManifest(result)?.devDependencies?.typescript).toBe('^6.0.3');
  expect(typescript.isUpdateDeferred).toBe(true);
});

test('TypeScript opt-in supports aliases and security updates while retaining other safety checks', () => {
  const options = { allowTypeScript7: true };
  const alias = pkg({ name: 'ts', registryName: 'typescript', currentVersion: '6.0.3', latestVersion: '7.0.2', category: 'critical', isUpdateDeferred: true });
  expect(getUpdatePresetPackages([alias], 'security', options)).toHaveLength(1);
  expect(buildUpdateCommand([alias], 'bun', false, 'latest', options)).toContain('ts@npm:typescript@7.0.2');
  const blocked = [pkg({ isUpdateDeferred: true }), pkg({ name: 'typescript', category: 'unknown', latestVersion: '7.0.2' }),
    pkg({ name: 'typescript', currentVersion: '8.0.0', latestVersion: '7.0.2' }),
    pkg({ name: 'typescript', latestVersion: '7.0.2', versionSource: 'unsupported' })];
  expect(buildUpdateCommand(blocked, 'bun', false, 'latest', options)).toBe('');
});

test('does not generate unsupported force flags for Yarn', () => {
  expect(buildUpdateCommand([pkg()], 'yarn', true)).not.toContain('--force');
  expect(buildAiUpdatePrompt([pkg()], 'all', 'yarn', true, 'en')).not.toContain('--force');
});

test('preserves alias identity and quotes compatible versions', () => {
  expect(buildUpdateCommand([pkg({ name: 'alias', registryName: '@scope/real' })], 'bun', false, 'compatible')).toBe('bun add "alias@npm:@scope/real@^1.2.0"');
});

test('does not downgrade a newer declaration in another dependency group', () => {
  const dependency = pkg({ declaredSpecs: { devDependencies: '2.0.0', peerDependencies: '^1.0.0' }, latestVersion: '1.9.1' });
  expect(buildUpdateCommand([dependency], 'bun', false)).toBe('');
  const result = report({ packages: [dependency], originalManifest: { devDependencies: { example: '2.0.0' }, peerDependencies: { example: '^1.0.0' } } });
  expect(buildUpdatedManifest(result)).toEqual(result.originalManifest!);
});

test('does not mistake inherited object properties for dependency declarations', () => {
  const result = report({ packages: [pkg({ name: 'constructor' })], originalManifest: {
    dependencies: { constructor: '1.0.0' }, devDependencies: { other: '1.0.0' },
  } });
  expect(buildUpdatedManifest(result)?.devDependencies).toEqual({ other: '1.0.0' });
});

test('patches the original manifest without losing configuration, groups, pins, or deferred packages', () => {
  const original = { name: 'library', type: 'module', scripts: { test: 'bun test' }, engines: { bun: '>=1.4' },
    workspaces: ['packages/*'], overrides: { nested: '1.0.0' },
    devDependencies: { react: '19.0.0', typescript: '^6.0.3' }, peerDependencies: { react: '^19.0.0' },
    optionalDependencies: { native: '~1.0.0' } };
  const result = report({ originalManifest: original, packages: [pkg({ name: 'react', currentVersion: '19.0.0', latestVersion: '19.1.0' }),
    pkg({ name: 'typescript', currentVersion: '6.0.3', latestVersion: '7.0.0', category: 'critical' }), pkg({ name: 'native' })] });
  const updated = buildUpdatedManifest(result)!;
  expect(updated.scripts).toEqual(original.scripts);
  expect(updated.engines).toEqual(original.engines);
  expect(updated.workspaces).toEqual(original.workspaces);
  expect(updated.overrides).toEqual(original.overrides);
  expect(updated.type).toBe('module');
  expect(updated.devDependencies).toEqual({ react: '19.1.0', typescript: '^6.0.3' });
  expect(updated.peerDependencies).toEqual({ react: '^19.1.0' });
  expect(updated.optionalDependencies).toEqual({ native: '~1.2.0' });
  expect(original.devDependencies.react).toBe('19.0.0');
  expect(buildUpdatedManifest(report())).toBeNull();
});
