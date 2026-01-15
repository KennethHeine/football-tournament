# Service Principal Setup with Federated Credentials

This guide explains how to set up a service principal with federated credentials for secure GitHub Actions authentication to Azure without storing secrets.

## Why Federated Credentials?

Federated credentials (OIDC) provide a more secure alternative to storing static secrets:
- **No secret rotation needed** - Tokens are short-lived and automatically rotated
- **Better security** - No long-lived credentials stored in GitHub
- **Audit trail** - Azure AD logs all authentication attempts
- **Least privilege** - Scoped to specific GitHub repositories and branches

## Prerequisites

- Azure CLI installed
- PowerShell 5.1 or later (for Windows) or PowerShell Core 7+ (for cross-platform)
- Owner or Contributor role on your Azure subscription
- Admin access to your GitHub repository

## Quick Start

### 1. Run the Service Principal Setup Script

```powershell
# Windows PowerShell or PowerShell Core
.\scripts\setup-service-principal.ps1 `
    -GitHubOrg "YourGitHubUsername" `
    -GitHubRepo "football-tournament" `
    -ResourceGroup "football-tournament-rg" `
    -AppName "football-tournament-app"
```

**Parameters:**
- `GitHubOrg` (required) - Your GitHub username or organization name
- `GitHubRepo` (required) - Your repository name
- `ResourceGroup` (optional) - Azure resource group name (default: "football-tournament-rg")
- `AppName` (optional) - Static Web App name (default: "football-tournament-app")
- `ServicePrincipalName` (optional) - Service principal name (default: "sp-football-tournament-github")
- `Location` (optional) - Azure region (default: "westeurope")

### 2. Add GitHub Secrets

After running the script, add these secrets to your GitHub repository:

1. Go to your repository on GitHub
2. Navigate to **Settings** > **Secrets and variables** > **Actions**
3. Click **New repository secret**
4. Add each of the following secrets:

| Secret Name | Description |
|-------------|-------------|
| `AZURE_CLIENT_ID` | The Application (client) ID of the service principal |
| `AZURE_TENANT_ID` | Your Azure AD tenant ID |
| `AZURE_SUBSCRIPTION_ID` | Your Azure subscription ID |
| `AZURE_RESOURCE_GROUP` | The resource group containing your Static Web App |
| `AZURE_STATIC_WEB_APP_NAME` | The name of your Static Web App |

The script output will show you the exact values to use for each secret.

### 3. Update GitHub Actions Workflow

The repository includes two workflow files:

1. **azure-static-web-apps.yml** - Uses static deployment token (current method)
2. **azure-static-web-apps-oidc.yml** - Uses OIDC with service principal (recommended)

To switch to OIDC:

1. Rename or delete `azure-static-web-apps.yml`
2. Rename `azure-static-web-apps-oidc.yml` to `azure-static-web-apps.yml`
3. Uncomment the OIDC sections in the workflow file (look for "Option 1")
4. Comment out or remove the static token sections (look for "Option 2")

Or simply use the OIDC workflow file as-is with a different name.

## What the Script Does

1. **Creates/Retrieves Service Principal**
   - Creates a new service principal or uses an existing one
   - Assigns Contributor role scoped to the resource group

2. **Creates Federated Credentials**
   - Creates a credential for the `main` branch
   - Creates a credential for pull requests
   - Both use GitHub's OIDC provider

3. **Assigns RBAC Permissions**
   - Grants "Website Contributor" role to the service principal
   - Scoped to the specific Static Web App resource

4. **Displays Configuration**
   - Shows all the values needed for GitHub secrets
   - Provides instructions for completing the setup

## Manual Setup (Alternative)

If you prefer to set up manually or the script doesn't work for your environment:

### 1. Create Service Principal

```bash
az ad sp create-for-rbac \
  --name "sp-football-tournament-github" \
  --role contributor \
  --scopes /subscriptions/<subscription-id>/resourceGroups/football-tournament-rg \
  --sdk-auth
```

Save the output - you'll need the `clientId`, `tenantId`, and `subscriptionId`.

### 2. Create Federated Credential for Main Branch

