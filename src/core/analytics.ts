import { ErrorCapture } from "./errors";
import { createLogger, type Logger } from "./logger";
import type { LogLevel } from "./logging";
import { log as sendLog } from "./logging";
import { Privacy } from "./privacy";
import { Queue } from "./queue";
import { Session } from "./session";
import { Storage } from "./storage";
import type {
	AccountTraits,
	Analytics,
	AnalyticsConfig,
	EventContext,
	GroupEvent,
	IdentifyEvent,
	PageEvent,
	ResolvedConfig,
	TrackEvent,
	UserState,
	UserTraits,
} from "./types";
import { DEFAULT_CONFIG, LIBRARY_INFO } from "./types";
import {
	validateAccountId,
	validateEventName,
	validateProperties,
	validateUserId,
} from "./validation";

/**
 * Main Analytics class - the primary entry point for the SDK
 *
 * Usage:
 * ```typescript
 * const analytics = createAnalytics({ apiKey: 'tbf_xxx' });
 *
 * analytics.track('button_clicked', { buttonId: 'signup' });
 * analytics.identify('user_123', { email: 'user@example.com' });
 * analytics.page('/dashboard');
 * ```
 */
export class AnalyticsImpl implements Analytics {
	private config: ResolvedConfig;
	private storage: Storage;
	private session: Session;
	private queue: Queue;
	private privacy: Privacy;
	private errorCapture: ErrorCapture | null = null;
	private initialized = false;
	private logger: Logger;

	constructor(config: AnalyticsConfig) {
		this.config = this.resolveConfig(config);
		this.logger = createLogger("Analytics", this.config.debug);
		this.storage = new Storage(this.config.cookieDomain);
		this.session = new Session(
			this.storage,
			this.config.sessionTimeout,
			this.config.debug,
		);
		this.privacy = new Privacy(
			this.storage,
			this.config.respectDNT,
			this.config.debug,
		);
		this.queue = new Queue(this.config);

		if (this.config.errors?.enabled !== false) {
			this.errorCapture = new ErrorCapture(
				this.config,
				this.session,
				this.config.errors,
			);
			this.errorCapture.install();
		}

		this.initialized = true;
		this.logger.log("Analytics initialized", {
			host: this.config.host,
			debug: this.config.debug,
			storageType: this.storage.getStorageType(),
			errorCapture: this.errorCapture !== null,
		});
	}

	/**
	 * Resolve configuration with defaults
	 */
	private resolveConfig(config: AnalyticsConfig): ResolvedConfig {
		return {
			apiKey: config.apiKey,
			host: config.host ?? DEFAULT_CONFIG.host,
			flushAt: config.flushAt ?? DEFAULT_CONFIG.flushAt,
			flushInterval: config.flushInterval ?? DEFAULT_CONFIG.flushInterval,
			sessionTimeout: config.sessionTimeout ?? DEFAULT_CONFIG.sessionTimeout,
			cookieDomain: config.cookieDomain,
			debug: config.debug ?? DEFAULT_CONFIG.debug,
			respectDNT: config.respectDNT ?? DEFAULT_CONFIG.respectDNT,
			maxRetries: config.maxRetries ?? DEFAULT_CONFIG.maxRetries,
			errors: config.errors,
		};
	}

	/**
	 * Track a custom event
	 */
	track(event: string, properties?: Record<string, unknown>): void {
		if (!this.shouldTrack()) return;

		const eventValidation = validateEventName(event);
		if (!eventValidation.valid) {
			this.logger.warn("Invalid event:", eventValidation.error);
			return;
		}

		const propsValidation = validateProperties(properties);
		if (!propsValidation.valid) {
			this.logger.warn("Invalid properties:", propsValidation.error);
			return;
		}

		const trackEvent: TrackEvent = {
			type: "track",
			event,
			properties,
			timestamp: new Date().toISOString(),
			anonymousId: this.session.getAnonymousId(),
			userId: this.session.getUserId(),
			sessionId: this.session.getSessionId(),
			accountId: this.session.getAccountId(),
			context: this.getContext(),
		};

		this.queue.push(trackEvent);
		this.session.updateLastActivity();
	}

	/**
	 * Identify a user with traits
	 */
	identify(userId: string, traits?: UserTraits): void {
		if (!this.shouldTrack()) return;

		const userIdValidation = validateUserId(userId);
		if (!userIdValidation.valid) {
			this.logger.warn("Invalid userId:", userIdValidation.error);
			return;
		}

		const traitsValidation = validateProperties(traits);
		if (!traitsValidation.valid) {
			this.logger.warn("Invalid traits:", traitsValidation.error);
			return;
		}

		this.session.setUserId(userId);
		if (traits) {
			this.session.setUserTraits(traits);
		}

		const identifyEvent: IdentifyEvent = {
			type: "identify",
			userId,
			traits,
			timestamp: new Date().toISOString(),
			anonymousId: this.session.getAnonymousId(),
			sessionId: this.session.getSessionId(),
			accountId: this.session.getAccountId(),
			context: this.getContext(),
		};

		this.queue.push(identifyEvent);
		this.session.updateLastActivity();
	}

