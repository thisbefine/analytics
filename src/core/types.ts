import type { ErrorCaptureConfig } from "./errors";
import type { LogLevel } from "./logging";
import { VERSION } from "./version";

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
	 */
	flush(): Promise<void>;

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
} as const;

/**
 * Storage key names
 */
export const STORAGE_KEYS = {
	ANONYMOUS_ID: "tif_anonymous_id",
	USER_ID: "tif_user_id",
	USER_TRAITS: "tif_user_traits",
	ACCOUNT_ID: "tif_account_id",
	ACCOUNT_TRAITS: "tif_account_traits",
	SESSION_ID: "tif_session_id",
	LAST_ACTIVITY: "tif_last_activity",
	OPT_OUT: "tif_opt_out",
} as const;