```bash
az ad app federated-credential create \
  --id <app-id> \
  --parameters '{
    "name": "github-actions-main",
    "issuer": "https://token.actions.githubusercontent.com",
    "subject": "repo:<org>/<repo>:ref:refs/heads/main",
    "description": "GitHub Actions federated credential for main branch",
    "audiences": ["api://AzureADTokenExchange"]
  }'
```

### 3. Create Federated Credential for Pull Requests

```bash
az ad app federated-credential create \
  --id <app-id> \
  --parameters '{
    "name": "github-actions-pr",
    "issuer": "https://token.actions.githubusercontent.com",
    "subject": "repo:<org>/<repo>:pull_request",
    "description": "GitHub Actions federated credential for pull requests",
    "audiences": ["api://AzureADTokenExchange"]
  }'
```

### 4. Assign Website Contributor Role

```bash
az role assignment create \
  --assignee <app-id> \
  --role "Website Contributor" \
  --scope /subscriptions/<subscription-id>/resourceGroups/football-tournament-rg/providers/Microsoft.Web/staticSites/football-tournament-app
```

## Workflow Configuration

### OIDC Workflow Example

```yaml
- name: Azure Login with OIDC
  uses: azure/login@v2
  with:
    client-id: ${{ secrets.AZURE_CLIENT_ID }}
    tenant-id: ${{ secrets.AZURE_TENANT_ID }}
    subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}

- name: Get Static Web App Deployment Token
  id: get_token
  run: |
    TOKEN=$(az staticwebapp secrets list \
      --name ${{ secrets.AZURE_STATIC_WEB_APP_NAME }} \
      --resource-group ${{ secrets.AZURE_RESOURCE_GROUP }} \
      --query "properties.apiKey" \
      --output tsv)
    echo "::add-mask::$TOKEN"
    echo "deployment_token=$TOKEN" >> $GITHUB_OUTPUT

- name: Deploy
  uses: Azure/static-web-apps-deploy@v1
  with:
    azure_static_web_apps_api_token: ${{ steps.get_token.outputs.deployment_token }}
    # ... other configuration
```

## Troubleshooting

### "Failed to create service principal"

- **Cause**: You may not have sufficient permissions in Azure AD
- **Solution**: Ask your Azure AD administrator to grant you "Application Administrator" role or create the service principal for you

### "Federated credential already exists"

- **Cause**: The credential was created in a previous run
- **Solution**: This is not an error - the script continues normally. The existing credential will be used.

### "Login failed" in GitHub Actions

- **Cause**: GitHub secrets may be incorrect or the federated credential subject doesn't match
- **Solution**: 
  1. Verify all secrets are correctly set in GitHub
  2. Ensure the subject in the federated credential matches: `repo:ORG/REPO:ref:refs/heads/main` or `repo:ORG/REPO:pull_request`
  3. Check that you've enabled OIDC in your GitHub organization settings (if using an organization)

### "Insufficient privileges to complete the operation"

- **Cause**: The service principal doesn't have the necessary permissions
- **Solution**: 
  1. Verify the service principal has Contributor role on the resource group
  2. Verify the service principal has Website Contributor role on the Static Web App
  3. Re-run the setup script to ensure all role assignments are complete

## Comparison: OIDC vs Static Token

| Feature | OIDC (Recommended) | Static Token |
|---------|-------------------|--------------|
| Security | ✅ Short-lived tokens | ⚠️ Long-lived secret |
| Rotation | ✅ Automatic | ⚠️ Manual |
| Audit | ✅ Full Azure AD logs | ⚠️ Limited |
| Setup complexity | ⚠️ More steps | ✅ Simple |
| Secret storage | ✅ 5 config values | ✅ 1 secret |
| Recommended for | Production | Development/Testing |

## Additional Resources

- [Azure AD Workload Identity Federation](https://docs.microsoft.com/azure/active-directory/develop/workload-identity-federation)
- [GitHub Actions OIDC with Azure](https://docs.github.com/actions/deployment/security-hardening-your-deployments/configuring-openid-connect-in-azure)
- [Azure Static Web Apps Deployment](https://docs.microsoft.com/azure/static-web-apps/github-actions-workflow)

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review Azure AD sign-in logs in the Azure Portal
3. Check GitHub Actions workflow logs for detailed error messages
4. Verify all secrets are correctly set in GitHub repository settings
