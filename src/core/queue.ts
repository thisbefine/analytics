import { createLogger, type Logger } from "./logger";
import type { AnalyticsEvent, FlushResult, ResolvedConfig } from "./types";
import { STORAGE_KEYS } from "./types";

/**
 * Circuit breaker state
 */
type CircuitState = "closed" | "open" | "half-open";

/**
 * Event queue with batching, automatic flushing, retry logic, offline detection,
 * persistent storage for crash recovery, and circuit breaker pattern.
 *
 * Features:
 * - Batches events up to flushAt threshold
 * - Flushes automatically after flushInterval
 * - Uses sendBeacon on page unload for reliability
 * - Exponential backoff retry on failure
 * - Pauses when offline, resumes when online
 * - Persists queue to localStorage for crash recovery
 * - Calls onFlushError callback on failures
 * - Circuit breaker to stop hammering failed servers
 */
export class Queue {
	private items: AnalyticsEvent[] = [];
	private timer: ReturnType<typeof setTimeout> | null = null;
	private flushPromise: Promise<FlushResult> | null = null;
	private visibilityFlushPending = false;
	private config: ResolvedConfig;
	private logger: Logger;
	private destroyed = false;
	private isOnline = true;

	private circuitState: CircuitState = "closed";
	private consecutiveFailures = 0;
	private circuitOpenedAt: number | null = null;

	private clockOffset = 0;

	private boundVisibilityHandler: (() => void) | null = null;
	private boundBeforeUnloadHandler: (() => void) | null = null;
	private boundPageHideHandler: (() => void) | null = null;
	private boundOnlineHandler: (() => void) | null = null;
	private boundOfflineHandler: (() => void) | null = null;

	constructor(config: ResolvedConfig) {
		this.config = config;
		this.logger = createLogger("Queue", config.debug, config.structuredLogging);

		if (typeof navigator !== "undefined") {
			this.isOnline = navigator.onLine;
		}

		this.restoreFromStorage();

		this.setupUnloadHandlers();
		this.setupOnlineHandlers();
	}

	/**
	 * Set up handlers for page unload to ensure events are sent
	 */
	private setupUnloadHandlers(): void {
		if (typeof window === "undefined") return;

		this.boundVisibilityHandler = () => {
			if (document.visibilityState === "hidden") {
				if (this.visibilityFlushPending) return;
				this.visibilityFlushPending = true;
				this.flush(true);
				setTimeout(() => {
					this.visibilityFlushPending = false;
				}, 1000);
			}
		};

		this.boundBeforeUnloadHandler = () => {
			this.flush(true);
		};

		this.boundPageHideHandler = () => {
			this.flush(true);
		};

		document.addEventListener("visibilitychange", this.boundVisibilityHandler);
		window.addEventListener("beforeunload", this.boundBeforeUnloadHandler);
		window.addEventListener("pagehide", this.boundPageHideHandler);
	}

	/**
	 * Set up handlers for online/offline detection
	 */
	private setupOnlineHandlers(): void {
		if (typeof window === "undefined") return;

		this.boundOnlineHandler = () => {
			this.logger.log("Network online, resuming queue");
			this.isOnline = true;

			if (this.items.length > 0) {
				this.flush();
			}
		};

		this.boundOfflineHandler = () => {
			this.logger.log("Network offline, pausing queue");
			this.isOnline = false;
		};

		window.addEventListener("online", this.boundOnlineHandler);
		window.addEventListener("offline", this.boundOfflineHandler);
	}

	/**
	 * Restore queue from persistent storage (crash recovery)
	 */
	private restoreFromStorage(): void {
		if (!this.config.persistQueue) return;
		if (typeof localStorage === "undefined") return;

		try {
			const stored = localStorage.getItem(STORAGE_KEYS.QUEUE);
			if (stored) {
				const parsed = JSON.parse(stored) as AnalyticsEvent[];
				if (Array.isArray(parsed) && parsed.length > 0) {
					this.items = parsed;
					this.logger.log(`Restored ${parsed.length} events from storage`);

					localStorage.removeItem(STORAGE_KEYS.QUEUE);
				}
			}
		} catch (error) {
			this.logger.log("Failed to restore queue from storage:", error);
		}
	}

	/**
	 * Persist queue to storage for crash recovery
	 */
	private persistToStorage(): void {
		if (!this.config.persistQueue) return;
		if (typeof localStorage === "undefined") return;

		try {
			if (this.items.length === 0) {
				localStorage.removeItem(STORAGE_KEYS.QUEUE);
			} else {
				const toStore = this.items.slice(0, this.config.maxPersistedEvents);
				localStorage.setItem(STORAGE_KEYS.QUEUE, JSON.stringify(toStore));
			}
		} catch (error) {
			this.logger.log("Failed to persist queue to storage:", error);
		}
	}

