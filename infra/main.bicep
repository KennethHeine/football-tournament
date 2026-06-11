// Provisions the Azure Static Web App for football-tournament (fodbold.kscloud.io).
//
// Follows the estate's `static-web` convention: scoped to the resource group the
// central onboarding system created (rg-football-tournament), built and uploaded
// by GitHub Actions via the reusable static-web workflows. The base template does
// not manage custom domains; this app needs one, so an OPTIONAL custom-domain
// resource is added here (deployed by this repo's own SP, which is Owner of its RG).

targetScope = 'resourceGroup'

@description('Base application name used to derive the Static Web App name. A unique suffix is appended automatically.')
@minLength(2)
@maxLength(40)
param appName string = 'football-tournament'

@description('Base region for the deployment. Defaults to the resource group region so the estate region (swedencentral) drives where resources land.')
param location string = resourceGroup().location

// Azure Static Web Apps are offered in only a handful of regions worldwide
// (Central US, East US 2, West US 2, West Europe, East Asia) — none in the
// Nordics. So the SWA cannot deploy to swedencentral/norwayeast; when the RG
// region isn't a supported SWA region we fall back to the closest one, West
// Europe. The SWA serves content from a global edge network, so this carries no
// latency or cost penalty for Nordic users.
var swaSupportedRegions = ['centralus', 'eastus2', 'westus2', 'westeurope', 'eastasia']
var staticWebAppLocation = contains(swaSupportedRegions, location) ? location : 'westeurope'

@description('SKU for the Static Web App.')
@allowed([
  'Free'
  'Standard'
])
param sku string = 'Free'

@description('Custom domain to bind (e.g. fodbold.kscloud.io). Leave empty on the first deploy; set it once the CNAME points at this Static Web App so cname-delegation validation can succeed.')
param customDomainName string = ''

@description('Tags to apply to all resources.')
param tags object = {
  managedBy: 'bicep'
  deployedBy: 'github-actions'
}

// Deterministic unique suffix so re-deployments target the same resource.
var resourceToken = toLower(uniqueString(subscription().id, resourceGroup().name, appName))
var staticWebAppName = 'swa-${appName}-${resourceToken}'

resource staticWebApp 'Microsoft.Web/staticSites@2024-04-01' = {
  name: staticWebAppName
  location: staticWebAppLocation
  tags: tags
  sku: {
    name: sku
    tier: sku
  }
  properties: {
    // The app is built and uploaded by GitHub Actions using the deployment
    // token, so no source-control provider integration is configured here.
    allowConfigFileUpdates: true
    enterpriseGradeCdnStatus: 'Disabled'
  }
}

// Optional custom domain. Only created once `customDomainName` is set — the
// two-phase cutover is: (1) deploy with it empty to create the SWA, (2) point
// the CNAME at this SWA's default hostname, (3) re-deploy with it set so
// cname-delegation validation passes and the managed cert is issued + bound.
resource customDomain 'Microsoft.Web/staticSites/customDomains@2024-04-01' = if (!empty(customDomainName)) {
  parent: staticWebApp
  name: customDomainName
  properties: {
    validationMethod: 'cname-delegation'
  }
}

@description('Resource ID of the Static Web App.')
output staticWebAppId string = staticWebApp.id

@description('Name of the Static Web App (use this with `az staticwebapp secrets list`).')
output staticWebAppName string = staticWebApp.name

@description('Default hostname of the Static Web App (point the fodbold CNAME at this).')
output defaultHostname string = staticWebApp.properties.defaultHostname

@description('Resource group the Static Web App lives in (needed to fetch the deployment token).')
output resourceGroupName string = resourceGroup().name

// The deployment token is a secret and must NOT be emitted as a Bicep output.
// Retrieve it after deployment with:
//   az staticwebapp secrets list --name <staticWebAppName> \
//     --resource-group <resourceGroupName> --query "properties.apiKey" -o tsv
