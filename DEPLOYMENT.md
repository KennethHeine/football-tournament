# Azure Static Web App Deployment

This document provides instructions for deploying the Football Tournament application to Azure Static Web Apps.

## Prerequisites

- Azure account (Free tier available)
- Azure CLI installed locally
- PowerShell 5.1+ (Windows) or PowerShell Core 7+ (cross-platform)
- GitHub repository access

## Deployment Options

### Option 1: Automated Deployment with PowerShell (Recommended)

#### Using Federated Credentials (OIDC - Most Secure) 🔐

This method uses OpenID Connect for secure, keyless authentication. **Recommended for production.**

1. **Login to Azure CLI:**

   ```powershell
   az login
   ```

2. **Run the provisioning script:**

   ```powershell
   # PowerShell
   .\scripts\provision-azure.ps1 `
       -ResourceGroup "football-tournament-rg" `
       -Location "westeurope" `
       -AppName "football-tournament-app"
   ```

3. **Set up Service Principal with Federated Credentials:**

   ```powershell
   .\scripts\setup-service-principal.ps1 `
       -GitHubOrg "YourGitHubUsername" `
       -GitHubRepo "football-tournament" `
       -ResourceGroup "football-tournament-rg" `
       -AppName "football-tournament-app"
   ```

4. **Add the GitHub Secrets:**
   The script will output the values you need to add to your GitHub repository:
   - Go to your GitHub repository
   - Navigate to Settings > Secrets and variables > Actions
   - Click "New repository secret" and add each secret:
     - `AZURE_CLIENT_ID`
     - `AZURE_TENANT_ID`
     - `AZURE_SUBSCRIPTION_ID`
     - `AZURE_RESOURCE_GROUP`
     - `AZURE_STATIC_WEB_APP_NAME`

5. **Update the GitHub Actions workflow:**
   - Use `azure-static-web-apps-oidc.yml` or update the existing workflow
   - See [FEDERATED-CREDENTIALS.md](./FEDERATED-CREDENTIALS.md) for details

6. **Push to main branch or merge a PR:**
   The GitHub Actions workflow will automatically deploy your app using OIDC authentication.

📖 **See [FEDERATED-CREDENTIALS.md](./FEDERATED-CREDENTIALS.md) for detailed setup instructions.**

#### Using Static Deployment Token (Quick Start)

1. **Login to Azure CLI:**

   ```powershell
   az login
   ```

2. **Run the provisioning script:**

   **PowerShell:**

   ```powershell
   .\scripts\provision-azure.ps1
   ```

   **Bash (Linux/Mac):**

   ```bash
   ./scripts/provision-azure.sh
   ```

   You can customize the deployment with parameters:

   ```powershell
   # PowerShell
   .\scripts\provision-azure.ps1 `
       -ResourceGroup "my-resource-group" `
       -Location "eastus" `
       -AppName "my-tournament-app"
   ```

3. **Add the deployment token to GitHub:**
   - Go to your GitHub repository
   - Navigate to Settings > Secrets and variables > Actions
   - Click "New repository secret"
   - Name: `AZURE_STATIC_WEB_APPS_API_TOKEN`
   - Value: (paste the token from the script output)

4. **Push to main branch or merge a PR:**
   The GitHub Actions workflow will automatically deploy your app.

## GitHub Actions Workflow

The deployment workflow (`azure-static-web-apps.yml`) supports both authentication methods automatically:

### How It Works

The workflow automatically detects which authentication method to use:

1. **OIDC Authentication** (if `AZURE_CLIENT_ID` secret exists):
   - Logs in to Azure using federated credentials
   - Retrieves deployment token dynamically
   - More secure, no long-lived secrets

2. **Static Token** (if only `AZURE_STATIC_WEB_APPS_API_TOKEN` exists):
   - Uses the static deployment token directly
   - Simpler setup, good for development

### Required Secrets

**For OIDC (Recommended):**

- `AZURE_CLIENT_ID` - Service principal application ID
- `AZURE_TENANT_ID` - Azure AD tenant ID
- `AZURE_SUBSCRIPTION_ID` - Azure subscription ID
- `AZURE_RESOURCE_GROUP` - Resource group name
- `AZURE_STATIC_WEB_APP_NAME` - Static Web App name

**For Static Token:**

- `AZURE_STATIC_WEB_APPS_API_TOKEN` - Deployment token

**Note:** The workflow will use OIDC if available, otherwise fall back to static token. You can use both methods - OIDC will take precedence.

### Option 2: Manual Deployment via Azure Portal

1. **Create a Resource Group:**
   - Login to [Azure Portal](https://portal.azure.com)
   - Search for "Resource groups"
   - Click "Create"
   - Enter a name (e.g., `football-tournament-rg`)
   - Select a region
   - Click "Review + create"

2. **Create a Static Web App:**
   - Search for "Static Web Apps"
   - Click "Create"
   - Select your resource group
   - Enter a name for your app
   - Select Free plan
   - Sign in to GitHub
   - Select your repository and branch
   - Build Presets: Custom
   - App location: `/`
   - Api location: (leave empty)
   - Output location: `dist`
   - Click "Review + create"

3. **GitHub Actions will be automatically configured:**
   Azure will create a workflow file and add the deployment token as a secret.

## Testing Locally

Before deploying, you can test the application locally:

```bash
# Install dependencies
npm install

# Run unit tests
npm test

# Run linter
npm run lint

# Build the application
npm run build

# Preview the build
npm run preview
```

## E2E Testing with Playwright

Run end-to-end tests:

```bash
# Install Playwright browsers
npx playwright install

# Run E2E tests
npm run test:e2e

# Run E2E tests in UI mode
npm run test:e2e:ui
```

## Application Features

- ✅ Browser localStorage for data persistence (no backend required)
- ✅ No authentication required (public access)
- ✅ Tournament creation and management
- ✅ Schedule generation with conflict detection
- ✅ Export to CSV, PNG, and print
- ✅ Share tournaments via URL
- ✅ Fully responsive design

## Monitoring and Management

### View your deployed app:

```bash
az staticwebapp show \
  --name football-tournament-app \
  --resource-group football-tournament-rg
```

### View logs:

```bash
az monitor activity-log list \
  --resource-group football-tournament-rg
```

### Delete the app:

```bash
az staticwebapp delete \
  --name football-tournament-app \
  --resource-group football-tournament-rg

az group delete \
  --name football-tournament-rg
```

## Configuration

The application uses `staticwebapp.config.json` for routing and caching configuration:

- All routes fallback to `/index.html` for client-side routing
- Anonymous access allowed
- Cache headers configured for optimal performance

## Troubleshooting

### Build fails in GitHub Actions:

- Check that all dependencies are correctly listed in `package.json`
- Verify that the build command succeeds locally
- Check GitHub Actions logs for specific errors

### App doesn't load after deployment:

- Verify the output location is set to `dist`
- Check that the build completed successfully
- Clear browser cache and try again

### localStorage not persisting:

- Ensure browser cookies are enabled
- Check browser console for errors
- Verify that you're using the same domain/URL

## Support

For issues and questions:

- Check the [Azure Static Web Apps documentation](https://docs.microsoft.com/azure/static-web-apps/)
- Review GitHub Actions logs
- Check browser console for errors
