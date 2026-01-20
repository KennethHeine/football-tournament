# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-01-20

### Added

- Tournament scheduling with round-robin and limited matches modes
- Multi-pitch support for parallel matches
- Team management with bulk import
- Match conflict detection
- Export to CSV, PNG image, and clipboard text
- Print-friendly schedule view
- Team-specific schedule view
- PWA support for offline access
- Security headers for deployment
- HTML escaping for image export (XSS protection)
- CSV field escaping for formula injection protection
- Prettier for code formatting
- Playwright browser caching in CI
- Release workflow with changelog generation
- Test coverage configuration

### Fixed

- Date parsing validation to prevent invalid schedule generation
- ESLint warnings for shadcn/ui components

### Security

- Added security headers (X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, Referrer-Policy)
- Added HTML entity escaping for dynamic content in image export
- Added CSV formula injection protection in exports
