/**
 * @thisbefine/analytics
 *
 * Lightweight analytics SDK for tracking events, identifying users,
 * and measuring what matters for your SaaS.
 *
 * @example
 * ```typescript
 * import { createAnalytics } from '@thisbefine/analytics';
 *
 * const analytics = createAnalytics({
 *   apiKey: 'tbf_xxx',
 *   debug: process.env.NODE_ENV === 'development',
 * });
 *
 * // Track events
 * analytics.track('button_clicked', { buttonId: 'signup' });
 *
 * // Identify users
 * analytics.identify('user_123', { email: 'user@example.com', plan: 'pro' });
 *
 * // Track page views
 * analytics.page('/dashboard');
 *
 * // Reset on logout
 * analytics.reset();
 * ```
 *
 * For React/Next.js integration, use:
 * ```typescript
 * import { AnalyticsProvider, useAnalytics } from '@thisbefine/analytics/react';
 * // or
 * import { AnalyticsProvider, useAnalytics } from '@thisbefine/analytics/next';
 * ```
 *
 * @packageDocumentation
 */

export {
	createAnalytics,
	getAnalytics,
	initAnalytics,
} from "./core/analytics";

export type {
	Breadcrumb,
	ErrorCaptureConfig,
	ErrorPayload,
} from "./core/errors";
export type {
	AccountDeletedProps,
	FeatureActivatedProps,
	InviteAcceptedProps,
	InviteSentProps,
	LoginProps,
	LogoutProps,
	PlanDowngradedProps,
	PlanUpgradedProps,
	SignupProps,
	SubscriptionCancelledProps,
	SubscriptionRenewedProps,
	SubscriptionStartedProps,
	TrialEndedProps,
	TrialStartedProps,
} from "./core/lifecycle";
export { LIFECYCLE_EVENTS } from "./core/lifecycle";
export type { LogLevel } from "./core/logging";

export type {
	AccountTraits,
	Analytics,
	AnalyticsConfig,
	AnalyticsEvent,
	EventContext,
	GroupEvent,
	IdentifyEvent,
	PageEvent,
	TrackEvent,
	UserState,
	UserTraits,
} from "./core/types";

export { DEFAULT_CONFIG, LIBRARY_INFO, STORAGE_KEYS } from "./core/types";

export type { BugReportWidgetOptions } from "./widget/bug-report";
export { createBugReportWidget } from "./widget/bug-report";
