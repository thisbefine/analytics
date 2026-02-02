/**
 * Lifecycle Events
 *
 * Reserved event names (prefixed with $) for common SaaS lifecycle events.
 * These events have structured properties and trigger specific insights.
 *
 * SDK methods map to these:
 *   analytics.signup() -> $signup
 *   analytics.login() -> $login
 *   analytics.subscriptionStarted() -> $subscription_started
 *   etc.
 */

// ============================================================
// EVENT NAMES
// ============================================================

export const LIFECYCLE_EVENTS = {
	// User lifecycle
	SIGNUP: "$signup",
	LOGIN: "$login",
	LOGOUT: "$logout",
	ACCOUNT_DELETED: "$account_deleted",

	// Subscription lifecycle
	SUBSCRIPTION_STARTED: "$subscription_started",
	SUBSCRIPTION_CANCELLED: "$subscription_cancelled",
	SUBSCRIPTION_RENEWED: "$subscription_renewed",
	PLAN_UPGRADED: "$plan_upgraded",
	PLAN_DOWNGRADED: "$plan_downgraded",
	TRIAL_STARTED: "$trial_started",
	TRIAL_ENDED: "$trial_ended",

	// Engagement
	INVITE_SENT: "$invite_sent",
	INVITE_ACCEPTED: "$invite_accepted",
	FEATURE_ACTIVATED: "$feature_activated",
} as const;

export type LifecycleEventName =
	(typeof LIFECYCLE_EVENTS)[keyof typeof LIFECYCLE_EVENTS];

// ============================================================
// EVENT PROPERTY TYPES
// ============================================================

/**
 * Common properties available on all lifecycle events
 */
interface BaseLifecycleProps {
	/** Event source: "web", "mobile", "api" */
	source?: string;
	/** Where the user came from */
	referrer?: string;
	/** Marketing campaign identifier */
	campaign?: string;
	/** Allow additional custom properties */
	[key: string]: unknown;
}

// ------------------------------------------------------------
// User Lifecycle
// ------------------------------------------------------------

/**
 * Properties for $signup event
 */
export interface SignupProps extends BaseLifecycleProps {
	/** Auth method: "email", "google", "github", etc. */
	method?: string;
	/** Initial plan if any */
	plan?: string;
	/** User ID who invited them */
	invitedBy?: string;
}

/**
 * Properties for $login event
 */
export interface LoginProps extends BaseLifecycleProps {
	/** Auth method: "email", "google", "passkey", etc. */
	method?: string;
	/** Whether this is a new device */
	isNewDevice?: boolean;
}

/**
 * Properties for $logout event
 */
export interface LogoutProps extends BaseLifecycleProps {
	/** Logout reason: "manual", "session_expired", "forced" */
	reason?: string;
}

/**
 * Properties for $account_deleted event
 */
export interface AccountDeletedProps extends BaseLifecycleProps {
	/** Churn reason if collected */
	reason?: string;
	/** NPS or satisfaction score */
	feedbackScore?: number;
	/** Days since signup */
	tenure?: number;
}

// ------------------------------------------------------------
// Subscription Lifecycle
// ------------------------------------------------------------

/**
 * Properties for $subscription_started event
 */
export interface SubscriptionStartedProps extends BaseLifecycleProps {
	/** Plan name: "pro", "team", "enterprise" */
	plan: string;
	/** Billing interval */
	interval?: "monthly" | "yearly";
	/** Monthly recurring revenue */
	mrr?: number;
	/** Was this converted from a trial? */
	trialConverted?: boolean;
}

/**
 * Properties for $subscription_cancelled event
 */
export interface SubscriptionCancelledProps extends BaseLifecycleProps {
	/** Plan they were on */
	plan: string;
	/** Cancellation reason */
	reason?: string;
	/** User feedback */
	feedback?: string;
	/** Lost MRR */
	mrr?: number;
	/** Days as paying customer */
	tenure?: number;
	/** When access ends (ISO 8601) */
	willChurnAt?: string;
}

/**
 * Properties for $subscription_renewed event
 */
export interface SubscriptionRenewedProps extends BaseLifecycleProps {
	/** Current plan */
	plan: string;
	/** Billing interval */
	interval?: "monthly" | "yearly";
	/** Monthly recurring revenue */
	mrr?: number;
	/** Number of renewals */
	renewalCount?: number;
}

/**
 * Properties for $plan_upgraded event
 */
export interface PlanUpgradedProps extends BaseLifecycleProps {
	/** Previous plan */
	fromPlan: string;
	/** New plan */
	toPlan: string;
	/** Change in MRR (positive) */
	mrrChange?: number;
}

/**
 * Properties for $plan_downgraded event
 */
export interface PlanDowngradedProps extends BaseLifecycleProps {
	/** Previous plan */
	fromPlan: string;
	/** New plan */
	toPlan: string;
	/** Downgrade reason */
	reason?: string;
	/** Change in MRR (negative) */
	mrrChange?: number;
}

/**
 * Properties for $trial_started event
 */
export interface TrialStartedProps extends BaseLifecycleProps {
	/** Plan being trialed */
	plan: string;
	/** Length of trial in days */
	trialDays?: number;
	/** Trial expiration (ISO 8601) */
	expiresAt?: string;
}

/**
 * Properties for $trial_ended event
 */
export interface TrialEndedProps extends BaseLifecycleProps {
	/** Plan that was trialed */
	plan: string;
	/** Did they convert to paid? */
	converted: boolean;
	/** Reason if not converted */
	reason?: string;
}

// ------------------------------------------------------------
// Engagement
// ------------------------------------------------------------

/**
 * Properties for $invite_sent event
 */
export interface InviteSentProps extends BaseLifecycleProps {
	/** Email of invited user */
	inviteEmail?: string;
	/** Role they're being invited as */
	role?: string;
}

/**
 * Properties for $invite_accepted event
 */
export interface InviteAcceptedProps extends BaseLifecycleProps {
	/** User ID who sent the invite */
	invitedBy?: string;
	/** Role they're joining as */
	role?: string;
}

/**
 * Properties for $feature_activated event
 */
export interface FeatureActivatedProps extends BaseLifecycleProps {
	/** Feature name/ID */
	feature: string;
	/** Is this the first time using this feature? */
	isFirstTime?: boolean;
}
