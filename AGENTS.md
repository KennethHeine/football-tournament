# AGENTS.md

A guide for AI coding agents working on this Football Tournament application.

## Project Overview

This is a React + TypeScript application for creating football tournament schedules, deployed as an Azure Static Web App. It uses browser localStorage for data persistence without any backend or authentication.

**Tech Stack**: React 19, TypeScript, Vite 7, Tailwind CSS 4, Radix UI, Vitest, Playwright

## Setup Commands

- Install dependencies: `npm ci`
- Start dev server: `npm run dev`
- Run unit tests: `npm test -- --run`
- Run E2E tests: `npm run test:e2e`
- Build for production: `npm run build`
- Run linter: `npm run lint`
- Fix formatting: `npm run format`

## Dev Environment Tips

- Use `npm run dev` while iterating on the application with hot-reload enabled.
- Do **not** run `npm run build` during interactive agent sessions - it switches to production mode.
- The Node.js version is specified in `.nvmrc` (Node 20).
- All dependencies are locked in `package-lock.json` - use `npm ci` for clean installs.
- Playwright browsers need to be installed: `npx playwright install --with-deps chromium`

## Testing Instructions

- Find the CI plan in `.github/workflows/` folder.
- Run `npm test -- --run` to execute all unit tests in `src/test/` directory.
- Run `npm run test:e2e` to execute Playwright E2E tests in `e2e/` directory.
- To focus on one test, use Vitest pattern: `npm test -- --run -t "<test name>"`
- Fix any test or type errors until the whole suite is green.
- After moving files or changing imports, run `npm run lint` to verify ESLint and TypeScript rules pass.
- Add or update tests for the code you change, even if nobody asked.
- Test naming: `*.test.ts` for unit tests, `*.spec.ts` for E2E tests.

## Code Style

- **TypeScript**: Use strict types, prefer interfaces over types, avoid `any`.
- **React**: Use functional components with hooks, prefer `useCallback` and `useMemo` for optimization.
- **Styling**: Use Tailwind utility classes, OKLCH color format (see `src/styles/theme.css`).
- **Components**: Use Radix UI primitives for accessible components.
- **Formatting**: Prettier handles formatting - run `npm run format` before committing.

## PR Instructions

- Always run `npm run lint`, `npm run format`, `npm test -- --run`, and `npm run build` before committing.
- All commands must pass before the work is considered complete.
- Add or update tests for new functionality.
- Update relevant `.md` files if behavior changes.

## Key Files & Directories

| Path | Purpose |
| ---- | ------- |
| `src/components/` | React components |
| `src/hooks/` | Custom hooks (e.g., `useLocalStorage`) |
| `src/lib/` | Utilities (scheduler, color-utils, types) |
| `src/lib/types.ts` | All TypeScript type definitions |
| `src/test/` | Unit tests |
| `e2e/` | Playwright E2E tests |
| `src/styles/theme.css` | Theme colors in OKLCH format |
| `.github/workflows/` | CI/CD workflows |

## Important Constraints

- **No Backend**: All data stored in browser localStorage - never suggest adding a backend API.
- **No Authentication**: Don't add user login, sessions, or auth flows.
- **Browser Storage Only**: All data must use localStorage or sessionStorage.
- **Static Deployment**: Must work as a static site on Azure Static Web Apps.
- **No Paid Features**: Use Azure Free SKU only.

## Data Models

Key types in `src/lib/types.ts`:

- `Tournament` - Main tournament object
- `Team` - Team in a tournament
- `Match` - A scheduled match
- `GeneratedSchedule` - Complete schedule with conflicts

## Custom Hooks

### useLocalStorage

Stores data in browser localStorage:

```typescript
const [value, setValue] = useLocalStorage<Type>('key', defaultValue)
```

## Workflow Examples

### Adding a New Feature

1. Update types in `src/lib/types.ts`
2. Create/update components in `src/components/`
3. Add unit tests in `src/test/`
4. Add E2E tests in `e2e/` if user-facing
5. Update `README.md` if it's a major feature

### Fixing a Bug

1. Write a failing test that reproduces the bug
2. Fix the bug
3. Verify the test passes
4. Check for similar bugs elsewhere
5. Update documentation if needed

## Resources

- **Project Docs**: `README.md`, `PRD.md`, `DEPLOYMENT.md`
- **Deployment**: `FEDERATED-CREDENTIALS.md`, `DEPLOYMENT-QUICK-REFERENCE.md`
- **Testing**: `vitest.config.ts`, `playwright.config.ts`
