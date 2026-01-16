# Quick Reference: Deployment Methods

## Method 1: OIDC with Federated Credentials (Recommended) 🔐

**Advantages:**
- ✅ No long-lived secrets
- ✅ Automatic token rotation
- ✅ Better security
- ✅ Full audit trail

**Setup Steps:**

1. **Provision Azure Resources:**
   ```powershell
   .\scripts\provision-azure.ps1
   ```

2. **Create Service Principal:**
   ```powershell
   .\scripts\setup-service-principal.ps1 -GitHubOrg "YourUsername" -GitHubRepo "football-tournament"
   ```

3. **Add GitHub Secrets:**
   - `AZURE_CLIENT_ID`
   - `AZURE_TENANT_ID`
   - `AZURE_SUBSCRIPTION_ID`
   - `AZURE_RESOURCE_GROUP`
   - `AZURE_STATIC_WEB_APP_NAME`

4. **Deploy:**
   Push to main branch - the workflow automatically uses OIDC!

---

## Method 2: Static Deployment Token (Simple)

**Advantages:**
- ✅ Simple setup
- ✅ Quick start
- ✅ Good for testing

**Setup Steps:**

1. **Provision Azure Resources:**
   ```powershell
   .\scripts\provision-azure.ps1
   ```

2. **Add GitHub Secret:**
   - `AZURE_STATIC_WEB_APPS_API_TOKEN` (from script output)

3. **Deploy:**
   Push to main branch - done!

---

## Workflow Behavior

The GitHub Actions workflow (`azure-static-web-apps.yml`) automatically:

- **Detects** which method you're using
- **Prefers** OIDC if `AZURE_CLIENT_ID` secret exists
- **Falls back** to static token otherwise
- **No changes needed** to switch between methods

## Switching Methods

### From Static Token → OIDC

1. Run `setup-service-principal.ps1`
2. Add the 5 OIDC secrets
3. Keep or remove `AZURE_STATIC_WEB_APPS_API_TOKEN`
4. Next deployment will use OIDC

### From OIDC → Static Token

1. Remove OIDC secrets (`AZURE_CLIENT_ID`, etc.)
2. Add `AZURE_STATIC_WEB_APPS_API_TOKEN`
3. Next deployment will use static token

## Troubleshooting

### "Azure Login Failed" (OIDC)

- Verify all 5 secrets are set correctly
- Check federated credential subject matches your repo
- Ensure service principal has correct permissions

### "Invalid deployment token" (Static Token)

- Token may have expired - regenerate using:
  ```powershell
  .\scripts\provision-azure.ps1
  ```
- Update the `AZURE_STATIC_WEB_APPS_API_TOKEN` secret

### "Resource not found"

- Verify `AZURE_RESOURCE_GROUP` and `AZURE_STATIC_WEB_APP_NAME` secrets
- Ensure Static Web App exists in Azure Portal

## Need Help?

- 📖 Full OIDC guide: [FEDERATED-CREDENTIALS.md](./FEDERATED-CREDENTIALS.md)
- 📖 Deployment guide: [DEPLOYMENT.md](./DEPLOYMENT.md)
- 🔍 Check GitHub Actions logs for detailed errors