	/**
	 * Add an event to the queue
	 */
	push(event: AnalyticsEvent): void {
		if (this.destroyed) {
			this.logger.warn("Cannot push to destroyed queue");
			return;
		}

		this.items.push(event);
		this.logger.log(
			"Event queued:",
			event.type,
			"event" in event ? event.event : "",
		);

		this.persistToStorage();

		if (this.items.length >= this.config.flushAt) {
			this.logger.log("Batch size reached, flushing...");
			this.flush();
		} else if (!this.timer) {
			this.timer = setTimeout(() => {
				this.logger.log("Flush interval reached, flushing...");
				this.flush();
			}, this.config.flushInterval);
		}
	}

	/**
	 * Flush the queue, sending all pending events
	 *
	 * @param useBeacon - Use sendBeacon for page unload scenarios
	 * @param depth - Internal recursion depth counter (prevents stack overflow)
	 * @returns FlushResult with success status and any errors
	 */
	async flush(useBeacon = false, depth = 0): Promise<FlushResult> {
		const MAX_FLUSH_DEPTH = 3;
		if (depth >= MAX_FLUSH_DEPTH) {
			this.logger.warn(
				`Max flush depth (${MAX_FLUSH_DEPTH}) reached, ${this.items.length} events remain queued`,
			);

			if (this.items.length > 0 && !this.timer) {
				this.timer = setTimeout(() => {
					this.flush();
				}, this.config.flushInterval);
			}
			return {
				success: false,
				eventCount: 0,
				errors: [new Error("Max flush depth reached")],
			};
		}

		if (this.timer) {
			clearTimeout(this.timer);
			this.timer = null;
		}

		if (this.items.length === 0) {
			return { success: true, eventCount: 0 };
		}

		if (!this.isOnline && !useBeacon) {
			this.logger.log("Offline, skipping flush (events remain queued)");

			if (!this.timer) {
				this.timer = setTimeout(() => {
					if (this.isOnline) {
						this.flush();
					}
				}, this.config.flushInterval);
			}
			return {
				success: false,
				eventCount: 0,
				errors: [new Error("Network offline")],
			};
		}

		if (!useBeacon && !this.canAttemptRequest()) {
			this.logger.log(
				"Circuit breaker open, skipping flush (events remain queued)",
			);

			if (!this.timer) {
				this.timer = setTimeout(() => {
					this.flush();
				}, this.config.circuitBreakerResetTimeout);
			}
			return {
				success: false,
				eventCount: 0,
				errors: [new Error("Circuit breaker open")],
			};
		}

		if (this.flushPromise) {
			this.logger.log("Flush in progress, waiting...");
			const result = await this.flushPromise;
			if (this.items.length > 0) {
				return this.flush(useBeacon, depth + 1);
			}
			return result;
		}

		const batch = this.items.splice(0);
		const batchCount = batch.length;

		this.logger.log(`Flushing ${batchCount} events...`);

		this.persistToStorage();

		let result: FlushResult;

		this.flushPromise = (async (): Promise<FlushResult> => {
			try {
				if (useBeacon) {
					const success = this.sendWithBeacon(batch);
					if (!success) {
						this.items.unshift(...batch);
						this.persistToStorage();
						const error = new Error("sendBeacon returned false");
						this.recordFailure();
						this.notifyError(error, batch);
						return { success: false, eventCount: batchCount, errors: [error] };
					}
					this.recordSuccess();
					return { success: true, eventCount: batchCount };
				} else {
					await this.sendWithRetry(batch);
					this.logger.log("Flush successful");
					this.recordSuccess();
					return { success: true, eventCount: batchCount };
				}
			} catch (error) {
				this.items.unshift(...batch);
				this.persistToStorage();
				const err = error instanceof Error ? error : new Error(String(error));
				this.logger.log("Flush failed, re-queued events:", err.message);
				this.recordFailure();
				this.notifyError(err, batch);
				return { success: false, eventCount: batchCount, errors: [err] };
			}
		})();

		try {
			result = await this.flushPromise;
		} finally {
			this.flushPromise = null;
		}

		return result;
	}

	/**
	 * Notify error callback of flush failure
	 */
	private notifyError(error: Error, failedEvents: AnalyticsEvent[]): void {
		if (this.config.onFlushError) {
			try {
				this.config.onFlushError(error, failedEvents);
			} catch (callbackError) {
				this.logger.warn("onFlushError callback threw:", callbackError);
			}
		}
	}

