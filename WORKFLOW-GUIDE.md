# GitHub Actions Workflow Guide

This document explains how the GitHub Actions workflows are configured for the Football Tournament application.

## Workflow Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                    GitHub Actions Workflow Flow                     │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────────┐
│  Push to main    │
└────────┬─────────┘
         │
         ▼
    ┌────────────────────┐
    │ deploy_production  │ ← Runs tests, builds, deploys to production
    └────────────────────┘


┌──────────────────────┐
│  Regular PR opened/  │
│    synchronized      │
└──────────┬───────────┘
           │
           ├─────────────┐
           │             │
           ▼             ▼
    ┌──────────┐  ┌─────────────┐
    │ test_job │  │deploy_preview│ ← Deploys to pr-{number} environment
    └──────────┘  └─────────────┘


┌──────────────────────┐
│  Dependabot PR       │
│  opened/synchronized │
└──────────┬───────────┘
           │
           ▼
    ┌──────────┐
    │ test_job │ ← Tests only, no deployment
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
    ┌────────────────────┐
    │ deploy_production  │ ← Deploys to production (from push to main)
    └────────────────────┘
```

## Workflow Overview

The application uses a single workflow file (`.github/workflows/azure-static-web-apps.yml`) that handles all CI/CD operations with different job paths based on the trigger event and actor.

## Workflow Jobs

### 1. Test Job (`test_job`)

**When it runs:**
- On all pull requests (opened, synchronize, reopened)
- Including Dependabot PRs

**What it does:**
- Checks out code
- Sets up Node.js
- Installs dependencies
- Runs linter (`npm run lint`)
- Runs unit tests (`npm test -- --run`)
- Builds the application (`npm run build`)

**Purpose:** Ensures code quality for all PRs without deploying

### 2. Deploy Production (`deploy_production`)

**When it runs:**
- Only when pushing directly to the `main` branch
- Not on pull requests

**What it does:**
- All steps from test job (lint, test, build)
- Authenticates with Azure using OIDC
- Retrieves deployment token
- Deploys to production Azure Static Web App

**Purpose:** Automatic deployment to production on merge

### 3. Deploy Preview (`deploy_preview`)

**When it runs:**
- On pull requests (opened, synchronize, reopened)
- **Excludes Dependabot PRs** (via `github.actor != 'dependabot[bot]'`)

**What it does:**
- All steps from test job (lint, test, build)
- Authenticates with Azure using OIDC
- Retrieves deployment token
- Deploys to PR-specific environment: `pr-{PR_NUMBER}`

**Purpose:** Creates preview deployments for manual testing before merge

**Example:** PR #42 deploys to environment `pr-42`

### 4. Cleanup Preview (`cleanup_preview`)

**When it runs:**
- When a pull request is closed (merged or cancelled)

**What it does:**
- Authenticates with Azure using OIDC
- Retrieves deployment token
- Closes/removes the PR preview deployment

**Purpose:** Cleans up temporary environments to save resources

## Deployment Flow

### For Regular PRs (Non-Dependabot)

```
1. Open PR → test_job + deploy_preview (separate PR environment)
2. Update PR → test_job + deploy_preview (updates PR environment)
3. Close/Merge PR → cleanup_preview (removes PR environment)
   └─ If merged → deploy_production (deploys to production)
```

### For Dependabot PRs

```
1. Open PR → test_job only (no deployment)
2. Update PR → test_job only (no deployment)
3. Merge PR → cleanup_preview (no-op) + deploy_production
```

### For Direct Push to Main

```
Push to main → deploy_production (direct production deployment)
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
2. Verify only `test_job` runs
3. Verify no deployment occurs

### To test regular PR behavior:
1. Create a PR from your branch
2. Verify both `test_job` and `deploy_preview` run
3. Check the deployment URL in the PR comments
4. Verify preview environment is accessible
5. Close/merge the PR
6. Verify `cleanup_preview` runs and environment is removed

### To test production deployment:
1. Merge a PR to `main`
2. Verify `deploy_production` runs
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

When updating the workflow:
1. Test changes in a PR first
2. Verify all jobs run as expected
3. Check both Dependabot and regular PR paths
4. Validate production deployment after merge
5. Document any changes in this guide
