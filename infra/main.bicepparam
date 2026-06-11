using './main.bicep'

param appName = 'football-tournament'
// location is intentionally not set here — it defaults to resourceGroup().location
// (the estate standardises RGs on swedencentral). The SWA maps that to the nearest
// supported SWA region automatically (see infra/main.bicep).
param sku = 'Free'

// Custom domain cutover (see infra/main.bicep for the two-phase sequence):
//   Phase 1 — keep this EMPTY so the SWA is created first.
//   Phase 2 — after the fodbold CNAME points at this SWA, set it to
//             'fodbold.kscloud.io' and re-deploy to bind the managed cert.
param customDomainName = 'fodbold.kscloud.io'

param tags = {
  managedBy: 'bicep'
  deployedBy: 'github-actions'
  app: 'football-tournament'
}
