import { createLogger, type Logger } from "./logger";
import type { AnalyticsEvent, ResolvedConfig } from "./types";

/**
 * Event queue with batching, automatic flushing, and retry logic
 *
 * Features:
 * - Batches events up to flushAt threshold
 * - Flushes automatically after flushInterval
 * - Uses sendBeacon on page unload for reliability
 * - Exponential backoff retry on failure
 */
export class Queue {
	private items: AnalyticsEvent[] = [];
	private timer: ReturnType<typeof setTimeout> | null = null;
	private flushPromise: Promise<void> | null = null;
	private visibilityFlushPending = false;
	private config: ResolvedConfig;
	private logger: Logger;

	constructor(config: ResolvedConfig) {
		this.config = config;
		this.logger = createLogger("Queue", config.debug);

		this.setupUnloadHandlers();
	}

	/**
	 * Set up handlers for page unload to ensure events are sent
	 */
	private setupUnloadHandlers(): void {
		if (typeof window === "undefined") return;

		document.addEventListener("visibilitychange", () => {
			if (document.visibilityState === "hidden") {
				if (this.visibilityFlushPending) return;
				this.visibilityFlushPending = true;
				this.flush(true);
				setTimeout(() => {
					this.visibilityFlushPending = false;
				}, 1000);
			}
		});

		window.addEventListener("beforeunload", () => {
			this.flush(true);
		});

		window.addEventListener("pagehide", () => {
			this.flush(true);
		});
	}

	/**
	 * Add an event to the queue
	 */
	push(event: AnalyticsEvent): void {
		this.items.push(event);
		this.logger.log(
			"Event queued:",
			event.type,
			"event" in event ? event.event : "",
		);

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
	 */
	async flush(useBeacon = false, depth = 0): Promise<void> {
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
			return;
		}

		if (this.timer) {
			clearTimeout(this.timer);
			this.timer = null;
		}

		if (this.items.length === 0) {
			return;
		}

		if (this.flushPromise) {
			this.logger.log("Flush in progress, waiting...");
			await this.flushPromise;
			if (this.items.length > 0) {
				return this.flush(useBeacon, depth + 1);
			}
			return;
		}

		const batch = this.items.splice(0);

		this.logger.log(`Flushing ${batch.length} events...`);

		this.flushPromise = (async () => {
			try {
				if (useBeacon) {
					this.sendWithBeacon(batch);
				} else {
					await this.sendWithRetry(batch);
				}
				this.logger.log("Flush successful");
			} catch (error) {
				this.items.unshift(...batch);
				this.logger.log("Flush failed, re-queued events:", error);
			}
		})();

		try {
			await this.flushPromise;
		} finally {
			this.flushPromise = null;
		}
	}

	/**
	 * Send events using sendBeacon (for page unload)
	 */
	private sendWithBeacon(batch: AnalyticsEvent[]): void {
		if (typeof navigator === "undefined" || !navigator.sendBeacon) {
			this.sendWithKeepalive(batch);
			return;
		}

		const url = `${this.config.host}/api/v1/track`;
		const payload = this.formatBatchPayload(batch);

		const blob = new Blob([JSON.stringify(payload)], {
			type: "application/json",
		});

		const urlWithKey = `${url}?key=${encodeURIComponent(this.config.apiKey)}`;

		const success = navigator.sendBeacon(urlWithKey, blob);
		this.logger.log("sendBeacon result:", success);
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
		}).catch(() => {});
	}

	/**
	 * Send events with exponential backoff retry
	 */
	private async sendWithRetry(batch: AnalyticsEvent[]): Promise<void> {
		const url = `${this.config.host}/api/v1/track`;
		const payload = this.formatBatchPayload(batch);

		for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
			try {
				const response = await fetch(url, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"X-API-Key": this.config.apiKey,
					},
					body: JSON.stringify(payload),
				});

				if (response.ok) {
					return;
				}

				if (response.status >= 400 && response.status < 500) {
					if (response.status === 429) {
						this.logger.log("Rate limited, retrying...");
					} else {
						throw new Error(`HTTP ${response.status}: ${response.statusText}`);
					}
				}

				if (attempt === this.config.maxRetries) {
					throw new Error(`HTTP ${response.status}: ${response.statusText}`);
				}
			} catch (error) {
				if (attempt === this.config.maxRetries) {
					throw error;
				}
			}

			const baseDelay = 2 ** attempt * 1000;
			const jitter = Math.random() * 1000;
			const delay = baseDelay + jitter;

			this.logger.log(
				`Retry ${attempt + 1}/${this.config.maxRetries} in ${delay}ms`,
			);
			await this.sleep(delay);
		}
	}

	/**
	 * Format events into batch payload for the API
	 */
	private formatBatchPayload(batch: AnalyticsEvent[]): {
		batch: Record<string, unknown>[];
		sentAt: string;
	} {
		return {
			sentAt: new Date().toISOString(),
			batch: batch.map((event) => {
				const base = {
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
}
