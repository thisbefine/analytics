# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2025-01-31

### Added
- Initial release
- Core analytics: `track()`, `identify()`, `page()`, `group()`, `reset()`
- Error tracking: `captureException()`, `captureMessage()`, `addBreadcrumb()`
- Structured logging: `log()` with levels (debug, info, warn, error, fatal)
- Privacy controls: DNT/GPC support, `optOut()`/`optIn()`
- Session management with 30-minute timeout
- React integration with hooks (`useTrack`, `useIdentify`, etc.)
- Next.js integration with automatic page tracking
- Bug report widget (`BugReportFAB`)
- TypeScript support with full type definitions

[Unreleased]: https://github.com/thisbefine/analytics/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/thisbefine/analytics/releases/tag/v0.1.0
