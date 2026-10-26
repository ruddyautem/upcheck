# Upcheck

<div align="center">

**[Français](#français)** · **[English](#english)**

Analysez vos dépendances GitHub, identifiez les risques et préparez des mises à jour fiables.

</div>

---

## Français

### 📋 Présentation

**Upcheck** est un outil d'analyse de dépendances pour les projets JavaScript et TypeScript hébergés sur GitHub. À partir d'un `package.json`, il identifie les mises à jour disponibles, les vulnérabilités connues et les changements majeurs à anticiper, puis prépare une procédure de mise à jour adaptée à votre gestionnaire de paquets.

L'application permet d'analyser un dépôt, une sélection de dépôts ou les dépôts d'un compte GitHub. Pour les analyses multiples, les prompts IA font avancer les projets un par un : tests, correction des problèmes rencontrés, vérification, puis validation explicite avant de continuer.

### ✨ Fonctionnalités

- **Analyse de dépôt** : URL GitHub, raccourci `proprietaire/depot` ou manifeste `package.json` collé ou importé. Les branches et chemins de sous-dossiers sont conservés pour le cache et les nouvelles analyses.
- **Analyse multi-dépôts** : sélection de plusieurs dépôts, ou analyse des dépôts d'un compte GitHub.
- **Mises à jour classées** : risques de sécurité, mises à jour mineures et correctifs, mises à jour majeures, ou mise à jour complète.
- **Conseils actionnables** : commandes pour Bun, npm, pnpm et Yarn ciblant les versions analysées, avec option de forçage selon le gestionnaire.
- **Export du manifeste** : mise à jour d’une copie du `package.json` original, en conservant les scripts, la configuration, les alias et les groupes de dépendances.
- **TypeScript 7 en option** : exclu par défaut des mises à jour. Dans sa ligne du tableau, l’interrupteur « ESLint indisponible. Mettre à jour quand même ? » l’inclut dans les commandes, les prompts IA et l’export du manifeste. Ce choix s’applique au rapport ouvert et est réinitialisé à sa réouverture ou à l’actualisation.
- **Prompts IA fiables** : tests requis, diagnostic et correction jusqu'à réussite, consultation de la documentation officielle lorsque nécessaire.
- **Rapports réutilisables** : jusqu'à dix scans récents, y compris les scans multiples, sont conservés dans le navigateur pour retrouver rapidement un rapport.
- **Rapports locaux persistants** : jusqu’à dix rapports accessibles via `/fr/report/<id>` ou `/en/report/<id>`, y compris après actualisation ou redémarrage du navigateur. Ils peuvent être supprimés avec « Effacer les rapports locaux ». Si le stockage local est indisponible ou plein, une nouvelle analyse reste affichable sans garantie de conservation.
- **Interface bilingue et indexable** : français et anglais avec des URLs dédiées (`/fr` et `/en`), des balises canoniques et des liens alternatifs pour les moteurs de recherche.

### 🔒 Sécurité et confidentialité

- Les requêtes d'analyse et de liste de dépôts sont limitées pour réduire les abus.
- Les données reçues sont validées avant analyse, notamment les manifestes `package.json`.
- Un jeton GitHub peut être saisi pour les dépôts privés ou une limite d’API plus haute. Il reste en mémoire pendant la navigation entre les rapports et est effacé à l’actualisation ou à la fermeture de la page.
- Les réponses d'erreur côté API n'exposent pas de détails techniques sensibles.
- Les rapports sont stockés localement dans le navigateur, jamais sur un serveur Upcheck, et peuvent être supprimés depuis la liste des scans récents ou les réglages du navigateur.

### 🎯 Portée et fiabilité des analyses

- L’analyse porte sur les dépendances directes déclarées dans `dependencies`, `devDependencies`, `peerDependencies` et `optionalDependencies`.
- Une plage comme `^1.0.0` est évaluée à partir de sa version minimale. Les versions réellement installées et les dépendances transitives nécessitent un audit du lockfile.
- Les alias npm sont résolus vers leur paquet cible. Les sources non prises en charge (`workspace:`, `file:`, Git, etc.) et les échecs de consultation du registre sont signalés comme non vérifiés et exclus des commandes.
- Les détails des alertes OSV sont récupérés avec une concurrence limitée et gestion de la pagination. Une sévérité inconnue est signalée ; un échec empêchant la vérification arrête l’analyse concernée.
- La réutilisation automatique du cache expire après quinze minutes. Les rapports enregistrés restent des instantanés historiques jusqu’à leur suppression ou leur remplacement dans la limite des dix rapports conservés.

### ⚙️ Limites et déploiement

| Limite | Valeur |
| --- | --- |
| Dépôts par analyse sans jeton | 10 |
| Dépôts par analyse avec jeton | 20 |
| Dépôts retournés par la découverte d’un compte | 500 |
| Déclarations de dépendances par manifeste | 500 |
| Taille maximale du corps d’une requête | 256 Kio |
| Analyses simultanées par processus serveur | 2 |
| Délai maximal d’une requête vers un service externe | 8 secondes |
| Délai maximal d’analyse d’un dépôt | 60 secondes |
| Délai maximal d’une analyse multiple | 90 secondes |

Les comptes dépassant les limites doivent être analysés par sélections plus petites ou via des URLs de dépôts individuelles.

Les compteurs de limitation sont propres à chaque processus. Pour un déploiement à plusieurs instances, configurez une limitation partagée au niveau de l’hébergement ou du proxy.

Les en-têtes d’adresse IP transmis par un proxy sont ignorés par défaut : les visiteurs partagent alors le quota du processus. Activez `UPCHECK_TRUST_PROXY_HEADERS=1` uniquement derrière un proxy qui remplace les en-têtes fournis par les clients.

Le projet utilise TypeScript 6. L’option TypeScript 7 du tableau concerne uniquement les plans de mise à jour générés.

### 🛠 Stack technique

| Catégorie                    | Technologies                            |
| ---------------------------- | --------------------------------------- |
| Framework                    | Next.js 16 (App Router)                 |
| Interface                    | React 19, Tailwind CSS v4, Lucide React |
| Internationalisation          | next-intl, routes `/en` et `/fr`        |
| Langage                      | TypeScript 6                            |
| Qualité                      | ESLint 10 + configuration Next.js       |
| Données                      | API GitHub, registre npm, OSV           |
| Gestionnaires pris en charge | Bun, npm, pnpm, Yarn                    |

### 📁 Structure du projet

```text
Upcheck/
├── src/
│   ├── app/
│   │   ├── [locale]/                 # Pages publiques localisées
│   │   ├── api/analyze/route.ts       # Analyse des dépôts et manifestes
│   │   ├── api/repositories/route.ts  # Liste des dépôts d'un compte
│   │   ├── robots.ts                  # /robots.txt
│   │   ├── sitemap.ts                 # /sitemap.xml
│   ├── components/                    # Interface et rapports d'analyse
│   ├── dictionaries/                  # Catalogues en.json et fr.json
│   ├── i18n/                          # Configuration et navigation next-intl
│   ├── lib/                           # Analyse, GitHub, prompts et cache local
│   ├── proxy.ts                       # Négociation et redirection de langue
│   └── types/                         # Types TypeScript partagés
├── tests/                             # Tests de régression Bun
├── README.md
└── package.json
```

### 🚀 Lancer le projet localement

Prérequis : [Bun](https://bun.sh) 1.4 ou plus récent.

```bash
git clone git@github.com:ruddyautem/upcheck.git
cd upcheck
bun install
bun run dev
```

Ouvrez ensuite [http://localhost:3000/en](http://localhost:3000/en) ou [http://localhost:3000/fr](http://localhost:3000/fr). La racine redirige automatiquement vers une langue prise en charge.

### ✅ Vérifications

```bash
bun test
bun run typecheck
bun run lint
bun run build
```

Les tests Bun couvrent notamment les comparaisons de versions, les alias, les erreurs des services externes, les alertes OSV, la validation des API, les limites de scan, le stockage local et les exports, y compris l’activation facultative de TypeScript 7.

### À propos

Créé par [Ruddy Autem](https://github.com/ruddyautem).

---

## English

### 📋 Overview

**Upcheck** is a dependency-analysis tool for JavaScript and TypeScript projects hosted on GitHub. From a `package.json`, it identifies available upgrades, known vulnerabilities, and major changes to plan for, then prepares an update workflow for your package manager.

You can analyse one repository, a selection of repositories, or repositories in a GitHub account. For multi-repository scans, the AI prompts work through projects one at a time: test, fix issues, verify the result, and obtain explicit approval before continuing.

### ✨ Features

- **Repository analysis** from a GitHub URL, `owner/repository` shortcut, or pasted/uploaded `package.json`. Branches and manifest paths are preserved across cache lookups and rescans.
- **Multi-repository scans** by selecting repositories or scanning a GitHub account.
- **Classified updates**: security fixes, minor and patch updates, major updates, or all updates.
- **Actionable guidance**: commands for Bun, npm, pnpm, and Yarn targeting the analyzed versions, with a force option where supported.
- **Manifest export**: updates a copy of the original `package.json`, preserving scripts, configuration, aliases, and dependency groups.
- **Optional TypeScript 7 updates**: excluded by default. The small “ESLint unavailable. Update anyway?” switch in the TypeScript table row includes it in commands, AI prompts, and manifest exports. The choice applies to the open report and resets when reopening or reloading it.
- **Reliable AI prompts**: required tests, diagnosis and fixes until successful, and official documentation when needed.
- **Reusable reports**: up to ten recent scans, including multi-repository scans, are retained in the browser for quick access.
- **Persistent local reports**: up to ten reports accessible through `/en/report/<id>` or `/fr/report/<id>`, including after refreshes and browser restarts. Remove them with “Clear local reports”. If browser storage is unavailable or full, a new analysis remains viewable without guaranteed persistence.
- **Indexable bilingual interface** in French and English, with dedicated `/fr` and `/en` URLs, canonical metadata, and search-engine alternate links.

### 🔒 Security and privacy

- Analysis and repository-list requests are rate limited to reduce abuse.
- Incoming data, including `package.json` manifests, is validated before analysis.
- A GitHub token can be supplied for private repositories or higher API limits. It remains in memory while navigating between reports and is cleared when the page is refreshed or closed.
- Reports are stored locally in the browser, never on an Upcheck server, and can be removed from the recent-scan list or browser settings.
- API errors do not expose sensitive technical details to visitors.

### 🎯 Analysis scope and reliability

- Scans inspect direct declarations in `dependencies`, `devDependencies`, `peerDependencies`, and `optionalDependencies`.
- Ranges such as `^1.0.0` are evaluated using their minimum version. Installed versions and transitive dependencies require a separate lockfile audit.
- npm aliases are resolved to their target package. Unsupported sources (`workspace:`, `file:`, Git, etc.) and failed registry lookups are marked unverified and excluded from commands.
- OSV advisory details are retrieved with bounded concurrency and pagination. Unknown severity is marked explicitly; failures preventing verification stop the affected analysis.
- Automatic cache reuse expires after fifteen minutes. Saved reports remain historical snapshots until removed or replaced within the ten-report retention limit.

### ⚙️ Limits and deployment

| Limit | Value |
| --- | --- |
| Repositories per scan without a token | 10 |
| Repositories per scan with a token | 20 |
| Repositories returned by account discovery | 500 |
| Dependency declarations per manifest | 500 |
| Maximum request body size | 256 KiB |
| Concurrent scans per server process | 2 |
| Maximum upstream request duration | 8 seconds |
| Maximum repository analysis duration | 60 seconds |
| Maximum batch scan duration | 90 seconds |

Accounts exceeding these limits must be scanned through smaller selections or individual repository URLs.

Rate-limit counters are local to each process. For deployments with multiple instances, configure shared rate limiting at the hosting edge or proxy.

Forwarded client IP headers are ignored by default, so visitors share the process quota. Set `UPCHECK_TRUST_PROXY_HEADERS=1` only behind a proxy that replaces client-supplied forwarding headers.

The project uses TypeScript 6. The table’s TypeScript 7 option affects generated update plans only.

### 🛠 Tech stack

| Category                   | Technologies                            |
| -------------------------- | --------------------------------------- |
| Framework                  | Next.js 16 (App Router)                 |
| UI                         | React 19, Tailwind CSS v4, Lucide React |
| Internationalization       | next-intl, `/en` and `/fr` routes       |
| Language                   | TypeScript 6                            |
| Code quality               | ESLint 10 + Next.js configuration       |
| Data                       | GitHub API, npm registry, OSV           |
| Supported package managers | Bun, npm, pnpm, Yarn                    |

### 🚀 Run locally

Requires [Bun](https://bun.sh) 1.4 or newer.

```bash
git clone git@github.com:ruddyautem/upcheck.git
cd upcheck
bun install
bun run dev
```

Then open [http://localhost:3000/en](http://localhost:3000/en) or [http://localhost:3000/fr](http://localhost:3000/fr). The root URL automatically redirects to a supported language.

### ✅ Checks

```bash
bun test
bun run typecheck
bun run lint
bun run build
```

Bun regression tests cover version comparisons, aliases, upstream failures, OSV advisories, API validation, scan limits, browser storage, and exports, including the optional TypeScript 7 override.

### About

Created by [Ruddy Autem](https://github.com/ruddyautem).


### Vérifications complémentaires

Les dialogues de jeton et d’export gèrent le focus, Tab, Maj+Tab, Échap et le retour au déclencheur. L’export Markdown conserve la branche et le chemin du manifeste, et compte les paquets affectés par des avis élevés/critiques. bun run test exécute les tests Bun du projet. Les limites en mémoire restent propres à chaque processus : en déploiement public sur plusieurs instances, configurer un proxy de confiance et un limiteur partagé au niveau de l’hébergement. Cette configuration externe n’est pas remplacée par un compteur local.