	/**
	 * Check if we can attempt a request based on circuit breaker state
	 */
	private canAttemptRequest(): boolean {
		if (this.circuitState === "closed") {
			return true;
		}

		if (this.circuitState === "open" && this.circuitOpenedAt !== null) {
			const elapsed = Date.now() - this.circuitOpenedAt;
			if (elapsed >= this.config.circuitBreakerResetTimeout) {
				this.circuitState = "half-open";
				this.logger.log("Circuit breaker half-open, attempting test request");
				return true;
			}
			return false;
		}

		return this.circuitState === "half-open";
	}

	/**
	 * Record a successful request, closing the circuit
	 */
	private recordSuccess(): void {
		if (this.circuitState !== "closed") {
			this.logger.log("Circuit breaker closed after successful request");
		}
		this.consecutiveFailures = 0;
		this.circuitState = "closed";
		this.circuitOpenedAt = null;
	}

	/**
	 * Record a failed request, potentially opening the circuit
	 */
	private recordFailure(): void {
		this.consecutiveFailures++;
		this.logger.log(
			`Consecutive failures: ${this.consecutiveFailures}/${this.config.circuitBreakerThreshold}`,
		);

		if (this.consecutiveFailures >= this.config.circuitBreakerThreshold) {
			this.circuitState = "open";
			this.circuitOpenedAt = Date.now();
			this.logger.log("Circuit breaker opened after consecutive failures");
		}
	}

	/**
	 * Get the current circuit breaker state (for testing/debugging)
	 */
	get circuitBreakerState(): CircuitState {
		return this.circuitState;
	}

	/**
	 * Update clock offset from server response
	 * Uses the Date header to calculate the difference between client and server time
	 */
	private updateClockOffset(response: Response, requestTime: number): void {
		const dateHeader = response.headers.get("Date");
		if (!dateHeader) return;

		try {
			const serverTime = new Date(dateHeader).getTime();
			if (Number.isNaN(serverTime)) return;

			const responseTime = Date.now();
			const roundTripTime = responseTime - requestTime;
			const estimatedServerTime = serverTime + roundTripTime / 2;
			const clientTime = requestTime + roundTripTime / 2;

			const newOffset = clientTime - estimatedServerTime;

			if (Math.abs(newOffset) > 1000) {
				this.clockOffset = this.clockOffset * 0.7 + newOffset * 0.3;
				this.logger.log(
					`Clock offset updated: ${Math.round(this.clockOffset)}ms`,
				);
			}
		} catch {}
	}

	/**
	 * Get the current clock offset (for testing/debugging)
	 */
	getClockOffset(): number {
		return this.clockOffset;
	}

	/**
	 * Send events using sendBeacon (for page unload)
	 * @returns true if sendBeacon succeeded, false otherwise
	 */
	private sendWithBeacon(batch: AnalyticsEvent[]): boolean {
		if (typeof navigator === "undefined" || !navigator.sendBeacon) {
			this.sendWithKeepalive(batch);
			return true;
		}

		const url = `${this.config.host}/api/v1/track`;

		const payload = this.formatBatchPayload(batch, true);

		const blob = new Blob([JSON.stringify(payload)], {
			type: "application/json",
		});

		const success = navigator.sendBeacon(url, blob);
		this.logger.log("sendBeacon result:", success);
		return success;
	}

