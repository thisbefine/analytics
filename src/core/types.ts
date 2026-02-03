import type { ErrorCaptureConfig } from "./errors";
import type {
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
} from "./lifecycle";
import type { LogLevel } from "./logging";
import { VERSION } from "./version";

/**
 * Flush result returned when flushing the event queue
 */
export interface FlushResult {
	/** Whether the flush was successful */
	success: boolean;
	/** Number of events that were sent */
	eventCount: number;
	/** Errors encountered during flush (if any) */
	errors?: Error[];
}

/**
 * Error callback for handling flush failures
 */
export type OnFlushError = (
	error: Error,
	failedEvents: AnalyticsEvent[],
) => void;

/**
 * Callback to modify or filter events before they are queued.
 * Return the modified event, or null to discard it.
 * Useful for PII scrubbing, adding global properties, or filtering events.
 */
export type BeforeSend = (event: AnalyticsEvent) => AnalyticsEvent | null;

/**
 * Consent category types for granular tracking control
 */
export type ConsentCategory = "analytics" | "marketing" | "functional";

/**
 * Consent configuration for granular tracking control
 */
export interface ConsentConfig {
	/**
	 * Which consent categories are enabled.
	 * Default: all categories enabled.
	 */
	categories?: ConsentCategory[];

	/**
	 * Default consent state before user makes a choice.
	 * If false, no tracking until explicit consent.
	 * Default: true (tracks by default, respects DNT).
	 */
	defaultConsent?: boolean;
}

/**
 * Configuration options for the analytics SDK
 */
export interface AnalyticsConfig {
	/** Your Thisbefine API key (starts with tbf_) */
	apiKey: string;

	/** API host URL. Defaults to https://thisbefine.com */
	host?: string;

	/** Number of events to batch before sending. Default: 20 */
	flushAt?: number;

	/** Maximum time (ms) between flushes. Default: 10000 (10s) */
	flushInterval?: number;

	/** Session timeout in ms. Default: 1800000 (30 minutes) */
	sessionTimeout?: number;

	/** Cookie domain for cross-subdomain tracking */
	cookieDomain?: string;

	/** Enable debug logging to console. Default: false */
	debug?: boolean;

	/** Respect Do Not Track browser setting. Default: true */
	respectDNT?: boolean;

	/** Maximum retry attempts for failed requests. Default: 3 */
	maxRetries?: number;

	/** Error capture configuration */
	errors?: ErrorCaptureConfig;

	/** Callback invoked when flush fails. Receives error and failed events. */
	onFlushError?: OnFlushError;

	/** Persist queue to storage for crash recovery. Default: true */
	persistQueue?: boolean;

	/** Maximum number of events to persist. Default: 1000 */
	maxPersistedEvents?: number;

	/**
	 * Callback to modify or filter events before they are queued.
	 * Return the modified event to send it, or null to discard it.
	 * Useful for PII scrubbing, adding global properties, or filtering.
	 */
	beforeSend?: BeforeSend;

	/**
	 * How often to rotate the anonymous ID (in milliseconds).
	 * Default: 30 days (2592000000ms). Set to 0 to disable rotation.
	 * Rotation helps with privacy compliance by limiting long-term tracking.
	 */
	anonymousIdMaxAge?: number;

	/**
	 * Circuit breaker: Number of consecutive failures before opening the circuit.
	 * When open, the SDK stops attempting to send events until the reset timeout.
	 * Default: 5 consecutive failures.
	 */
	circuitBreakerThreshold?: number;

	/**
	 * Circuit breaker: Time in ms to wait before attempting to close the circuit.
	 * Default: 30000 (30 seconds).
	 */
	circuitBreakerResetTimeout?: number;

	/**
	 * Consent categories configuration.
	 * Allows granular control over what types of tracking are enabled.
	 */
	consent?: ConsentConfig;

	/**
	 * Maximum events allowed per second.
	 * Events exceeding this limit will be dropped.
	 * Default: 100 events/second. Set to 0 to disable rate limiting.
	 */
	maxEventsPerSecond?: number;

	/**
	 * Sample rate for events (0 to 1).
	 * 1 = track all events (default)
	 * 0.5 = track 50% of events
	 * 0.1 = track 10% of events
	 * Useful for high-traffic sites to reduce volume.
	 */
	sampleRate?: number;

	/**
	 * Output debug logs as structured JSON.
	 * Useful for log aggregation systems (e.g., Datadog, Splunk).
	 * Default: false (human-readable format)
	 */
	structuredLogging?: boolean;
}

/**
 * Internal resolved configuration with defaults applied
 */
export interface ResolvedConfig {
	apiKey: string;
	host: string;
	flushAt: number;
	flushInterval: number;
	sessionTimeout: number;
	cookieDomain: string | undefined;
	debug: boolean;
	respectDNT: boolean;
	maxRetries: number;
	errors?: ErrorCaptureConfig;
	onFlushError?: OnFlushError;
	persistQueue: boolean;
	maxPersistedEvents: number;
	beforeSend?: BeforeSend;
	anonymousIdMaxAge: number;
	circuitBreakerThreshold: number;
	circuitBreakerResetTimeout: number;
	consent?: ConsentConfig;
	maxEventsPerSecond: number;
	sampleRate: number;
	structuredLogging: boolean;
}

