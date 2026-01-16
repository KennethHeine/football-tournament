# GitHub Copilot Custom Agents & Instructions

This document describes custom agents and instructions for GitHub Copilot to provide better assistance for this Football Tournament application.

## Project Overview

This is a React + TypeScript application for creating football tournament schedules, deployed as an Azure Static Web App. It uses browser localStorage for data persistence without any backend or authentication.

## Custom Instructions for Copilot

When working on this project, GitHub Copilot should be aware of:

### Technology Stack

- **Frontend**: React 19 with TypeScript
- **Build Tool**: Vite 7
- **Styling**: Tailwind CSS 4 with custom OKLCH colors
- **UI Components**: Radix UI + Shadcn
- **State Management**: React Hooks + localStorage (via custom `useLocalStorage` hook)
- **Testing**: Vitest (unit tests) + Playwright (E2E tests)
- **Deployment**: Azure Static Web Apps

### Architecture Patterns

1. **No Backend**: All data stored in browser localStorage
2. **No Authentication**: Public access, no user management
3. **Client-Side Only**: Pure frontend SPA with no API calls
4. **Type Safety**: Strict TypeScript with comprehensive type definitions

### Code Conventions

#### TypeScript
- Use strict TypeScript types
- Prefer interfaces over types for object shapes
- Use `const` for immutable values
- Avoid `any` - use proper typing

#### React
- Use functional components with hooks
- Prefer `useCallback` and `useMemo` for optimization
- Use custom hooks for reusable logic
- Follow React 19 best practices

#### Styling
- Use Tailwind utility classes
- OKLCH color format for theme colors (defined in `src/styles/theme.css`)
- Responsive design with mobile-first approach
- Use Radix UI primitives for accessible components

#### Testing
- Unit tests with Vitest in `src/test/` directory
- E2E tests with Playwright in `e2e/` directory
- Test naming: `*.test.ts` for unit tests, `*.spec.ts` for E2E tests
- Aim for meaningful test coverage, not 100% coverage

### Key Files & Directories

```
football-tournament/
├── src/
│   ├── components/        # React components
│   ├── hooks/            # Custom hooks (e.g., useLocalStorage)
│   ├── lib/              # Utilities (scheduler, color-utils, types)
│   ├── test/             # Unit tests
│   └── styles/           # CSS and theme files
├── e2e/                  # Playwright E2E tests
├── scripts/              # Deployment scripts (PowerShell + Bash)
├── .github/workflows/    # CI/CD workflows
└── staticwebapp.config.json  # Azure Static Web App config
```

### Common Tasks

#### Running Tests
```bash
npm test              # Unit tests
npm run test:ui       # Unit tests with UI
npm run test:e2e      # E2E tests
```

#### Building & Running
```bash
npm run dev           # Development server
npm run build         # Production build
npm run preview       # Preview production build
npm run lint          # ESLint
```

#### Deployment
```powershell
# PowerShell
.\scripts\provision-azure.ps1
.\scripts\setup-service-principal.ps1 -GitHubOrg "user" -GitHubRepo "repo"
```

### Custom Hooks

#### useLocalStorage
Replacement for Spark's `useKV` - stores data in browser localStorage.

```typescript
const [value, setValue] = useLocalStorage<Type>('key', defaultValue)
```

### Important Constraints

1. **No Backend Dependencies**: Never suggest adding a backend API or database
2. **No Authentication**: Don't add user login, sessions, or auth flows
3. **Browser Storage Only**: All data must use localStorage or sessionStorage
4. **Static Deployment**: Must work as a static site on Azure Static Web Apps
5. **Free Tier**: Use Azure Free SKU - no paid features

### Color System

Colors use OKLCH format for better perceptual uniformity:
- Primary (Pitch Green): `oklch(0.55 0.15 145)`
- Accent (Referee Yellow): `oklch(0.85 0.18 95)`
- See `src/lib/color-utils.ts` for conversion utilities

### Data Models

Key types in `src/lib/types.ts`:
- `Tournament` - Main tournament object
- `Team` - Team in a tournament
- `Match` - A scheduled match
- `GeneratedSchedule` - Complete schedule with conflicts

### Deployment Options

1. **OIDC (Recommended)**: Service principal with federated credentials
2. **Static Token**: Traditional deployment token

See `DEPLOYMENT.md` and `FEDERATED-CREDENTIALS.md` for details.

## Agent Behavior Guidelines

### When Suggesting Code Changes

1. **Maintain Type Safety**: Always provide proper TypeScript types
2. **Preserve Existing Patterns**: Follow the established code structure
3. **No Breaking Changes**: Don't remove localStorage or change data models
4. **Test Coverage**: Suggest tests for new functionality
5. **Documentation**: Update relevant .md files if behavior changes

### When Answering Questions

1. **Context Aware**: Reference the specific files and patterns used in this project
2. **Deployment Aware**: Understand this is a static Azure deployment
3. **No Backend**: Never suggest server-side solutions
4. **Practical**: Provide working code examples from the project

### When Reviewing Code

1. **Check Types**: Verify TypeScript types are correct
2. **Check Tests**: Ensure tests exist and pass
3. **Check Accessibility**: Verify Radix UI components are used correctly
4. **Check Performance**: Watch for unnecessary re-renders
5. **Check Security**: Ensure no secrets in code, proper input sanitization

## Examples

### Adding a New Feature

When adding a new feature:
1. Update types in `src/lib/types.ts`
2. Create/update components in `src/components/`
3. Add unit tests in `src/test/`
4. Add E2E tests in `e2e/` if user-facing
5. Update `README.md` if it's a major feature

### Fixing a Bug

When fixing a bug:
1. Write a failing test that reproduces the bug
2. Fix the bug
3. Verify the test passes
4. Check for similar bugs elsewhere
5. Update documentation if needed

## Resources

- **Project Docs**: `README.md`, `PRD.md`, `DEPLOYMENT.md`
- **TypeScript**: `src/lib/types.ts` for all type definitions
- **Testing**: `vitest.config.ts`, `playwright.config.ts`
- **Deployment**: `FEDERATED-CREDENTIALS.md`, `DEPLOYMENT-QUICK-REFERENCE.md`

---

**Note**: This project migrated from GitHub Spark to Azure Static Web Apps. All Spark-related code and authentication has been removed. The focus is on a simple, static, client-side application.
