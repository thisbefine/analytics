# @thisbefine/analytics

> Know what's happening in your app. Fix it before your users complain.

[![CI](https://github.com/thisbefine/analytics/actions/workflows/ci.yml/badge.svg)](https://github.com/thisbefine/analytics/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/@thisbefine/analytics.svg)](https://www.npmjs.com/package/@thisbefine/analytics)
[![bundle size](https://img.shields.io/bundlephobia/minzip/@thisbefine/analytics)](https://bundlephobia.com/package/@thisbefine/analytics)
[![license](https://img.shields.io/npm/l/@thisbefine/analytics.svg)](https://github.com/thisbefine/analytics/blob/main/LICENSE)
[![docs](https://img.shields.io/badge/docs-thisbefine.com-blue)](https://www.thisbefine.com/docs)

Lightweight analytics, error tracking, and logging for indie SaaS. Everything is fine. Your app is on fire? That's fine. Now you'll at least know about it.

**~5KB gzipped** | **TypeScript-first** | **Privacy-respecting** | **Zero dependencies**

## Why Thisbefine?

- **Built for indie hackers** - No enterprise complexity, just what you need
- **All-in-one** - Analytics + errors + logs in one tiny package
- **Privacy-first** - Respects DNT and GPC by default (we're not the bad guys)
- **Framework support** - First-class React and Next.js integration

## Installation

```bash
npm install @thisbefine/analytics
# or
pnpm add @thisbefine/analytics
# or
yarn add @thisbefine/analytics
```

## Quick Start

### Next.js (App Router)

```tsx
// app/layout.tsx
import { Analytics } from '@thisbefine/analytics/next';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
```

Zero config. Reads `NEXT_PUBLIC_TBF_API_KEY` from your environment. Automatic page view tracking on route changes.

```tsx
// components/signup-button.tsx
'use client';
import { useTrack } from '@thisbefine/analytics/next';

export function SignupButton() {
  const track = useTrack('signup_clicked');

  return (
    <button onClick={() => track({ location: 'header' })}>
      Sign Up
    </button>
  );
}
```

### React

```tsx
// main.tsx
import { Analytics } from '@thisbefine/analytics/react';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <>
    <App />
    <Analytics apiKey={import.meta.env.VITE_TBF_API_KEY} />
  </>
);
```

### Vanilla JavaScript

```typescript
import { createAnalytics } from '@thisbefine/analytics';

const analytics = createAnalytics({
  apiKey: 'tbf_xxx',
});

// Track events
analytics.track('button_clicked', { buttonId: 'signup' });

// Identify users
analytics.identify('user_123', { email: 'user@example.com', plan: 'pro' });

// Track page views
analytics.page('/dashboard');
```

## Features

### Analytics

Track what matters. Skip the vanity metrics.

```typescript
// Track custom events
analytics.track('subscription_upgraded', {
  plan: 'pro',
  mrr: 29,
  previous_plan: 'free',
});

// Identify users after login
analytics.identify('user_123', {
  email: 'user@example.com',
  name: 'Jane Doe',
  plan: 'pro',
});

// Associate users with companies/accounts
analytics.group('company_456', {
  name: 'Acme Inc',
  plan: 'enterprise',
  mrr: 499,
});
```

### Error Tracking

Catch errors before users catch you slipping.

```typescript
// Automatic error capture (enabled by default)
// Or capture manually:
analytics.captureException(error, {
  component: 'PaymentForm',
  userId: 'user_123',
});

// Add breadcrumbs for context
analytics.addBreadcrumb({
  category: 'ui',
  message: 'User clicked checkout button',
});

// Log error messages
analytics.captureMessage('Payment failed', 'error', {
  orderId: 'order_789',
});
```

### Structured Logging

Logs that actually help you debug.

```typescript
analytics.log('User completed onboarding', 'info', {
  step: 3,
  duration: 45000,
});

// Log levels: debug, info, warn, error, fatal
analytics.log('Cache miss for user preferences', 'debug', {
  userId: 'user_123',
});
```

### Lifecycle Events

Track key SaaS milestones with built-in methods. These use reserved event names (prefixed with `$`) and typed properties for consistent analytics.

```typescript
// User lifecycle
analytics.signup({ method: 'google', plan: 'free' });
analytics.login({ method: 'passkey', isNewDevice: true });
analytics.logout({ reason: 'manual' });
analytics.accountDeleted({ reason: 'not_using', tenure: 45 });

// Subscription events
analytics.subscriptionStarted({ plan: 'pro', interval: 'monthly', mrr: 29 });
analytics.subscriptionCancelled({ plan: 'pro', reason: 'too_expensive', mrr: 29 });
analytics.subscriptionRenewed({ plan: 'pro', renewalCount: 12 });

// Plan changes
analytics.planUpgraded({ fromPlan: 'starter', toPlan: 'pro', mrrChange: 20 });
analytics.planDowngraded({ fromPlan: 'pro', toPlan: 'starter', reason: 'budget' });

// Trials
analytics.trialStarted({ plan: 'pro', trialDays: 14 });
analytics.trialEnded({ plan: 'pro', converted: true });

// Team/collaboration
analytics.inviteSent({ inviteEmail: 'teammate@company.com', role: 'editor' });
analytics.inviteAccepted({ invitedBy: 'user_123', role: 'editor' });

// Feature adoption
analytics.featureActivated({ feature: 'dark_mode', isFirstTime: true });
```

### Privacy Controls

Because being creepy is bad for business.

```typescript
// SDK respects DNT and GPC by default
// Users can also opt out programmatically:
analytics.optOut();

// Check status
if (analytics.isOptedOut()) {
  console.log('User has opted out');
}

// Opt back in
analytics.optIn();
```

### Consent Management

Granular control over tracking categories for GDPR/CCPA compliance.

```typescript
// Configure consent categories on init
const analytics = createAnalytics({
  apiKey: 'tbf_xxx',
  consent: {
    categories: ['analytics', 'marketing', 'functional'],
    defaultConsent: false, // Don't track until explicit consent
  },
});

// Check if a category is enabled
if (analytics.hasConsent('marketing')) {
  // Show personalized content
}

// Get all consented categories
const categories = analytics.getConsentedCategories();

// Set consent (replaces current consent)
analytics.setConsent(['analytics', 'functional']);

// Grant/revoke individual categories
analytics.grantConsent('marketing');
analytics.revokeConsent('marketing');
```

## React Hooks

All hooks are available from both `@thisbefine/analytics/react` and `@thisbefine/analytics/next`.

### useTrack

Memoized track function for a specific event.

```tsx
const trackClick = useTrack('button_clicked');

<button onClick={() => trackClick({ buttonId: 'cta' })}>
  Click me
</button>
```

### useIdentify

Identify users after authentication.

```tsx
const identify = useIdentify();

// After login
identify(user.id, {
  email: user.email,
  plan: user.plan,
});
```

### useGroup

Associate users with accounts/companies.

```tsx
const group = useGroup();

// After selecting workspace
group(workspace.id, {
  name: workspace.name,
  plan: workspace.plan,
});
```

### useAnalytics

Full analytics instance for advanced usage.

```tsx
const analytics = useAnalytics();

analytics.track('custom_event', { foo: 'bar' });
analytics.captureException(error);
analytics.log('Something happened', 'info');
```

### useReset

Reset session on logout.

```tsx
const reset = useReset();

const handleLogout = () => {
  reset();
  router.push('/login');
};
```

### useCaptureException

Capture errors in components.

```tsx
const captureException = useCaptureException();

try {
  await riskyOperation();
} catch (error) {
  captureException(error as Error, { component: 'RiskyComponent' });
}
```

### useLog

Structured logging from components.

```tsx
const log = useLog();

log('User viewed pricing page', 'info', { referrer: document.referrer });
```

## Configuration

```typescript
import { createAnalytics } from '@thisbefine/analytics';

const analytics = createAnalytics({
  // Required
  apiKey: 'tbf_xxx',

  // Optional - Basic
  host: 'https://thisbefine.com',     // API endpoint
  debug: false,                        // Console logging
  structuredLogging: false,            // Output debug logs as JSON
  flushAt: 20,                         // Batch size before sending
  flushInterval: 10000,                // Ms between flushes
  sessionTimeout: 1800000,             // 30 min session timeout
  cookieDomain: '.yourdomain.com',     // Cross-subdomain tracking
  respectDNT: true,                    // Honor Do Not Track
  maxRetries: 3,                       // Retry failed requests

  // Error tracking
  errors: {
    enabled: true,
    captureUnhandled: true,
    captureConsoleErrors: true,
  },

  // Lifecycle hooks
  onFlushError: (error, failedEvents) => {
    console.error('Failed to send events:', error);
    // Log to your error tracking service
  },
  beforeSend: (event) => {
    // Scrub PII from event properties
    if (event.type === 'track' && event.properties?.email) {
      const { email, ...rest } = event.properties;
      return { ...event, properties: rest };
    }
    // Return null to discard the event
    return event;
  },

  // Queue persistence (crash recovery)
  persistQueue: true,                  // Save queue to localStorage
  maxPersistedEvents: 1000,            // Max events to persist

  // Privacy & consent
  anonymousIdMaxAge: 2592000000,       // Rotate anonymous ID every 30 days
  consent: {
    categories: ['analytics', 'marketing', 'functional'],
    defaultConsent: true,              // Track by default (respects DNT)
  },

  // Rate limiting & sampling
  maxEventsPerSecond: 100,             // Drop events exceeding this rate
  sampleRate: 1,                       // 1 = 100%, 0.5 = 50% of events

  // Circuit breaker (stops hammering failed servers)
  circuitBreakerThreshold: 5,          // Open after N consecutive failures
  circuitBreakerResetTimeout: 30000,   // Try again after 30s
});
```

### Analytics Component Props

```tsx
<Analytics
  apiKey="tbf_xxx"              // Optional if NEXT_PUBLIC_TBF_API_KEY is set
  host="http://localhost:3000"  // For local development
  debug={true}                  // Enable console logging
  trackPageviews={true}         // Auto track page views (default: true)
  config={{                     // Additional config options
    flushAt: 10,
    sessionTimeout: 60 * 60 * 1000,
  }}
/>
```

## API Reference

### Core Methods

| Method | Description |
|--------|-------------|
| `track(event, properties?)` | Track a custom event |
| `identify(userId, traits?)` | Identify a user |
| `page(name?, properties?)` | Track a page view |
| `group(accountId, traits?)` | Associate user with account |
| `reset()` | Clear user data (call on logout) |
| `flush()` | Force send queued events (returns `FlushResult`) |
| `destroy()` | Clean up resources, flush remaining events |
| `optOut()` | Disable tracking |
| `optIn()` | Re-enable tracking |
| `isOptedOut()` | Check opt-out status |
| `getUser()` | Get current user state |

### Consent Methods

| Method | Description |
|--------|-------------|
| `hasConsent(category)` | Check if a category is enabled |
| `getConsentedCategories()` | Get all consented categories |
| `setConsent(categories)` | Set consent (replaces current) |
| `grantConsent(category)` | Enable a category |
| `revokeConsent(category)` | Disable a category |

Categories: `analytics` | `marketing` | `functional`

### Lifecycle Methods

| Method | Description |
|--------|-------------|
| `signup(props?)` | Track user signup |
| `login(props?)` | Track user login |
| `logout(props?)` | Track user logout |
| `accountDeleted(props?)` | Track account deletion |
| `subscriptionStarted(props)` | Track subscription start |
| `subscriptionCancelled(props)` | Track subscription cancellation |
| `subscriptionRenewed(props)` | Track subscription renewal |
| `planUpgraded(props)` | Track plan upgrade |
| `planDowngraded(props)` | Track plan downgrade |
| `trialStarted(props)` | Track trial start |
| `trialEnded(props)` | Track trial end |
| `inviteSent(props?)` | Track invite sent |
| `inviteAccepted(props?)` | Track invite accepted |
| `featureActivated(props)` | Track feature activation |

### Error Tracking Methods

| Method | Description |
|--------|-------------|
| `captureException(error, context?)` | Capture an error |
| `captureMessage(message, level?, context?)` | Capture a message |
| `addBreadcrumb(breadcrumb)` | Add context for errors |

### Logging Method

| Method | Description |
|--------|-------------|
| `log(message, level, metadata?)` | Send structured log |

Log levels: `debug` | `info` | `warn` | `error` | `fatal`

## Storage

The SDK stores data locally with the `tif_` prefix:

| Key | Purpose | Persistence |
|-----|---------|-------------|
| `tif_anonymous_id` | Anonymous user ID | Permanent |
| `tif_user_id` | Identified user ID | Until reset |
| `tif_session_id` | Current session | 30 min timeout |
| `tif_user_traits` | User properties | Until reset |
| `tif_opt_out` | Opt-out flag | Permanent |

Storage fallback: localStorage > sessionStorage > cookies > memory

## TypeScript

Full type definitions included:

```typescript
import type {
  // Core types
  Analytics,
  AnalyticsConfig,
  UserState,
  UserTraits,
  AccountTraits,
  FlushResult,

  // Event types
  AnalyticsEvent,
  TrackEvent,
  IdentifyEvent,
  PageEvent,
  GroupEvent,

  // Hooks
  BeforeSend,
  OnFlushError,

  // Lifecycle event props
  SignupProps,
  LoginProps,
  LogoutProps,
  AccountDeletedProps,
  SubscriptionStartedProps,
  SubscriptionCancelledProps,
  SubscriptionRenewedProps,
  PlanUpgradedProps,
  PlanDowngradedProps,
  TrialStartedProps,
  TrialEndedProps,
  InviteSentProps,
  InviteAcceptedProps,
  FeatureActivatedProps,
} from '@thisbefine/analytics';
```

## Bundle Size

| Import | Size (gzipped) |
|--------|----------------|
| `@thisbefine/analytics` | ~5KB |
| `@thisbefine/analytics/react` | +2KB |
| `@thisbefine/analytics/next` | +1KB |

## Browser Support

Chrome 80+ | Firefox 75+ | Safari 13+ | Edge 80+

## Documentation

Full documentation available at **[thisbefine.com/docs](https://www.thisbefine.com/docs)**

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development setup and guidelines.

## License

MIT