	/**
	 * Track a page view
	 */
	page(name?: string, properties?: Record<string, unknown>): void {
		if (!this.shouldTrack()) return;

		const propsValidation = validateProperties(properties);
		if (!propsValidation.valid) {
			this.logger.warn("Invalid properties:", propsValidation.error);
			return;
		}

		const url = typeof window !== "undefined" ? window.location.href : "";
		const referrer =
			typeof document !== "undefined" ? document.referrer : undefined;

		const pageEvent: PageEvent = {
			type: "page",
			name,
			properties,
			url,
			referrer,
			timestamp: new Date().toISOString(),
			anonymousId: this.session.getAnonymousId(),
			userId: this.session.getUserId(),
			sessionId: this.session.getSessionId(),
			accountId: this.session.getAccountId(),
			context: this.getContext(),
		};

		this.queue.push(pageEvent);
		this.session.updateLastActivity();
	}

	/**
	 * Associate the current user with an account/company
	 */
	group(accountId: string, traits?: AccountTraits): void {
		if (!this.shouldTrack()) return;

		const accountIdValidation = validateAccountId(accountId);
		if (!accountIdValidation.valid) {
			this.logger.warn("Invalid accountId:", accountIdValidation.error);
			return;
		}

		const traitsValidation = validateProperties(traits);
		if (!traitsValidation.valid) {
			this.logger.warn("Invalid traits:", traitsValidation.error);
			return;
		}

		this.session.setAccountId(accountId);
		if (traits) {
			this.session.setAccountTraits(traits);
		}

		const groupEvent: GroupEvent = {
			type: "group",
			accountId,
			traits,
			timestamp: new Date().toISOString(),
			anonymousId: this.session.getAnonymousId(),
			userId: this.session.getUserId(),
			sessionId: this.session.getSessionId(),
			context: this.getContext(),
		};

		this.queue.push(groupEvent);
		this.session.updateLastActivity();
	}

	/**
	 * Capture an exception and send to error tracking
	 */
	captureException(error: Error, context?: Record<string, unknown>): void {
		if (!this.shouldTrack()) return;
		this.errorCapture?.captureException(error, context);
	}

	/**
	 * Capture a message as an error event
	 */
	captureMessage(
		message: string,
		level?: "error" | "fatal" | "warning",
		context?: Record<string, unknown>,
	): void {
		if (!this.shouldTrack()) return;
		this.errorCapture?.captureMessage(message, level, context);
	}

	/**
	 * Add a breadcrumb for error context
	 */
	addBreadcrumb(breadcrumb: {
		type: "click" | "navigation" | "network" | "console" | "custom";
		message: string;
		data?: Record<string, unknown>;
	}): void {
		this.errorCapture?.addBreadcrumb(breadcrumb);
	}

	/**
	 * Send a structured log event
	 */
	log(
		message: string,
		level: LogLevel,
		metadata?: Record<string, unknown>,
	): void {
		if (!this.shouldTrack()) return;
		sendLog(this, message, level, metadata);
	}

	/**
	 * Reset the current user session (call on logout)
	 */
	reset(): void {
		this.queue.flush();
		this.session.reset();
		this.errorCapture?.clearBreadcrumbs();

		this.logger.log("Session reset");
	}

	/**
	 * Manually flush the event queue
	 */
	async flush(): Promise<void> {
		await this.queue.flush();
	}

	/**
	 * Opt out of tracking
	 */
	optOut(): void {
		this.privacy.optOut();
	}

	/**
	 * Opt back in to tracking
	 */
	optIn(): void {
		this.privacy.optIn();
	}

	/**
	 * Check if user has opted out
	 */
	isOptedOut(): boolean {
		return this.privacy.isOptedOut();
	}

	/**
	 * Get current user state
	 */
	getUser(): UserState {
		return this.session.getUserState();
	}

	/**
	 * Check if tracking should be allowed
	 */
	private shouldTrack(): boolean {
		if (!this.initialized) {
			this.logger.log("Analytics not initialized, skipping event");
			return false;
		}

		if (!this.privacy.shouldTrack()) {
			return false;
		}

		return true;
	}

	/**
	 * Build event context
	 */
	private getContext(): EventContext {
		const context: EventContext = {
			library: LIBRARY_INFO,
			userAgent:
				typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
			locale: typeof navigator !== "undefined" ? navigator.language : "en",
			timezone:
				typeof Intl !== "undefined"
					? Intl.DateTimeFormat().resolvedOptions().timeZone
					: "UTC",
		};

		if (typeof window !== "undefined" && window.screen) {
			context.screen = {
				width: window.screen.width,
				height: window.screen.height,
			};
		}

		if (typeof window !== "undefined") {
			context.page = {
				url: window.location.href,
				path: window.location.pathname,
				referrer: document.referrer,
				title: document.title,
			};
		}

		return context;
	}
}

/**
 * Create a new Analytics instance
 *
 * @param config - Analytics configuration
 * @returns Analytics instance
 *
 * @example
 * ```typescript
 * const analytics = createAnalytics({
 *   apiKey: 'tbf_xxx',
 *   debug: process.env.NODE_ENV === 'development',
 * });
 *
 * analytics.track('signup_completed', { plan: 'pro' });
 * ```
 */
export const createAnalytics = (config: AnalyticsConfig): Analytics => {
	return new AnalyticsImpl(config);
};

let globalInstance: Analytics | null = null;

/**
 * Get or create a global analytics instance (for script tag usage)
 */
export const getAnalytics = (): Analytics | null => {
	return globalInstance;
};

/**
 * Initialize the global analytics instance
 */
export const initAnalytics = (config: AnalyticsConfig): Analytics => {
	if (globalInstance) {
		console.warn("[Thisbefine] Analytics already initialized");
		return globalInstance;
	}

	globalInstance = createAnalytics(config);
	return globalInstance;
};
