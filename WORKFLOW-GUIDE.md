# GitHub Actions Workflow Guide

This document explains how the GitHub Actions workflows are configured for the Football Tournament application.

## Workflow Flow Diagram

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
    │ deploy_production  │ ← Builds and deploys to production (depends on test)
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
│  opened/synchronized │
└──────────┬───────────┘
           │
           ▼
    ┌──────────┐
    │   test   │ ← Tests only, no deployment
    └──────────┘


┌──────────────────────┐
│  PR closed/merged    │
└──────────┬───────────┘
           │
           ▼
    ┌──────────────────┐
    │ cleanup_preview  │ ← Removes PR environment
    └──────────────────┘
           │
           │ (if merged)
           ▼
    ┌──────────┐
    │   test   │
    └────┬─────┘
         │
         ▼
    ┌────────────────────┐
    │ deploy_production  │ ← Deploys to production (triggered by push to main)
    └────────────────────┘
```

## Workflow Overview

The application uses two separate workflow files to handle CI/CD operations:

1. **`.github/workflows/deploy-pr.yml`** - Handles PR preview deployments with tests running in parallel
2. **`.github/workflows/deploy-production.yml`** - Handles production deployments (push to main)

This separation makes it easy to see production deployments in the GitHub Actions overview.

## Workflow Jobs

### deploy-pr.yml

#### 1. Test Job (`test`)

**When it runs:**

- On all pull requests (opened, synchronize, reopened)
- **Runs in PARALLEL with deploy_preview** (not a dependency)
- Including Dependabot PRs

**What it does:**

- Checks out code
- Sets up Node.js
- Installs dependencies
- Runs linter (`npm run lint`)
- Checks formatting (`npm run format:check`)
- Runs unit tests (`npm test -- --run`)
- Installs Playwright browsers
- Runs E2E tests (`npm run test:e2e`)
- Builds the application (`npm run build`)

**Purpose:** Ensures code quality for all PRs while deployment runs in parallel

#### 2. Deploy Preview (`deploy_preview`)

**When it runs:**

- On pull requests (opened, synchronize, reopened)
- **Excludes Dependabot PRs** (via `github.actor != 'dependabot[bot]'`)
- **Runs in PARALLEL with test** - does not depend on tests passing

**What it does:**

- Checks out code
- Sets up Node.js
- Installs dependencies
- Builds the application
- Authenticates with Azure using OIDC
- Retrieves deployment token
- Deploys to PR-specific environment: `pr-{PR_NUMBER}`

**Purpose:** Creates preview deployments quickly for manual testing while tests run in parallel

**Example:** PR #42 deploys to environment `pr-42`

#### 3. Cleanup Preview (`cleanup_preview`)

**When it runs:**

- When a pull request is closed (merged or cancelled)

**What it does:**

- Authenticates with Azure using OIDC
- Retrieves deployment token
- Closes/removes the PR preview deployment

**Purpose:** Cleans up temporary environments to save resources

### deploy-production.yml

#### 1. Test Job (`test`)

**When it runs:**

- On pushes to the `main` branch
- On manual workflow dispatch

**What it does:**

- Checks out code
- Sets up Node.js
- Installs dependencies
- Runs linter (`npm run lint`)
- Checks formatting (`npm run format:check`)
- Runs unit tests (`npm test -- --run`)
- Installs Playwright browsers
- Runs E2E tests (`npm run test:e2e`)
- Builds the application (`npm run build`)

**Purpose:** Ensures code quality before production deployment

#### 2. Deploy Production (`deploy_production`)

**When it runs:**

- Only when pushing directly to the `main` branch
- On manual workflow dispatch
- **Depends on `test`** - will not run if tests fail

**What it does:**

- Checks out code
- Sets up Node.js
- Installs dependencies
- Builds the application
- Authenticates with Azure using OIDC
- Retrieves deployment token
- Deploys to production Azure Static Web App

**Purpose:** Automatic deployment to production on merge (after tests pass)

## Deployment Flow

### For Regular PRs (Non-Dependabot)

```
1. Open PR → test (tests) + deploy_preview (runs in PARALLEL)
2. Update PR → test (tests) + deploy_preview (runs in PARALLEL)
3. Close/Merge PR → cleanup_preview (removes PR environment)
   └─ If merged → triggers deploy-production.yml: test → deploy_production
```

### For Dependabot PRs

```
1. Open PR → test only (no deployment)
2. Update PR → test only (no deployment)
3. Merge PR → cleanup_preview (no-op) + triggers deploy-production.yml: test → deploy_production
```

### For Direct Push to Main

```
Push to main → deploy-production.yml: test → deploy_production (depends on test)
```

## Environment URLs

- **Production:** `https://{APP_NAME}.azurestaticapps.net`
- **PR Preview:** `https://{APP_NAME}-pr-{PR_NUMBER}.azurestaticapps.net`

## Required GitHub Secrets

The workflow requires the following secrets to be configured in the repository:

- `AZURE_CLIENT_ID` - Service principal application ID
- `AZURE_TENANT_ID` - Azure AD tenant ID
- `AZURE_SUBSCRIPTION_ID` - Azure subscription ID
- `AZURE_RESOURCE_GROUP` - Resource group name
- `AZURE_STATIC_WEB_APP_NAME` - Static Web App name

See [DEPLOYMENT.md](./DEPLOYMENT.md) for setup instructions.

## Security Features

1. **OIDC Authentication:** Uses federated credentials instead of static tokens
2. **Masked Tokens:** Deployment tokens are masked in logs
3. **Minimal Permissions:** Each job has only required permissions
4. **Dependabot Isolation:** Dependabot PRs cannot deploy (security best practice)

## Testing the Workflow

### To test Dependabot behavior:

1. Create a PR from the Dependabot bot account
2. Verify only `test` job runs (in deploy-pr.yml workflow)
3. Verify no deployment occurs

### To test regular PR behavior:

1. Create a PR from your branch
2. Verify both `test` and `deploy_preview` run in parallel (in deploy-pr.yml workflow)
3. Check the deployment URL in the PR comments
4. Verify preview environment is accessible
5. Close/merge the PR
6. Verify `cleanup_preview` runs and environment is removed

### To test production deployment:

1. Merge a PR to `main`
2. Verify `deploy_production` runs (in deploy-production.yml workflow)
3. Check production URL is updated

## Troubleshooting

### PR deployment not working

- Check if the PR is from Dependabot (won't deploy by design)
- Verify Azure secrets are configured correctly
- Check workflow logs for authentication errors

### Production deployment failed

- Verify the push was to `main` branch
- Check Azure resource exists and is accessible
- Review deployment logs for build/deployment errors

### Cleanup not working

- Check if the PR was actually closed
- Verify cleanup job ran in Actions tab
- Manual cleanup: Use Azure Portal to delete the environment

## Best Practices

1. **Always create PRs** for changes to get preview deployments
2. **Review preview deployments** before merging to production
3. **Monitor failed workflows** and fix issues promptly
4. **Keep dependencies updated** (let Dependabot PRs run tests)
5. **Don't bypass PRs** for production changes (except hotfixes)

## Workflow Maintenance

When updating the workflows:

1. Test changes in a PR first
2. Verify all jobs run as expected
3. Check both Dependabot and regular PR paths
4. Validate production deployment after merge
5. Document any changes in this guide

## Workflow Files

- **`.github/workflows/deploy-pr.yml`** - PR preview deployments with tests in parallel
- **`.github/workflows/deploy-production.yml`** - Production deployments (push to main)
