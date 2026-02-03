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
 * Structured log entry for machine-readable output
 */
interface StructuredLogEntry {
	timestamp: string;
	level: "debug" | "warn" | "error";
	module: string;
	message: string;
	data?: unknown;
}

/**
 * Format arguments into a message string and optional data
 */
const formatArgs = (args: unknown[]): { message: string; data?: unknown } => {
	if (args.length === 0) {
		return { message: "" };
	}

	const message = String(args[0]);

	if (args.length === 1) {
		return { message };
	}

	if (args.length === 2 && typeof args[1] === "object" && args[1] !== null) {
		return { message, data: args[1] };
	}

	return {
		message: args
			.map((arg) =>
				typeof arg === "object" ? JSON.stringify(arg) : String(arg),
			)
			.join(" "),
		data: args.slice(1),
	};
};

/**
 * Create a namespaced debug logger
 *
 * @param prefix - Module name (e.g., "Queue", "Session", "Errors")
 * @param debug - Whether debug mode is enabled
 * @param structured - Whether to output structured JSON logs
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
export const createLogger = (
	prefix: string,
	debug: boolean,
	structured = false,
): Logger => {
	const shouldLog = debug && typeof console !== "undefined";

	const logStructured = (
		level: "debug" | "warn" | "error",
		args: unknown[],
	): void => {
		const { message, data } = formatArgs(args);
		const entry: StructuredLogEntry = {
			timestamp: new Date().toISOString(),
			level,
			module: prefix,
			message,
			...(data !== undefined && { data }),
		};
		console.log(JSON.stringify(entry));
	};

	if (structured) {
		return {
			log: (...args: unknown[]) => {
				if (shouldLog) {
					logStructured("debug", args);
				}
			},
			warn: (...args: unknown[]) => {
				if (shouldLog) {
					logStructured("warn", args);
				}
			},
			error: (...args: unknown[]) => {
				if (typeof console !== "undefined") {
					logStructured("error", args);
				}
			},
		};
	}

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
