/**
 * Shared debug logger factory for SDK modules
 *
 * Creates a consistent logging interface across all SDK components.
 * Logs are only output when debug mode is enabled.
 */
export interface Logger {
	log: (...args: unknown[]) => void;
	warn: (...args: unknown[]) => void;
	error: (...args: unknown[]) => void;
}

/**
 * Create a namespaced debug logger
 *
 * @param prefix - Module name (e.g., "Queue", "Session", "Errors")
 * @param debug - Whether debug mode is enabled
 * @returns Logger interface with log, warn, and error methods
 *
 * @example
 * ```typescript
 * const logger = createLogger("Queue", this.config.debug);
 * logger.log("Event queued:", event.type);
 * logger.warn("Queue is full, dropping oldest event");
 * logger.error("Failed to send batch:", error);
 * ```
 */
export const createLogger = (prefix: string, debug: boolean): Logger => {
	const shouldLog = debug && typeof console !== "undefined";

	return {
		log: (...args: unknown[]) => {
			if (shouldLog) {
				console.log(`[Thisbefine ${prefix}]`, ...args);
			}
		},
		warn: (...args: unknown[]) => {
			if (shouldLog) {
				console.warn(`[Thisbefine ${prefix}]`, ...args);
			}
		},
		error: (...args: unknown[]) => {
			if (typeof console !== "undefined") {
				console.error(`[Thisbefine ${prefix}]`, ...args);
			}
		},
	};
};