/**
 * Event context sent with every event
 */
export interface EventContext {
	library: {
		name: string;
		version: string;
	};
	userAgent: string;
	locale: string;
	timezone: string;
	screen?: {
		width: number;
		height: number;
	};
	page?: {
		url: string;
		path: string;
		referrer: string;
		title: string;
	};
}

/**
 * Base event structure
 */
export interface BaseEvent {
	type: "track" | "identify" | "page" | "group";
	/** Unique message ID for idempotency/deduplication */
	messageId: string;
	timestamp: string;
	anonymousId: string;
	userId?: string;
	sessionId?: string;
	accountId?: string;
	context?: EventContext;
}

/**
 * Track event for custom user actions
 */
export interface TrackEvent extends BaseEvent {
	type: "track";
	event: string;
	properties?: Record<string, unknown>;
}

/**
 * Identify event for user identification
 */
export interface IdentifyEvent extends BaseEvent {
	type: "identify";
	userId: string;
	traits?: Record<string, unknown>;
}

/**
 * Page event for pageview tracking
 */
export interface PageEvent extends BaseEvent {
	type: "page";
	name?: string;
	properties?: Record<string, unknown>;
	url: string;
	referrer?: string;
}

/**
 * Group event for account/company association
 */
export interface GroupEvent extends BaseEvent {
	type: "group";
	accountId: string;
	traits?: AccountTraits;
}

/**
 * Account/company traits for B2B SaaS
 */
export interface AccountTraits {
	/** Company/account name */
	name?: string;
	/** Subscription plan (e.g., 'free', 'starter', 'pro', 'enterprise') */
	plan?: string;
	/** Monthly recurring revenue in dollars */
	mrr?: number;
	/** Industry vertical */
	industry?: string;
	/** Number of employees */
	employeeCount?: number;
	/** Account creation date */
	createdAt?: string | Date;
	/** Custom properties */
	[key: string]: unknown;
}

/**
 * Union type for all event types
 */
export type AnalyticsEvent =
	| TrackEvent
	| IdentifyEvent
	| PageEvent
	| GroupEvent;

/**
 * User traits for identification
 */
export interface UserTraits {
	email?: string;
	name?: string;
	avatar?: string;
	[key: string]: unknown;
}

/**
 * Current user state
 */
export interface UserState {
	anonymousId: string;
	userId?: string;
	traits?: UserTraits;
	accountId?: string;
	accountTraits?: AccountTraits;
}

/**
 * Batch request payload sent to the API
 */
export interface BatchPayload {
	batch: Array<{
		event: string;
		properties?: Record<string, unknown>;
		timestamp?: string;
		anonymousId?: string;
		userId?: string;
		sessionId?: string;
		url?: string;
		referrer?: string;
	}>;
}

/**
 * Identify request payload
 */
export interface IdentifyPayload {
	userId: string;
	anonymousId?: string;
	traits?: UserTraits;
}

/**
 * Public Analytics interface
 */
export interface Analytics {
	/**
	 * Track a custom event
	 * @param event - Event name (e.g., 'button_clicked', 'signup_completed')
	 * @param properties - Optional event properties
	 */
	track(event: string, properties?: Record<string, unknown>): void;

	/**
	 * Identify a user and associate traits
	 * @param userId - Unique user identifier
	 * @param traits - Optional user traits (email, name, etc.)
	 */
	identify(userId: string, traits?: UserTraits): void;

	/**
	 * Track a page view
	 * @param name - Optional page name
	 * @param properties - Optional page properties
	 */
	page(name?: string, properties?: Record<string, unknown>): void;

	/**
	 * Associate the current user with an account/company
	 * @param accountId - Unique account identifier
	 * @param traits - Optional account traits (name, plan, MRR, etc.)
	 */
	group(accountId: string, traits?: AccountTraits): void;

	/**
	 * Reset the current user session (call on logout)
	 */
	reset(): void;

	/**
	 * Manually flush the event queue
	 * @returns Flush result with success status, event count, and any errors
	 */
	flush(): Promise<FlushResult>;

	/**
	 * Destroy the analytics instance, cleaning up all resources.
	 * Call this when unmounting or when you need to reinitialize.
	 * Flushes remaining events before cleanup.
	 */
	destroy(): Promise<void>;

	/**
	 * Opt out of tracking
	 */
	optOut(): void;

	/**
	 * Opt back in to tracking
	 */
	optIn(): void;

	/**
	 * Check if user has opted out
	 */
	isOptedOut(): boolean;

	/**
	 * Check if a specific consent category is enabled
	 * @param category - The consent category to check
	 */
	hasConsent(category: ConsentCategory): boolean;

	/**
	 * Get all currently consented categories
	 */
	getConsentedCategories(): ConsentCategory[];

	/**
	 * Set consent for specific categories (replaces current consent)
	 * @param categories - Array of categories to enable
	 */
	setConsent(categories: ConsentCategory[]): void;

