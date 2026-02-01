import { vi } from "vitest";
import type { Analytics, AnalyticsConfig } from "../core/types";

/**
 * Default test API key
 */
export const TEST_API_KEY = "tbf_test_key_12345";

/**
 * Default test host
 */
export const TEST_HOST = "https://test.thisbefine.com";

/**
 * Create a test analytics configuration
 */
export function createTestConfig(
	overrides?: Partial<AnalyticsConfig>,
): AnalyticsConfig {
	return {
		apiKey: TEST_API_KEY,
		host: TEST_HOST,
		debug: false,
		flushAt: 20,
		flushInterval: 10000,
		sessionTimeout: 1800000,
		respectDNT: true,
		maxRetries: 3,
		...overrides,
	};
}

/**
 * Reset the global analytics instance
 * This is needed because the SDK uses a singleton pattern
 */
export async function resetGlobalAnalytics(): Promise<void> {
	try {
		const analyticsModule = await import("../core/analytics");
		const moduleWithPrivates = analyticsModule as unknown as {
			globalInstance: Analytics | null;
		};
		if (moduleWithPrivates && "globalInstance" in moduleWithPrivates) {
			moduleWithPrivates.globalInstance = null;
		}
	} catch {}
}

/**
 * Wait for all pending promises to resolve
 */
export function flushPromises(): Promise<void> {
	return new Promise((resolve) => {
		setTimeout(resolve, 0);
	});
}

/**
 * Advance timers and flush promises
 */
export async function advanceTimersAndFlush(ms: number): Promise<void> {
	vi.advanceTimersByTime(ms);
	await flushPromises();
}

/**
 * Wait for a condition to be true
 */
export async function waitFor(
	condition: () => boolean,
	timeout = 5000,
	interval = 50,
): Promise<void> {
	const start = Date.now();
	while (!condition()) {
		if (Date.now() - start > timeout) {
			throw new Error("waitFor timeout");
		}
		await new Promise((resolve) => setTimeout(resolve, interval));
	}
}

/**
 * Create a mock Date for testing timestamps
 */
export function mockDate(isoString: string): void {
	const mockDate = new Date(isoString);
	vi.setSystemTime(mockDate);
}

/**
 * Generate a valid UUID v7 pattern for testing
 */
export function isValidUuidV7(id: string): boolean {
	const uuidV7Regex =
		/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
	return uuidV7Regex.test(id);
}

/**
 * Create a mock error with stack trace
 */
export function createMockError(message: string, name = "Error"): Error {
	const error = new Error(message);
	error.name = name;
	error.stack = `${name}: ${message}
    at someFunction (file.js:10:5)
    at anotherFunction (file.js:20:10)
    at Object.<anonymous> (test.js:1:1)`;
	return error;
}

/**
 * Create a mock click event
 */
export function createMockClickEvent(target: Partial<HTMLElement>): MouseEvent {
	const element = document.createElement("button");
	Object.assign(element, target);

	const event = new MouseEvent("click", {
		bubbles: true,
		cancelable: true,
	});

	Object.defineProperty(event, "target", {
		value: element,
		writable: false,
	});

	return event;
}

/**
 * Create a test element for click tracking tests
 */
export function createTestElement(
	tag: string,
	options?: {
		id?: string;
		className?: string;
		textContent?: string;
		ariaLabel?: string;
	},
): HTMLElement {
	const element = document.createElement(tag);
	if (options?.id) element.id = options.id;
	if (options?.className) element.className = options.className;
	if (options?.textContent) element.textContent = options.textContent;
	if (options?.ariaLabel) element.setAttribute("aria-label", options.ariaLabel);
	return element;
}

/**
 * Simulate a popstate event (back/forward navigation)
 */
export function triggerPopState(url?: string): void {
	if (url) {
		Object.defineProperty(window, "location", {
			value: {
				...window.location,
				href: url,
				pathname: new URL(url).pathname,
			},
			writable: true,
			configurable: true,
		});
	}
	window.dispatchEvent(new PopStateEvent("popstate"));
}

/**
 * Get parsed JSON body from a fetch call
 */
export function parseFetchBody(options?: RequestInit): unknown {
	if (!options?.body) return null;
	if (typeof options.body === "string") {
		return JSON.parse(options.body);
	}
	return null;
}

/**
 * Create a deferred promise for testing async operations
 */
export function createDeferred<T>(): {
	promise: Promise<T>;
	resolve: (value: T) => void;
	reject: (error: Error) => void;
} {
	let resolve: (value: T) => void;
	let reject: (error: Error) => void;

	const promise = new Promise<T>((res, rej) => {
		resolve = res;
		reject = rej;
	});

	return {
		promise,
		resolve: resolve as (value: T | PromiseLike<T>) => void,
		reject: reject as (reason?: unknown) => void,
	};
}
