# Copilot Instructions

This repository's single source of truth for coding agents is
**[AGENTS.md](../AGENTS.md)** — commands, structure, CI/CD, conventions, and
the gotchas (date rehydration, OKLCH/PNG export, CSP/self-hosted fonts,
share-link constraints).

Before completing any task, all of these must pass:

```bash
npm run lint && npm run format:check && npm test -- --run && npm run build
```
