# AGENTS.md

Guide for AI coding agents working on this repository.

## What this is

A Danish-language, free tournament-schedule generator PWA for volunteer
football coaches (live at <https://fodbold.kscloud.io>). React 19 + TypeScript
strict + Vite 7 + Tailwind CSS 4 + shadcn/ui (Radix), persisted entirely in
browser localStorage. No backend, no auth, Azure Static Web Apps **Free SKU**
only — never suggest adding any of those.

## Commands

```bash
npm ci                      # install (Node version in .nvmrc)
npm run dev                 # dev server on :5173
npm run lint                # ESLint (flat config)
npm run format / format:check
npm test -- --run           # Vitest unit/component tests (src/test/)
npm test -- --run -t "name" # single test
npm run test:coverage       # v8 coverage, thresholds in vitest.config.ts
npm run test:e2e            # Playwright (e2e/), starts dev server itself
npm run build               # tsc -b --noCheck && vite build -> out/  (NOT dist/)
```

Playwright browsers: `PLAYWRIGHT_BROWSERS_PATH=$HOME/.cache/ms-playwright npx playwright install chromium`
(use the same env var when running `test:e2e` if the default cache dir is not writable).

**Before completing any task**: `npm run lint`, `npm run format:check`,
`npm test -- --run`, and `npm run build` must all pass.

## Structure

| Path                                   | Purpose                                                                   |
| -------------------------------------- | ------------------------------------------------------------------------- |
| `src/App.tsx`                          | Landing page + 4-step wizard state machine, URL/localStorage wiring       |
| `src/components/Step1-4*.tsx`          | Wizard steps (settings, teams, scheduling mode, schedule output)          |
| `src/components/Stepper.tsx`           | Wizard progress UI                                                        |
| `src/components/ui/`                   | shadcn/ui components — only the 12 actually used; add more via shadcn CLI |
| `src/lib/scheduler.ts`                 | Schedule generation + CSV/text export (pure functions)                    |
| `src/lib/share-url.ts`                 | Share-link encode/parse + validation                                      |
| `src/lib/color-utils.ts`               | OKLCH→hex conversion + `SAFE_COLORS` palette for PNG export               |
| `src/lib/types.ts`                     | All domain types                                                          |
| `src/hooks/useLocalStorage.ts`         | Persistence hook                                                          |
| `src/index.css`                        | The ONLY stylesheet: fonts, theme tokens (`@theme`), utilities, print     |
| `src/test/`                            | Vitest tests (`*.test.ts[x]`)                                             |
| `e2e/`                                 | Playwright specs (`*.spec.ts`)                                            |
| `scripts/`                             | Agent helpers: `find-share-link.ts`, `verify-share-url.mjs`               |
| `.claude/skills/schedule-share-links/` | Skill for crafting share links that hit schedule wishes                   |
| `infra/`                               | Bicep (SWA + custom domain `fodbold.kscloud.io`)                          |
| `public/staticwebapp.config.json`      | SWA routes, caching, **CSP** headers                                      |

## CI/CD (all automated — never deploy by hand)

- **`deploy.yml`** — thin caller of the reusable workflow
  `KennethHeine/Azure-infrastructure/.github/workflows/static-web-deploy.yml`.
  Push to `main` → lint + format + unit tests + e2e + deploy `out/` to
  production via OIDC (SWA token fetched at deploy time; no stored secrets).
  PRs get preview environments (closed on PR close). The `pull_request`
  trigger has **no path filters** so every PR — including actions-only
  Dependabot bumps — gets the required "Deploy Web App" check (deploy steps
  are skipped for Dependabot inside the reusable workflow).
- **`dependabot-auto-merge.yml`** — when "Deploy Web App" succeeds on a
  Dependabot PR, enables squash auto-merge.
- **`deploy-infra.yml`** — Bicep deploys, triggered by `infra/**` changes.
  Infra changes go through Bicep only.
- **`release.yml`** — on `v*` tags: git-cliff changelog (conventional
  commits — keep using them) + GitHub release.

## Gotchas — read before touching related code

- **Dates rehydrate from JSON**: `Match.startTime/endTime` are `Date` objects
  in memory but strings in localStorage/share state. Anything loading a
  `Tournament` must rebuild `Date`s — see `rehydrateSchedule` usage in
  `App.tsx`. Forgetting this breaks `toLocaleTimeString` at runtime only.
- **PNG export & OKLCH**: html2canvas cannot parse OKLCH. The export renders
  into an isolated iframe styled exclusively with precomputed hex from
  `SAFE_COLORS` (`src/lib/color-utils.ts`). If you change theme colors in
  `src/index.css`, update `SAFE_COLORS` to match. The e2e spec
  `save-as-image.spec.ts` guards this.
- **Fonts are self-hosted** via `@fontsource-variable/*` imports in
  `src/index.css`. The CSP (`style-src 'self'`, `font-src 'self'`) blocks
  external font CDNs — never add a Google Fonts `<link>`. The export iframe
  deliberately uses a system font stack.
- **Share links**: the URL encodes settings + team order, NOT the schedule;
  the app regenerates it deterministically. Team ORDER is the only steering
  wheel. Links over ~2000 chars get a warning toast
  (`MAX_SAFE_SHARE_URL_LENGTH` in App.tsx). Use the
  `schedule-share-links` skill / `scripts/find-share-link.ts` to craft links
  with specific schedule wishes.
- **CSV export** uses `escapeCsvField` (RFC 4180 quoting) and `\r\n` line
  endings for Excel; HTML injected into the export iframe goes through
  `escapeHtml`. Keep both when editing exports.
- **Build output is `out/`**, not `dist/` (the reusable SWA workflow deploys
  `<app_dir>/out`).
- **PWA updates**: `registerType: 'prompt'` + `PWAUpdatePrompt.tsx`. After
  deploys, clients may serve the old precache until they accept the update —
  remember this when "verifying live".
- **Danish UI copy** throughout (`lang="da"`); dates/times intentionally use
  the `en-GB` locale for formatting. Keep copy Danish when adding UI.

## Conventions

- Conventional commits (`feat:`, `fix:`, `refactor:`, `test:`, `docs:`,
  `chore:`, `ci:`) — they feed the release changelog.
- TypeScript strict; avoid `any`; types live in `src/lib/types.ts`.
- Styling via Tailwind utilities + the `@theme` tokens in `src/index.css`.
  OKLCH colors only. Headings use `font-heading` (Bricolage Grotesque),
  body uses Outfit.
- Tests: add/extend tests for any behavior change. Component tests use
  Testing Library + user-event; prefer role/label queries.
- Docs: `README.md` (users), this file (agents), `docs/PRD.md` (product
  intent). Don't reintroduce per-topic root markdown files.