	/**
	 * Grant consent for a specific category
	 * @param category - The category to grant consent for
	 */
	grantConsent(category: ConsentCategory): void;

	/**
	 * Revoke consent for a specific category
	 * @param category - The category to revoke consent for
	 */
	revokeConsent(category: ConsentCategory): void;

	/**
	 * Get current user state
	 */
	getUser(): UserState;

	/**
	 * Capture an exception and send to error tracking
	 * @param error - The Error object to capture
	 * @param context - Optional additional context
	 */
	captureException(error: Error, context?: Record<string, unknown>): void;

	/**
	 * Capture a message as an error event
	 * @param message - Error message
	 * @param level - Severity level
	 * @param context - Optional additional context
	 */
	captureMessage(
		message: string,
		level?: "error" | "fatal" | "warning",
		context?: Record<string, unknown>,
	): void;

	/**
	 * Add a breadcrumb for error context
	 * @param breadcrumb - Breadcrumb data (type, message, optional data)
	 */
	addBreadcrumb(breadcrumb: {
		type: "click" | "navigation" | "network" | "console" | "custom";
		message: string;
		data?: Record<string, unknown>;
	}): void;

	/**
	 * Send a structured log event
	 * @param message - Log message
	 * @param level - Log level
	 * @param metadata - Optional additional data
	 */
	log(
		message: string,
		level: LogLevel,
		metadata?: Record<string, unknown>,
	): void;

	/**
	 * Track a user signup
	 * @param props - Signup properties
	 */
	signup(props?: SignupProps): void;

	/**
	 * Track a user login
	 * @param props - Login properties
	 */
	login(props?: LoginProps): void;

	/**
	 * Track a user logout
	 * @param props - Logout properties
	 */
	logout(props?: LogoutProps): void;

	/**
	 * Track account deletion
	 * @param props - Account deleted properties
	 */
	accountDeleted(props?: AccountDeletedProps): void;

	/**
	 * Track subscription start
	 * @param props - Subscription properties (plan is required)
	 */
	subscriptionStarted(props: SubscriptionStartedProps): void;

	/**
	 * Track subscription cancellation
	 * @param props - Cancellation properties (plan is required)
	 */
	subscriptionCancelled(props: SubscriptionCancelledProps): void;

	/**
	 * Track subscription renewal
	 * @param props - Renewal properties (plan is required)
	 */
	subscriptionRenewed(props: SubscriptionRenewedProps): void;

	/**
	 * Track plan upgrade
	 * @param props - Upgrade properties (fromPlan, toPlan required)
	 */
	planUpgraded(props: PlanUpgradedProps): void;

	/**
	 * Track plan downgrade
	 * @param props - Downgrade properties (fromPlan, toPlan required)
	 */
	planDowngraded(props: PlanDowngradedProps): void;

	/**
	 * Track trial start
	 * @param props - Trial properties (plan is required)
	 */
	trialStarted(props: TrialStartedProps): void;

	/**
	 * Track trial end
	 * @param props - Trial end properties (plan, converted required)
	 */
	trialEnded(props: TrialEndedProps): void;

	/**
	 * Track invite sent
	 * @param props - Invite properties
	 */
	inviteSent(props?: InviteSentProps): void;

	/**
	 * Track invite accepted
	 * @param props - Invite accepted properties
	 */
	inviteAccepted(props?: InviteAcceptedProps): void;

	/**
	 * Track feature activation
	 * @param props - Feature properties (feature is required)
	 */
	featureActivated(props: FeatureActivatedProps): void;
}

/**
 * Storage interface for persistence
 */
export interface StorageInterface {
	get(key: string): string | null;
	set(key: string, value: string): void;
	remove(key: string): void;
}

/**
 * SDK library info
 */
export const LIBRARY_INFO = {
	name: "@thisbefine/analytics",
	version: VERSION,
};

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG = {
	host: "https://thisbefine.com",
	flushAt: 20,
	flushInterval: 10000,
	sessionTimeout: 30 * 60 * 1000,
	debug: false,
	respectDNT: true,
	maxRetries: 3,
	persistQueue: true,
	maxPersistedEvents: 1000,
	anonymousIdMaxAge: 30 * 24 * 60 * 60 * 1000,
	circuitBreakerThreshold: 5,
	circuitBreakerResetTimeout: 30 * 1000,
	maxEventsPerSecond: 100,
	sampleRate: 1,
	structuredLogging: false,
} as const;

/**
 * Storage key names
 */
export const STORAGE_KEYS = {
	ANONYMOUS_ID: "tif_anonymous_id",
	ANONYMOUS_ID_CREATED: "tif_anonymous_id_created",
	USER_ID: "tif_user_id",
	USER_TRAITS: "tif_user_traits",
	ACCOUNT_ID: "tif_account_id",
	ACCOUNT_TRAITS: "tif_account_traits",
	SESSION_ID: "tif_session_id",
	LAST_ACTIVITY: "tif_last_activity",
	OPT_OUT: "tif_opt_out",
	QUEUE: "tif_event_queue",
} as const;
