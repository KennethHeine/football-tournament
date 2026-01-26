# Copilot Instructions

This document contains instructions for GitHub Copilot coding agents working on this repository. Trust these instructions and only perform additional searches if information is incomplete or found to be in error.

## Project Overview

**Football Tournament Program Builder** - A React + TypeScript application for creating football tournament schedules, deployed as an Azure Static Web App. All data is stored in browser localStorage with no backend or authentication.

**Tech Stack:** React 19, TypeScript 5.9, Vite 7, Tailwind CSS 4, Radix UI/Shadcn, Vitest, Playwright

**Node.js Version:** 20 (specified in `.nvmrc`)

## Build & Validation Commands

**ALWAYS run these commands in this exact order before completing any task:**

```bash
npm run format      # Fix formatting (Prettier) - ~2 seconds
npm run lint        # Check ESLint rules - ~5 seconds
npm test -- --run   # Run unit tests - ~2 seconds
npm run build       # Production build - ~14 seconds
```

All commands must pass. If any fail, fix issues and re-run until all pass.

### Command Reference

| Command                            | Purpose              | Notes                                           |
| ---------------------------------- | -------------------- | ----------------------------------------------- |
| `npm ci`                           | Install dependencies | Use instead of `npm install` for clean installs |
| `npm run dev`                      | Start dev server     | Runs at http://localhost:5173 with hot reload   |
| `npm run format`                   | Fix formatting       | Run before committing                           |
| `npm run format:check`             | Check formatting     | Used in CI                                      |
| `npm run lint`                     | Run ESLint           | Includes TypeScript checking                    |
| `npm run lint:fix`                 | Auto-fix lint issues |                                                 |
| `npm test -- --run`                | Run unit tests       | 53 tests in 3 files (~2 seconds)                |
| `npm test -- --run -t "test name"` | Run specific test    | Use for focused testing                         |
| `npm run test:e2e`                 | Run E2E tests        | Requires Playwright browsers (~2 minutes)       |
| `npm run build`                    | Production build     | Output in `dist/` folder                        |

### E2E Test Setup

Before running E2E tests, install Playwright browsers:

```bash
npx playwright install --with-deps chromium
```

E2E tests take ~2 minutes and run against a dev server started automatically.

## Project Structure

```
src/
├── App.tsx                    # Main application component
├── components/                # React components
│   ├── Step1TournamentSettings.tsx
│   ├── Step2Teams.tsx
│   ├── Step3SchedulingMode.tsx
│   ├── Step4Schedule.tsx
│   ├── Stepper.tsx
│   └── ui/                    # Shadcn UI components
├── hooks/
│   └── useLocalStorage.ts     # localStorage hook
├── lib/
│   ├── types.ts               # All TypeScript type definitions
│   ├── scheduler.ts           # Match scheduling algorithm
│   ├── color-utils.ts         # Color utilities
│   └── utils.ts               # General utilities
├── styles/
│   └── theme.css              # Theme colors (OKLCH format)
└── test/                      # Unit tests (*.test.ts)

e2e/                           # Playwright E2E tests (*.spec.ts)
.github/workflows/             # CI/CD workflows
```

### Key Files

- **`src/lib/types.ts`** - All TypeScript types (`Tournament`, `Team`, `Match`, `GeneratedSchedule`)
- **`src/lib/scheduler.ts`** - Core scheduling algorithm
- **`src/hooks/useLocalStorage.ts`** - Custom hook for localStorage persistence
- **`vitest.config.ts`** - Unit test configuration
- **`playwright.config.ts`** - E2E test configuration
- **`eslint.config.js`** - ESLint rules (flat config format)
- **`.prettierrc`** - Prettier settings (single quotes, no semicolons, 100 char width)

## Code Style

- **TypeScript:** Use strict types, prefer interfaces over types, avoid `any`
- **React:** Functional components with hooks, use `useCallback`/`useMemo` for optimization
- **Styling:** Tailwind utility classes, OKLCH color format
- **Components:** Radix UI primitives for accessibility
- **Formatting:** Prettier handles all formatting - run `npm run format`
- **Imports:** Use `@/` path alias for `src/` directory

## Testing

- **Unit tests:** Located in `src/test/*.test.ts`, use Vitest + Testing Library
- **E2E tests:** Located in `e2e/*.spec.ts`, use Playwright
- **Test setup:** `src/test/setup.ts` imports `@testing-library/jest-dom`
- Always add or update tests when modifying functionality

## CI/CD Workflows

CI runs on every PR and push to main. The workflow:

1. Installs dependencies (`npm ci`)
2. Runs linter (`npm run lint`)
3. Checks formatting (`npm run format:check`)
4. Runs unit tests (`npm test -- --run`)
5. Installs Playwright browsers
6. Runs E2E tests (`npm run test:e2e`)
7. Builds application (`npm run build`)

## Important Constraints

- **No Backend:** All data in browser localStorage - never add a backend API
- **No Authentication:** No login, sessions, or auth flows
- **Static Deployment:** Must work as a static site on Azure Static Web Apps
- **Browser Storage Only:** Use localStorage or sessionStorage only

## Workflow Examples

### Adding a New Feature

1. Update types in `src/lib/types.ts`
2. Create/update components in `src/components/`
3. Add unit tests in `src/test/`
4. Add E2E tests in `e2e/` if user-facing
5. Run validation commands before completing

### Fixing a Bug

1. Write a failing test that reproduces the bug
2. Fix the bug
3. Verify the test passes
4. Run full validation suite

## Troubleshooting

- **Build fails with chunk size warning:** This is expected, not an error
- **E2E test flaky on Mobile Safari:** The save-as-image test may occasionally timeout - this is a known flaky test
- **Playwright browsers not installed:** Run `npx playwright install --with-deps chromium`
