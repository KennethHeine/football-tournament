# Azure Static Web App Deployment

This document provides instructions for deploying the Football Tournament application to Azure Static Web Apps.

## Prerequisites

- Azure account (Free tier available)
- Azure CLI installed locally
- GitHub repository access

## Option 1: Automated Deployment via Script

### Steps:

1. **Login to Azure CLI:**
   ```bash
   az login
   ```

2. **Run the provisioning script:**
   ```bash
   ./scripts/provision-azure.sh
   ```

   You can customize the deployment by setting environment variables:
   ```bash
   RESOURCE_GROUP="my-resource-group" \
   LOCATION="eastus" \
   APP_NAME="my-tournament-app" \
   ./scripts/provision-azure.sh
   ```

3. **Add the deployment token to GitHub:**
   - Go to your GitHub repository
   - Navigate to Settings > Secrets and variables > Actions
   - Click "New repository secret"
   - Name: `AZURE_STATIC_WEB_APPS_API_TOKEN`
   - Value: (paste the token from the script output)

4. **Push to main branch or merge a PR:**
   The GitHub Actions workflow will automatically deploy your app.

## Option 2: Manual Deployment via Azure Portal

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