	/**
	 * Send events using fetch with keepalive (for page unload fallback)
	 */
	private sendWithKeepalive(batch: AnalyticsEvent[]): void {
		if (typeof fetch === "undefined") return;

		const url = `${this.config.host}/api/v1/track`;
		const payload = this.formatBatchPayload(batch);

		fetch(url, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-API-Key": this.config.apiKey,
			},
			body: JSON.stringify(payload),
			keepalive: true,
		}).catch((error) => {
			this.logger.log("Keepalive fetch failed:", error);
			this.notifyError(
				error instanceof Error ? error : new Error(String(error)),
				batch,
			);
		});
	}

	/**
	 * Send events with exponential backoff retry
	 */
	private async sendWithRetry(batch: AnalyticsEvent[]): Promise<void> {
		const url = `${this.config.host}/api/v1/track`;
		const payload = this.formatBatchPayload(batch);

		for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
			if (!this.isOnline) {
				throw new Error("Network went offline during retry");
			}

			let response: Response;
			let requestTime: number;

			try {
				requestTime = Date.now();
				response = await fetch(url, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"X-API-Key": this.config.apiKey,
					},
					body: JSON.stringify(payload),
				});
			} catch (error) {
				if (attempt === this.config.maxRetries) {
					throw error;
				}

				const baseDelay = 2 ** attempt * 1000;
				const jitter = Math.random() * baseDelay * 0.5;
				const delay = baseDelay + jitter;
				this.logger.log(
					`Network error, retry ${attempt + 1}/${this.config.maxRetries} in ${Math.round(delay)}ms`,
				);
				await this.sleep(delay);
				continue;
			}

			if (response.ok) {
				this.updateClockOffset(response, requestTime);
				return;
			}

			if (
				response.status >= 400 &&
				response.status < 500 &&
				response.status !== 429
			) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}

			if (response.status === 429) {
				this.logger.log("Rate limited, retrying...");
			}

			if (attempt === this.config.maxRetries) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}

			const baseDelay = 2 ** attempt * 1000;

			const jitter = Math.random() * baseDelay * 0.5;
			const delay = baseDelay + jitter;

			this.logger.log(
				`Retry ${attempt + 1}/${this.config.maxRetries} in ${Math.round(delay)}ms`,
			);
			await this.sleep(delay);
		}
	}

	/**
	 * Format events into batch payload for the API
	 */
	private formatBatchPayload(
		batch: AnalyticsEvent[],
		includeApiKey = false,
	): {
		batch: Record<string, unknown>[];
		sentAt: string;
		clockOffset?: number;
		apiKey?: string;
	} {
		return {
			sentAt: new Date().toISOString(),

			...(Math.abs(this.clockOffset) > 1000 && {
				clockOffset: Math.round(this.clockOffset),
			}),

			...(includeApiKey && { apiKey: this.config.apiKey }),
			batch: batch.map((event) => {
				const base = {
					messageId: event.messageId,
					timestamp: event.timestamp,
					anonymousId: event.anonymousId,
					userId: event.userId,
					sessionId: event.sessionId,
					accountId: event.accountId,
				};

				switch (event.type) {
					case "track":
						return {
							...base,
							event: event.event,
							properties: event.properties,
							url: event.context?.page?.url,
							referrer: event.context?.page?.referrer,
						};

					case "page":
						return {
							...base,
							event: "$pageview",
							properties: {
								...event.properties,
								name: event.name,
								title: event.context?.page?.title,
							},
							url: event.url,
							referrer: event.referrer,
						};

					case "identify":
						return {
							...base,
							event: "$identify",
							properties: event.traits,
						};

					case "group":
						return {
							...base,
							event: "$group",
							accountId: event.accountId,
							properties: event.traits,
						};

					default:
						return base;
				}
			}),
		};
	}

	/**
	 * Sleep helper for retry backoff
	 */
	private sleep(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	/**
	 * Get the number of events in the queue
	 */
	get length(): number {
		return this.items.length;
	}

	/**
	 * Check if the queue is currently online
	 */
	get online(): boolean {
		return this.isOnline;
	}

	/**
	 * Destroy the queue, removing all event listeners and clearing timers.
	 * Attempts to flush remaining events before cleanup.
	 */
	async destroy(): Promise<void> {
		if (this.destroyed) return;
		this.destroyed = true;

		this.logger.log("Destroying queue...");

		if (this.timer) {
			clearTimeout(this.timer);
			this.timer = null;
		}

		if (this.items.length > 0) {
			this.sendWithBeacon(this.items);
			this.items = [];
		}

		if (this.config.persistQueue && typeof localStorage !== "undefined") {
			try {
				localStorage.removeItem(STORAGE_KEYS.QUEUE);
			} catch {}
		}

		if (typeof window !== "undefined") {
			if (this.boundVisibilityHandler) {
				document.removeEventListener(
					"visibilitychange",
					this.boundVisibilityHandler,
				);
				this.boundVisibilityHandler = null;
			}
			if (this.boundBeforeUnloadHandler) {
				window.removeEventListener(
					"beforeunload",
					this.boundBeforeUnloadHandler,
				);
				this.boundBeforeUnloadHandler = null;
			}
			if (this.boundPageHideHandler) {
				window.removeEventListener("pagehide", this.boundPageHideHandler);
				this.boundPageHideHandler = null;
			}
			if (this.boundOnlineHandler) {
				window.removeEventListener("online", this.boundOnlineHandler);
				this.boundOnlineHandler = null;
			}
			if (this.boundOfflineHandler) {
				window.removeEventListener("offline", this.boundOfflineHandler);
				this.boundOfflineHandler = null;
			}
		}

		this.logger.log("Queue destroyed");
	}
}
