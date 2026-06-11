# Fodboldturnering — Gratis Kampskema Generator

**Live: [https://fodbold.kscloud.io](https://fodbold.kscloud.io)**

A free, Danish-language tournament-schedule generator for volunteer football
coaches. Set up a tournament, add teams, pick a scheduling mode, and get a
print-ready match schedule across multiple pitches — in under two minutes,
entirely in the browser.

## Features

- **4-step wizard** — settings → teams → scheduling mode → finished schedule
- **Smart scheduling** — round-robin or limited matches, fair distribution
  across pitches, conflict detection, optimized rest time
- **Export anywhere** — print, CSV, PNG image, or a shareable URL that encodes
  the whole tournament
- **Offline-capable PWA** — installable, works pitch-side without coverage
- **No accounts, no backend** — everything lives in browser localStorage

## Tech Stack

React 19 · TypeScript (strict) · Vite 7 · Tailwind CSS 4 · shadcn/ui (Radix)
· Vitest · Playwright · Azure Static Web Apps (Free SKU)

## Development

```bash
npm ci              # install (Node version: see .nvmrc)
npm run dev         # dev server on :5173
npm test            # unit tests (Vitest)
npm run test:e2e    # E2E tests (Playwright)
npm run lint        # ESLint
npm run build       # production build -> out/
```

## Deployment

Fully automated: push to `main` and GitHub Actions builds, tests, and deploys
to Azure Static Web Apps via OIDC (no stored secrets). Pull requests get
preview environments. See [AGENTS.md](./AGENTS.md) for the full picture.

## License

MIT — see [LICENSE](./LICENSE).
