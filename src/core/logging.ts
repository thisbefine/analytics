import type { Analytics } from "./types";

export type LogLevel = "debug" | "info" | "warn" | "error" | "fatal";

/**
 * Reserved property names that cannot be used in log metadata.
 * These are used by the logging system itself.
 */
const RESERVED_KEYS = ["message", "level"] as const;

/**
 * Send a structured log event through the analytics track pipeline.
 * Logs are stored as track events with name "$log".
 *
 * Note: The event timestamp is set by track() - no need to duplicate it.
 * Metadata keys "message" and "level" are reserved and will be prefixed
 * with "meta_" to avoid conflicts.
 */
export const log = (
	analytics: Analytics,
	message: string,
	level: LogLevel,
	metadata?: Record<string, unknown>,
): void => {
	let sanitizedMetadata: Record<string, unknown> | undefined;

	if (metadata) {
		sanitizedMetadata = {};
		for (const [key, value] of Object.entries(metadata)) {
			if (RESERVED_KEYS.includes(key as (typeof RESERVED_KEYS)[number])) {
				sanitizedMetadata[`meta_${key}`] = value;
			} else {
				sanitizedMetadata[key] = value;
			}
		}
	}

	analytics.track("$log", {
		message,
		level,
		...sanitizedMetadata,
	});
};
