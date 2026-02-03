import { ErrorCapture } from "./errors";
import {
	type AccountDeletedProps,
	type FeatureActivatedProps,
	type InviteAcceptedProps,
	type InviteSentProps,
	LIFECYCLE_EVENTS,
	type LoginProps,
	type LogoutProps,
	type PlanDowngradedProps,
	type PlanUpgradedProps,
	type SignupProps,
	type SubscriptionCancelledProps,
	type SubscriptionRenewedProps,
	type SubscriptionStartedProps,
	type TrialEndedProps,
	type TrialStartedProps,
} from "./lifecycle";
import { createLogger, type Logger } from "./logger";
import type { LogLevel } from "./logging";
import { log as sendLog } from "./logging";
import { Privacy } from "./privacy";
import { Queue } from "./queue";
import { Session } from "./session";
import { generateId, Storage } from "./storage";
import type {
	AccountTraits,
	Analytics,
	AnalyticsConfig,
	AnalyticsEvent,
	ConsentCategory,
	EventContext,
	FlushResult,
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

	private eventTimestamps: number[] = [];
	private rateLimitWarned = false;

	constructor(config: AnalyticsConfig) {
		this.config = this.resolveConfig(config);
		this.logger = createLogger(
			"Analytics",
			this.config.debug,
			this.config.structuredLogging,
		);
		this.storage = new Storage(this.config.cookieDomain);
		this.session = new Session(
			this.storage,
			this.config.sessionTimeout,
			this.config.debug,
			this.config.anonymousIdMaxAge,
		);
		this.privacy = new Privacy(
			this.storage,
			this.config.respectDNT,
			this.config.debug,
			this.config.consent,
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
			onFlushError: config.onFlushError,
			persistQueue: config.persistQueue ?? DEFAULT_CONFIG.persistQueue,
			maxPersistedEvents:
				config.maxPersistedEvents ?? DEFAULT_CONFIG.maxPersistedEvents,
			beforeSend: config.beforeSend,
			anonymousIdMaxAge:
				config.anonymousIdMaxAge ?? DEFAULT_CONFIG.anonymousIdMaxAge,
			circuitBreakerThreshold:
				config.circuitBreakerThreshold ??
				DEFAULT_CONFIG.circuitBreakerThreshold,
			circuitBreakerResetTimeout:
				config.circuitBreakerResetTimeout ??
				DEFAULT_CONFIG.circuitBreakerResetTimeout,
			consent: config.consent,
			maxEventsPerSecond:
				config.maxEventsPerSecond ?? DEFAULT_CONFIG.maxEventsPerSecond,
			sampleRate: Math.max(
				0,
				Math.min(1, config.sampleRate ?? DEFAULT_CONFIG.sampleRate),
			),
			structuredLogging:
				config.structuredLogging ?? DEFAULT_CONFIG.structuredLogging,
		};
	}

	/**
	 * Queue an event, applying sampling, rate limiting and beforeSend hook if configured
	 */
	private queueEvent(event: AnalyticsEvent): void {
		if (!this.shouldSample()) {
			this.logger.log("Event dropped by sampling");
			return;
		}

		if (!this.checkRateLimit()) {
			return;
		}

		let finalEvent: AnalyticsEvent | null = event;

		if (this.config.beforeSend) {
			try {
				finalEvent = this.config.beforeSend(event);
				if (finalEvent === null) {
					this.logger.log("Event discarded by beforeSend hook:", event.type);
					return;
				}
			} catch (error) {
				this.logger.warn("beforeSend hook threw an error:", error);

				finalEvent = event;
			}
		}

		this.queue.push(finalEvent);
	}

	/**
	 * Check if event should be sampled based on sampleRate
	 */
	private shouldSample(): boolean {
		const sampleRate = this.config.sampleRate;

		if (sampleRate >= 1) return true;
		if (sampleRate <= 0) return false;
		return Math.random() < sampleRate;
	}

	/**
	 * Check if event should be allowed based on rate limit
	 * Uses a sliding window algorithm
	 */
	private checkRateLimit(): boolean {
		const maxEvents = this.config.maxEventsPerSecond;

		if (maxEvents <= 0) {
			return true;
		}

		const now = Date.now();
		const windowStart = now - 1000;

		this.eventTimestamps = this.eventTimestamps.filter((t) => t > windowStart);

		if (this.eventTimestamps.length >= maxEvents) {
			if (!this.rateLimitWarned) {
				this.logger.warn(
					`Rate limit exceeded (${maxEvents} events/second). Events are being dropped.`,
				);
				this.rateLimitWarned = true;

				setTimeout(() => {
					this.rateLimitWarned = false;
				}, 5000);
			}
			return false;
		}

		this.eventTimestamps.push(now);
		return true;
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
			messageId: generateId(),
			event,
			properties,
			timestamp: new Date().toISOString(),
			anonymousId: this.session.getAnonymousId(),
			userId: this.session.getUserId(),
			sessionId: this.session.getSessionId(),
			accountId: this.session.getAccountId(),
			context: this.getContext(),
		};

		this.queueEvent(trackEvent);
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
			messageId: generateId(),
			userId,
			traits,
			timestamp: new Date().toISOString(),
			anonymousId: this.session.getAnonymousId(),
			sessionId: this.session.getSessionId(),
			accountId: this.session.getAccountId(),
			context: this.getContext(),
		};

		this.queueEvent(identifyEvent);
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
			messageId: generateId(),
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

		this.queueEvent(pageEvent);
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
			messageId: generateId(),
			accountId,
			traits,
			timestamp: new Date().toISOString(),
			anonymousId: this.session.getAnonymousId(),
			userId: this.session.getUserId(),
			sessionId: this.session.getSessionId(),
			context: this.getContext(),
		};

		this.queueEvent(groupEvent);
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
	 * @returns FlushResult with success status, event count, and any errors
	 */
	async flush(): Promise<FlushResult> {
		return this.queue.flush();
	}

	/**
	 * Destroy the analytics instance, cleaning up all resources.
	 * Flushes remaining events before cleanup.
	 * After calling this, the instance should not be used.
	 */
	async destroy(): Promise<void> {
		this.logger.log("Destroying analytics instance...");

		await this.queue.destroy();

		this.session.destroy();

		this.errorCapture?.uninstall();

		this.initialized = false;

		if (globalInstance === this) {
			globalInstance = null;
		}

		this.logger.log("Analytics instance destroyed");
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
	 * Check if a specific consent category is enabled
	 */
	hasConsent(category: ConsentCategory): boolean {
		return this.privacy.hasConsent(category);
	}

	/**
	 * Get all currently consented categories
	 */
	getConsentedCategories(): ConsentCategory[] {
		return this.privacy.getConsentedCategories();
	}

	/**
	 * Set consent for specific categories
	 */
	setConsent(categories: ConsentCategory[]): void {
		this.privacy.setConsent(categories);
	}

	/**
	 * Grant consent for a specific category
	 */
	grantConsent(category: ConsentCategory): void {
		this.privacy.grantConsent(category);
	}

	/**
	 * Revoke consent for a specific category
	 */
	revokeConsent(category: ConsentCategory): void {
		this.privacy.revokeConsent(category);
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

	/**
	 * Track a user signup
	 */
	signup(props?: SignupProps): void {
		this.track(LIFECYCLE_EVENTS.SIGNUP, props);
	}

	/**
	 * Track a user login
	 */
	login(props?: LoginProps): void {
		this.track(LIFECYCLE_EVENTS.LOGIN, props);
	}

	/**
	 * Track a user logout
	 */
	logout(props?: LogoutProps): void {
		this.track(LIFECYCLE_EVENTS.LOGOUT, props);
	}

	/**
	 * Track account deletion
	 */
	accountDeleted(props?: AccountDeletedProps): void {
		this.track(LIFECYCLE_EVENTS.ACCOUNT_DELETED, props);
	}

	/**
	 * Track subscription start
	 */
	subscriptionStarted(props: SubscriptionStartedProps): void {
		if (!props?.plan) {
			this.logger.warn("subscriptionStarted: plan is required, event not sent");
			return;
		}
		this.track(LIFECYCLE_EVENTS.SUBSCRIPTION_STARTED, props);
	}

	/**
	 * Track subscription cancellation
	 */
	subscriptionCancelled(props: SubscriptionCancelledProps): void {
		if (!props?.plan) {
			this.logger.warn(
				"subscriptionCancelled: plan is required, event not sent",
			);
			return;
		}
		this.track(LIFECYCLE_EVENTS.SUBSCRIPTION_CANCELLED, props);
	}

	/**
	 * Track subscription renewal
	 */
	subscriptionRenewed(props: SubscriptionRenewedProps): void {
		if (!props?.plan) {
			this.logger.warn("subscriptionRenewed: plan is required, event not sent");
			return;
		}
		this.track(LIFECYCLE_EVENTS.SUBSCRIPTION_RENEWED, props);
	}

	/**
	 * Track plan upgrade
	 */
	planUpgraded(props: PlanUpgradedProps): void {
		if (!props?.fromPlan || !props?.toPlan) {
			this.logger.warn(
				"planUpgraded: fromPlan and toPlan are required, event not sent",
			);
			return;
		}
		this.track(LIFECYCLE_EVENTS.PLAN_UPGRADED, props);
	}

	/**
	 * Track plan downgrade
	 */
	planDowngraded(props: PlanDowngradedProps): void {
		if (!props?.fromPlan || !props?.toPlan) {
			this.logger.warn(
				"planDowngraded: fromPlan and toPlan are required, event not sent",
			);
			return;
		}
		this.track(LIFECYCLE_EVENTS.PLAN_DOWNGRADED, props);
	}

	/**
	 * Track trial start
	 */
	trialStarted(props: TrialStartedProps): void {
		if (!props?.plan) {
			this.logger.warn("trialStarted: plan is required, event not sent");
			return;
		}
		this.track(LIFECYCLE_EVENTS.TRIAL_STARTED, props);
	}

	/**
	 * Track trial end
	 */
	trialEnded(props: TrialEndedProps): void {
		if (!props?.plan || props?.converted === undefined) {
			this.logger.warn(
				"trialEnded: plan and converted are required, event not sent",
			);
			return;
		}
		this.track(LIFECYCLE_EVENTS.TRIAL_ENDED, props);
	}

	/**
	 * Track invite sent
	 */
	inviteSent(props?: InviteSentProps): void {
		this.track(LIFECYCLE_EVENTS.INVITE_SENT, props);
	}

	/**
	 * Track invite accepted
	 */
	inviteAccepted(props?: InviteAcceptedProps): void {
		this.track(LIFECYCLE_EVENTS.INVITE_ACCEPTED, props);
	}

	/**
	 * Track feature activation
	 */
	featureActivated(props: FeatureActivatedProps): void {
		if (!props?.feature) {
			this.logger.warn("featureActivated: feature is required, event not sent");
			return;
		}
		this.track(LIFECYCLE_EVENTS.FEATURE_ACTIVATED, props);
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
