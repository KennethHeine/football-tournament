# Automation Guide for Static Frontend Apps

A comprehensive guide for setting up automated testing, CI/CD workflows, dependency management, and AI-assisted development for static frontend applications deployed to Azure Static Web Apps.

This guide documents the complete automation setup used in this project, designed to be reusable for other static frontend apps.

---

## Table of Contents

- [Overview](#overview)
- [Testing Setup](#testing-setup)
  - [Unit Testing with Vitest](#unit-testing-with-vitest)
  - [E2E Testing with Playwright](#e2e-testing-with-playwright)
- [GitHub Workflows](#github-workflows)
  - [PR Preview Deployments](#pr-preview-deployments)
  - [Production Deployment](#production-deployment)
  - [Release Automation](#release-automation)
  - [Copilot Setup Steps](#copilot-setup-steps)
- [Dependabot Automation](#dependabot-automation)
  - [Configuration](#dependabot-configuration)
  - [Auto-Merge](#dependabot-auto-merge)
- [GitHub Copilot Setup](#github-copilot-setup)
  - [AGENTS.md Configuration](#agentsmd-configuration)
  - [Copilot Setup Steps Workflow](#copilot-setup-steps-workflow)
- [Code Quality Tools](#code-quality-tools)
  - [ESLint](#eslint)
  - [Prettier](#prettier)
- [Configuration Reference](#configuration-reference)
- [Quick Start Template](#quick-start-template)

---

## Overview

This project implements a fully automated development workflow with:

- **Testing**: Unit tests (Vitest) + E2E tests (Playwright)
- **CI/CD**: Automated deployments to Azure Static Web Apps
- **Dependencies**: Automated updates via Dependabot with auto-merge
- **AI Development**: GitHub Copilot integration with custom agent instructions
- **Code Quality**: ESLint + Prettier with automated checks

### Key Benefits

1. **Zero manual deployments** - Push to main triggers production deployment
2. **PR preview environments** - Every PR gets its own preview URL
3. **Automated dependency updates** - Dependabot keeps packages current
4. **Automated testing** - All PRs must pass tests before merge
5. **AI-assisted development** - Copilot understands your codebase

---

## Testing Setup

### Unit Testing with Vitest

[Vitest](https://vitest.dev/) is used for unit testing React components and utility functions.

#### Configuration File

📄 **File**: [`vitest.config.ts`](./vitest.config.ts)

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react-swc'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
    exclude: ['**/node_modules/**', '**/dist/**', '**/e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/test/**',
        'src/vite-*.d.ts',
        'src/main.tsx',
        'src/components/ui/**',
      ],
      thresholds: {
        branches: 70,
        functions: 70,
        lines: 70,
        statements: 70,
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
})
```

#### Test Setup File

📄 **File**: [`src/test/setup.ts`](./src/test/setup.ts)

```typescript
import '@testing-library/jest-dom'
```

#### Required Dependencies

```json
{
  "devDependencies": {
    "@testing-library/jest-dom": "^6.9.1",
    "@testing-library/react": "^16.3.2",
    "@testing-library/user-event": "^14.6.1",
    "@vitest/ui": "^4.0.17",
    "jsdom": "^27.4.0",
    "vitest": "^4.0.17"
  }
}
```

#### Package.json Scripts

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage"
  }
}
```

#### Test File Structure

```
src/
└── test/
    ├── setup.ts              # Test setup (jest-dom)
    ├── scheduler.test.ts     # Unit tests for scheduler logic
    ├── color-utils.test.ts   # Unit tests for color utilities
    └── useLocalStorage.test.ts # Unit tests for hooks
```

#### Running Tests

```bash
# Run all unit tests
npm test -- --run

# Run tests in watch mode
npm test

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage

# Run specific test
npm test -- --run -t "test name"
```

---

### E2E Testing with Playwright

[Playwright](https://playwright.dev/) handles end-to-end testing with real browser automation.

#### Configuration File

📄 **File**: [`playwright.config.ts`](./playwright.config.ts)

```typescript
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 4 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
})
```

#### Required Dependencies

```json
{
  "devDependencies": {
    "@playwright/test": "^1.57.0"
  }
}
```

#### Package.json Scripts

```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui"
  }
}
```

#### Test File Structure

```
e2e/
├── tournament.spec.ts      # Tournament workflow tests
├── save-as-image.spec.ts   # Export functionality tests
└── pwa-update.spec.ts      # PWA update tests
```

#### Running E2E Tests

```bash
# Install browsers (first time only)
npx playwright install --with-deps chromium webkit

# Run all E2E tests
npm run test:e2e

# Run E2E tests with UI
npm run test:e2e:ui

# Run specific test file
npx playwright test tournament.spec.ts
```

---

## GitHub Workflows

All workflow files are in [`.github/workflows/`](./.github/workflows/).

### Workflow Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    GitHub Actions Workflow Flow                     │
└─────────────────────────────────────────────────────────────────────┘

                        ┌─────────────────────────────────────────┐
                        │       deploy-production.yml              │
                        └─────────────────────────────────────────┘

┌──────────────────┐
│  Push to main    │
└────────┬─────────┘
         │
         ▼
    ┌──────────┐
    │   test   │ ← Runs lint, format check, unit tests, E2E tests, build
    └────┬─────┘
         │
         ▼
    ┌────────────────────┐
    │ deploy_production  │ ← Deploys to production (depends on test)
    └────────────────────┘


                        ┌─────────────────────────────────────────┐
                        │          deploy-pr.yml                   │
                        └─────────────────────────────────────────┘

┌──────────────────────┐
│  Regular PR opened/  │
│    synchronized      │
└──────────┬───────────┘
           │
           ├─────────────┐
           │             │
           ▼             ▼
    ┌──────────┐  ┌─────────────┐
    │   test   │  │deploy_preview│ ← Both run in PARALLEL
    └──────────┘  └─────────────┘


┌──────────────────────┐
│  Dependabot PR       │
└──────────┬───────────┘
           │
           ▼
    ┌──────────┐
    │   test   │ ← Tests only, no deployment (security best practice)
    └──────────┘
           │ (if tests pass)
           ▼
    ┌────────────────────┐
    │ dependabot-auto-   │ ← Auto-merges on success
    │ merge.yml          │
    └────────────────────┘
```

### PR Preview Deployments

📄 **File**: [`.github/workflows/deploy-pr.yml`](./.github/workflows/deploy-pr.yml)

**Purpose**: Creates preview environments for pull requests

**Features**:
- Runs tests and deployment in parallel for fast feedback
- Creates unique PR preview URLs: `https://{app}-pr-{number}.azurestaticapps.net`
- Skips deployment for Dependabot PRs (security)
- Automatically cleans up preview environments when PR is closed

**Jobs**:
| Job | Trigger | Purpose |
|-----|---------|---------|
| `test` | All PRs | Lint, format, unit tests, E2E tests, build |
| `deploy_preview` | Non-Dependabot PRs | Deploy to PR-specific environment |
| `cleanup_preview` | PR closed | Remove preview environment |

### Production Deployment

📄 **File**: [`.github/workflows/deploy-production.yml`](./.github/workflows/deploy-production.yml)

**Purpose**: Deploys to production when code is pushed to main

**Features**:
- Tests must pass before deployment
- Uses build artifacts to avoid rebuilding
- OIDC authentication with Azure (no static tokens)

**Jobs**:
| Job | Trigger | Purpose |
|-----|---------|---------|
| `test` | Push to main | Full test suite |
| `deploy_production` | After test passes | Deploy to production |

### Release Automation

📄 **File**: [`.github/workflows/release.yml`](./.github/workflows/release.yml)

**Purpose**: Creates GitHub releases when tags are pushed

**Features**:
- Triggers on version tags (e.g., `v1.0.0`)
- Generates changelog using [git-cliff](https://git-cliff.org/)
- Creates GitHub release with release notes
- Supports pre-release tags (`-alpha`, `-beta`, `-rc`)

**Trigger**:
```yaml
on:
  push:
    tags:
      - 'v*'
```

### Copilot Setup Steps

📄 **File**: [`.github/workflows/copilot-setup-steps.yml`](./.github/workflows/copilot-setup-steps.yml)

**Purpose**: Prepares the environment for GitHub Copilot coding agent

**Features**:
- Installs Node.js and dependencies
- Caches Playwright browsers
- Enables Copilot to run tests and builds

---

## Dependabot Automation

### Dependabot Configuration

📄 **File**: [`.github/dependabot.yml`](./.github/dependabot.yml)

```yaml
version: 2
updates:
  - package-ecosystem: 'npm'
    directory: '/'
    schedule:
      interval: 'daily'

  - package-ecosystem: 'github-actions'
    directory: '/'
    schedule:
      interval: 'weekly'

  - package-ecosystem: 'devcontainers'
    directory: '/'
    schedule:
      interval: 'weekly'
```

**What it updates**:
| Ecosystem | Schedule | Purpose |
|-----------|----------|---------|
| npm | Daily | Keep npm packages current |
| github-actions | Weekly | Update GitHub Actions versions |
| devcontainers | Weekly | Update dev container images |

### Dependabot Auto-Merge

📄 **File**: [`.github/workflows/dependabot-auto-merge.yml`](./.github/workflows/dependabot-auto-merge.yml)

**Purpose**: Automatically merges Dependabot PRs after tests pass

**How it works**:
1. Waits for `Deploy PR Preview` workflow to complete
2. Checks if the workflow was triggered by Dependabot
3. Enables auto-merge with squash strategy

**Security**:
- Only triggers when tests pass
- Uses workflow_run event (not direct PR trigger)
- Dependabot PRs don't get preview deployments

---

## GitHub Copilot Setup

### AGENTS.md Configuration

📄 **File**: [`AGENTS.md`](./AGENTS.md)

The `AGENTS.md` file provides instructions for AI coding agents (like GitHub Copilot) working on the repository.

**Key Sections**:

1. **Project Overview** - Tech stack and architecture
2. **Setup Commands** - How to install and run
3. **Testing Instructions** - How to run tests
4. **Code Style** - Coding conventions
5. **PR Instructions** - What to do before completing work
6. **Key Files & Directories** - Important file locations
7. **Important Constraints** - What NOT to do

**Example Content**:

```markdown
## Setup Commands

- Install dependencies: `npm ci`
- Start dev server: `npm run dev`
- Run unit tests: `npm test -- --run`
- Run E2E tests: `npm run test:e2e`
- Build for production: `npm run build`
- Run linter: `npm run lint`
- Fix formatting: `npm run format`

## PR Instructions

**IMPORTANT: Before completing any task, Copilot MUST run these validation commands:**

\`\`\`bash
npm run format      # Fix formatting issues
npm run lint        # Check for linting errors
npm test -- --run   # Run all unit tests
npm run build       # Verify production build succeeds
\`\`\`
```

### Copilot Setup Steps Workflow

📄 **File**: [`.github/workflows/copilot-setup-steps.yml`](./.github/workflows/copilot-setup-steps.yml)

**Purpose**: Prepares the environment when Copilot starts working

```yaml
jobs:
  # The job MUST be called `copilot-setup-steps`
  copilot-setup-steps:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v6

      - name: Set up Node.js
        uses: actions/setup-node@v6
        with:
          node-version-file: '.nvmrc'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Cache Playwright Browsers
        uses: actions/cache@v5
        with:
          path: ~/.cache/ms-playwright
          key: playwright-${{ runner.os }}-${{ hashFiles('package-lock.json') }}

      - name: Install Playwright Browsers
        run: npx playwright install chromium webkit --with-deps
```

**Key Points**:
- Job must be named `copilot-setup-steps`
- Uses `.nvmrc` for Node.js version
- Caches Playwright browsers for faster subsequent runs

---

## Code Quality Tools

### ESLint

📄 **File**: [`eslint.config.js`](./eslint.config.js)

```javascript
import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import eslintConfigPrettier from 'eslint-config-prettier'

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'playwright-report', 'test-results'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      }],
    },
  },
  eslintConfigPrettier
)
```

**Required Dependencies**:
```json
{
  "devDependencies": {
    "@eslint/js": "^9.39.2",
    "eslint": "^9.39.2",
    "eslint-config-prettier": "^10.1.8",
    "eslint-plugin-react-hooks": "^7.0.1",
    "eslint-plugin-react-refresh": "^0.4.26",
    "typescript-eslint": "^8.53.1"
  }
}
```

### Prettier

📄 **File**: [`.prettierrc`](./.prettierrc)

```json
{
  "semi": false,
  "singleQuote": true,
  "trailingComma": "es5",
  "tabWidth": 2,
  "printWidth": 100,
  "bracketSpacing": true,
  "arrowParens": "avoid"
}
```

📄 **File**: [`.prettierignore`](./.prettierignore) - Files to exclude from formatting

**Required Dependencies**:
```json
{
  "devDependencies": {
    "prettier": "^3.8.1"
  }
}
```

**Package.json Scripts**:
```json
{
  "scripts": {
    "format": "prettier --write .",
    "format:check": "prettier --check ."
  }
}
```

---

## Configuration Reference

### All Configuration Files

| File | Purpose | Reference |
|------|---------|-----------|
| [`.github/workflows/deploy-pr.yml`](./.github/workflows/deploy-pr.yml) | PR preview deployments | [GitHub Workflows](#github-workflows) |
| [`.github/workflows/deploy-production.yml`](./.github/workflows/deploy-production.yml) | Production deployment | [GitHub Workflows](#github-workflows) |
| [`.github/workflows/release.yml`](./.github/workflows/release.yml) | Release automation | [Release Automation](#release-automation) |
| [`.github/workflows/copilot-setup-steps.yml`](./.github/workflows/copilot-setup-steps.yml) | Copilot environment setup | [Copilot Setup](#copilot-setup-steps-workflow) |
| [`.github/workflows/dependabot-auto-merge.yml`](./.github/workflows/dependabot-auto-merge.yml) | Auto-merge Dependabot PRs | [Dependabot Auto-Merge](#dependabot-auto-merge) |
| [`.github/dependabot.yml`](./.github/dependabot.yml) | Dependabot configuration | [Dependabot Configuration](#dependabot-configuration) |
| [`vitest.config.ts`](./vitest.config.ts) | Unit test configuration | [Unit Testing](#unit-testing-with-vitest) |
| [`playwright.config.ts`](./playwright.config.ts) | E2E test configuration | [E2E Testing](#e2e-testing-with-playwright) |
| [`eslint.config.js`](./eslint.config.js) | ESLint configuration | [ESLint](#eslint) |
| [`.prettierrc`](./.prettierrc) | Prettier configuration | [Prettier](#prettier) |
| [`AGENTS.md`](./AGENTS.md) | AI agent instructions | [AGENTS.md](#agentsmd-configuration) |
| [`.nvmrc`](./.nvmrc) | Node.js version | - |

### Required GitHub Secrets

For Azure Static Web Apps deployment:

| Secret | Description |
|--------|-------------|
| `AZURE_CLIENT_ID` | Service principal application ID |
| `AZURE_TENANT_ID` | Azure AD tenant ID |
| `AZURE_SUBSCRIPTION_ID` | Azure subscription ID |
| `AZURE_RESOURCE_GROUP` | Resource group name |
| `AZURE_STATIC_WEB_APP_NAME` | Static Web App name |

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed setup instructions.

---

## Quick Start Template

To set up this automation for a new static frontend app:

### 1. Copy Configuration Files

```bash
# Create directories
mkdir -p .github/workflows src/test e2e

# Copy workflow files
cp .github/workflows/*.yml <new-project>/.github/workflows/
cp .github/dependabot.yml <new-project>/.github/

# Copy test configs
cp vitest.config.ts <new-project>/
cp playwright.config.ts <new-project>/

# Copy code quality configs
cp eslint.config.js <new-project>/
cp .prettierrc <new-project>/
cp .prettierignore <new-project>/

# Copy agent instructions
cp AGENTS.md <new-project>/

# Copy Node version
cp .nvmrc <new-project>/
```

### 2. Install Dependencies

```bash
# Testing
npm install -D vitest @vitest/ui jsdom @testing-library/jest-dom @testing-library/react @testing-library/user-event @playwright/test

# Linting & Formatting
npm install -D eslint @eslint/js typescript-eslint eslint-plugin-react-hooks eslint-plugin-react-refresh eslint-config-prettier prettier
```

### 3. Add Package.json Scripts

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b --noCheck && vite build",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui"
  }
}
```

### 4. Configure Azure Secrets

Follow [DEPLOYMENT.md](./DEPLOYMENT.md) to:
1. Create Azure Static Web App
2. Set up service principal with OIDC
3. Add secrets to GitHub repository

### 5. Create AGENTS.md

Customize the `AGENTS.md` file for your project with:
- Project-specific setup commands
- Code conventions
- Key files and directories
- Important constraints

### 6. Verify Setup

```bash
# Install dependencies
npm ci

# Run tests
npm test -- --run
npm run test:e2e

# Check code quality
npm run lint
npm run format:check

# Build
npm run build
```

---

## Related Documentation

- [DEPLOYMENT.md](./DEPLOYMENT.md) - Azure deployment setup
- [DEPLOYMENT-QUICK-REFERENCE.md](./DEPLOYMENT-QUICK-REFERENCE.md) - Quick deployment commands
- [FEDERATED-CREDENTIALS.md](./FEDERATED-CREDENTIALS.md) - OIDC setup guide
- [WORKFLOW-GUIDE.md](./WORKFLOW-GUIDE.md) - Detailed workflow documentation
- [AGENTS.md](./AGENTS.md) - AI agent instructions

---

## Summary

This automation setup provides:

| Feature | Implementation |
|---------|---------------|
| **Unit Testing** | Vitest with React Testing Library |
| **E2E Testing** | Playwright with mobile device testing |
| **CI/CD** | GitHub Actions with Azure Static Web Apps |
| **PR Previews** | Automatic preview URLs for each PR |
| **Dependency Updates** | Dependabot with auto-merge |
| **Code Quality** | ESLint + Prettier |
| **AI Development** | GitHub Copilot with AGENTS.md |
| **Release Management** | Git-cliff changelog + GitHub Releases |

By following this guide, you can set up the same level of automation for any static frontend application.
