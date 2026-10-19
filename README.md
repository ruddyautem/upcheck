# Upcheck

<div align="center">

**[Français](#français)** · **[English](#english)**

Analysez vos dépendances GitHub, identifiez les risques et préparez des mises à jour fiables.

</div>

---

## Français

### 📋 Présentation

**Upcheck** est un outil d'analyse de dépendances pour les projets JavaScript et TypeScript hébergés sur GitHub. À partir d'un `package.json`, il identifie les mises à jour disponibles, les vulnérabilités connues et les changements majeurs à anticiper, puis prépare une procédure de mise à jour adaptée à votre gestionnaire de paquets.

L'application permet d'analyser un dépôt, une sélection de dépôts ou tous les dépôts d'un compte GitHub. Pour les analyses multiples, les prompts IA font avancer les projets un par un : tests, correction des problèmes rencontrés, vérification, puis validation explicite avant de continuer.

### ✨ Fonctionnalités

- **Analyse de dépôt** : URL GitHub, raccourci `proprietaire/depot`, manifeste `package.json` collé, ou URL pointant vers un sous-dossier.
- **Analyse multi-dépôts** : sélection de plusieurs dépôts, ou analyse des dépôts d'un compte GitHub.
- **Mises à jour classées** : risques de sécurité, mises à jour mineures et correctifs, mises à jour majeures, ou mise à jour complète.
- **Conseils actionnables** : commandes générées pour Bun, npm, pnpm et Yarn, avec option de forçage.
- **Prompts IA fiables** : tests requis, diagnostic et correction jusqu'à réussite, consultation de la documentation officielle lorsque nécessaire.
- **Rapports réutilisables** : jusqu'à dix scans récents, y compris les scans multiples, sont conservés dans le navigateur pour retrouver rapidement un rapport.
- **Rapports locaux persistants** : chaque analyse reçoit une URL `/fr/report/<id>` ou `/en/report/<id>` qui survit à l’actualisation, au changement de langue et au redémarrage du navigateur. Les données restent uniquement dans le stockage local du navigateur et peuvent être supprimées avec « Effacer les rapports locaux ».
- **Interface bilingue et indexable** : français et anglais avec des URLs dédiées (`/fr` et `/en`), des balises canoniques et des liens alternatifs pour les moteurs de recherche.

### 🔒 Sécurité et confidentialité

- Les requêtes d'analyse et de liste de dépôts sont limitées pour réduire les abus.
- Les données reçues sont validées avant analyse, notamment les manifestes `package.json`.
- Un jeton GitHub peut être saisi pour les dépôts privés ou une limite d'API plus haute ; il est utilisé uniquement pendant la session et n'est pas persisté par l'application.
- Les réponses d'erreur côté API n'exposent pas de détails techniques sensibles.
- Les rapports sont stockés localement dans le navigateur, jamais sur un serveur Upcheck, et peuvent être supprimés depuis la liste des scans récents ou les réglages du navigateur.

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
bunx tsc --noEmit
bun run lint
bun run build
```

### À propos

Créé par [Ruddy Autem](https://github.com/ruddyautem).

---

## English

### 📋 Overview

**Upcheck** is a dependency-analysis tool for JavaScript and TypeScript projects hosted on GitHub. From a `package.json`, it identifies available upgrades, known vulnerabilities, and major changes to plan for, then prepares an update workflow for your package manager.

You can analyse one repository, a selection of repositories, or every repository in a GitHub account. For multi-repository scans, the AI prompts work through projects one at a time: test, fix issues, verify the result, and obtain explicit approval before continuing.

### ✨ Features

- **Repository analysis** from a GitHub URL, `owner/repository` shortcut, pasted `package.json`, or subdirectory URL.
- **Multi-repository scans** by selecting repositories or scanning a GitHub account.
- **Classified updates**: security fixes, minor and patch updates, major updates, or all updates.
- **Actionable guidance**: generated commands for Bun, npm, pnpm, and Yarn, with an optional force flag.
- **Reliable AI prompts**: required tests, diagnosis and fixes until successful, and official documentation when needed.
- **Reusable reports**: up to ten recent scans, including multi-repository scans, are retained in the browser for quick access.
- **Persistent local reports**: every scan receives a `/en/report/<id>` or `/fr/report/<id>` URL that survives refreshes, language changes, and browser restarts. Data stays only in browser local storage and can be removed with “Clear local reports”.
- **Indexable bilingual interface** in French and English, with dedicated `/fr` and `/en` URLs, canonical metadata, and search-engine alternate links.

### 🔒 Security and privacy

- Analysis and repository-list requests are rate limited to reduce abuse.
- Incoming data, including `package.json` manifests, is validated before analysis.
- A GitHub token can be supplied for private repositories or higher API limits; it is used only for the active session and is not persisted by the app.
- Reports are stored locally in the browser, never on an Upcheck server, and can be removed from the recent-scan list or browser settings.
- API errors do not expose sensitive technical details to visitors.

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

```bash
git clone git@github.com:ruddyautem/upcheck.git
cd upcheck
bun install
bun run dev
```

Then open [http://localhost:3000/en](http://localhost:3000/en) or [http://localhost:3000/fr](http://localhost:3000/fr). The root URL automatically redirects to a supported language.

### ✅ Checks

```bash
bunx tsc --noEmit
bun run lint
bun run build
```

### About

Created by [Ruddy Autem](https://github.com/ruddyautem).
