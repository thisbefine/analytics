# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.3.2] - 2026-02-03

### Changed

- Added link to documentation site (thisbefine.com/docs) in npm package

## [0.3.1] - 2026-02-03

### Changed

- Improved documentation in npm package

## [0.3.0] - 2026-02-03

### Added

#### Queue & Reliability

- **Queue persistence** - Events are saved to localStorage for crash recovery, ensuring no data loss during page refreshes or browser crashes
- **Circuit breaker pattern** - Prevents hammering failed servers with automatic backoff and recovery
- **Offline detection** - Automatically queues events when offline and resumes sending when connectivity returns
- **Event deduplication** - `messageId` field enables idempotent event processing on the server

#### Privacy & Consent

- **Granular consent management** - Configure consent per category: `analytics`, `marketing`, and `functional`
- **Anonymous ID rotation** - Automatic rotation of anonymous IDs for enhanced privacy compliance

#### Performance

- **Rate limiting** - Sliding window algorithm to prevent event flooding
- **Event sampling** - Configure sample rates for high-traffic sites to reduce data volume

#### Developer Experience

- **`beforeSend` hook** - Modify or filter events before they're sent to the server
- **Structured JSON logging** - Optional JSON format for logs, ideal for log aggregation services
- **`destroy()` method** - Clean resource cleanup for SPAs and component unmounting

#### React Integration

- **`AnalyticsProvider`** - Context-based provider for dependency injection
- **Context-based hooks** - All hooks now support both global and context-based usage

### Documentation

- Added comprehensive documentation site as landing page
- New guides for lifecycle events, consent management, and advanced configuration

## [0.2.1] - 2026-02-02

### Fixed

- Export lifecycle hooks and types from `/next` entry point (previously only exported from `/react`)

## [0.2.0] - 2026-02-02

### Added

#### Lifecycle Events

Native support for tracking SaaS lifecycle events with dedicated methods and full TypeScript support. These methods provide type-safe tracking for common user and subscription events.

**User Lifecycle:**
- `signup()` - Track user registration with auth method, initial plan, and referral attribution
- `login()` - Track user authentication with method and device information
- `logout()` - Track session termination with reason
- `accountDeleted()` - Track account deletion with churn reason and tenure

**Subscription Lifecycle:**
- `subscriptionStarted()` - Track new subscriptions with plan, interval, and MRR
- `subscriptionCancelled()` - Track cancellations with reason, feedback, and churn date
- `subscriptionRenewed()` - Track renewals with renewal count
- `planUpgraded()` - Track upgrades with plan transition and MRR change
- `planDowngraded()` - Track downgrades with reason and MRR impact
- `trialStarted()` - Track trial initiation with duration
- `trialEnded()` - Track trial completion with conversion status

**Engagement:**
- `inviteSent()` - Track team invitations
- `inviteAccepted()` - Track invitation acceptance
- `featureActivated()` - Track feature adoption and first-time usage

#### React Hooks for Lifecycle Events

All lifecycle events are available as React hooks for seamless integration:

```tsx
import { useSignup, useSubscriptionStarted } from '@thisbefine/analytics/react';

function CheckoutSuccess() {
  const subscriptionStarted = useSubscriptionStarted();

  useEffect(() => {
    subscriptionStarted({ plan: 'pro', interval: 'yearly', mrr: 99 });
  }, []);
}
```

Available hooks: `useSignup`, `useLogin`, `useLogout`, `useAccountDeleted`, `useSubscriptionStarted`, `useSubscriptionCancelled`, `useSubscriptionRenewed`, `usePlanUpgraded`, `usePlanDowngraded`, `useTrialStarted`, `useTrialEnded`, `useInviteSent`, `useInviteAccepted`, `useFeatureActivated`

#### New Exports

- `LIFECYCLE_EVENTS` - Constants for all lifecycle event names
- TypeScript interfaces for all lifecycle event properties (`SignupProps`, `SubscriptionStartedProps`, etc.)

### Developer Experience

- Full TypeScript support with autocomplete for all lifecycle event properties
- Runtime warnings when required properties are missing (in debug mode)
- All lifecycle events respect privacy settings (`optOut()`/`optIn()`)
- Events automatically include session context (userId, accountId, sessionId, anonymousId)

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

[Unreleased]: https://github.com/thisbefine/analytics/compare/v0.3.2...HEAD
[0.3.2]: https://github.com/thisbefine/analytics/compare/v0.3.1...v0.3.2
[0.3.1]: https://github.com/thisbefine/analytics/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/thisbefine/analytics/compare/v0.2.1...v0.3.0
[0.2.1]: https://github.com/thisbefine/analytics/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/thisbefine/analytics/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/thisbefine/analytics/releases/tag/v0.1.0
