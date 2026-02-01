import { vi } from "vitest";

/**
 * Mock navigator.doNotTrack
 */
export function mockDNT(value: string | null): void {
	Object.defineProperty(navigator, "doNotTrack", {
		value,
		writable: true,
		configurable: true,
	});
}

/**
 * Mock window.doNotTrack
 */
export function mockWindowDNT(value: string | null): void {
	Object.defineProperty(window, "doNotTrack", {
		value,
		writable: true,
		configurable: true,
	});
}

/**
 * Mock navigator.msDoNotTrack (IE)
 */
export function mockMsDNT(value: string | null): void {
	Object.defineProperty(navigator, "msDoNotTrack", {
		value,
		writable: true,
		configurable: true,
	});
}

/**
 * Mock Global Privacy Control
 */
export function mockGPC(enabled: boolean): void {
	Object.defineProperty(navigator, "globalPrivacyControl", {
		value: enabled,
		writable: true,
		configurable: true,
	});
}

/**
 * Clear all DNT/GPC mocks
 */
export function clearPrivacyMocks(): void {
	Object.defineProperty(navigator, "doNotTrack", {
		value: null,
		writable: true,
		configurable: true,
	});
	Object.defineProperty(window, "doNotTrack", {
		value: undefined,
		writable: true,
		configurable: true,
	});
	Object.defineProperty(navigator, "msDoNotTrack", {
		value: undefined,
		writable: true,
		configurable: true,
	});
	Object.defineProperty(navigator, "globalPrivacyControl", {
		value: undefined,
		writable: true,
		configurable: true,
	});
}

/**
 * Mock navigator.userAgent
 */
export function mockUserAgent(userAgent: string): void {
	Object.defineProperty(navigator, "userAgent", {
		value: userAgent,
		writable: true,
		configurable: true,
	});
}

/**
 * Mock navigator.language
 */
export function mockLanguage(language: string): void {
	Object.defineProperty(navigator, "language", {
		value: language,
		writable: true,
		configurable: true,
	});
}

/**
 * Mock window.screen
 */
export function mockScreen(width: number, height: number): void {
	Object.defineProperty(window, "screen", {
		value: { width, height },
		writable: true,
		configurable: true,
	});
}

/**
 * Mock window.location
 */
export function mockLocation(overrides: Partial<Location>): void {
	const defaultLocation = {
		href: "https://example.com/page",
		pathname: "/page",
		search: "",
		hash: "",
		host: "example.com",
		hostname: "example.com",
		origin: "https://example.com",
		port: "",
		protocol: "https:",
		ancestorOrigins: {} as DOMStringList,
		assign: vi.fn(),
		reload: vi.fn(),
		replace: vi.fn(),
		toString: () => "https://example.com/page",
	};

	Object.defineProperty(window, "location", {
		value: { ...defaultLocation, ...overrides },
		writable: true,
		configurable: true,
	});
}

/**
 * Mock document.referrer
 */
export function mockReferrer(referrer: string): void {
	Object.defineProperty(document, "referrer", {
		value: referrer,
		writable: true,
		configurable: true,
	});
}

/**
 * Mock document.title
 */
export function mockTitle(title: string): void {
	Object.defineProperty(document, "title", {
		value: title,
		writable: true,
		configurable: true,
	});
}

/**
 * Mock document.cookie
 */
export function mockCookieEnabled(enabled: boolean): void {
	Object.defineProperty(navigator, "cookieEnabled", {
		value: enabled,
		writable: true,
		configurable: true,
	});
}

/**
 * Mock Intl.DateTimeFormat for timezone testing
 */
export function mockTimezone(timezone: string): void {
	const originalDateTimeFormat = Intl.DateTimeFormat;

	vi.spyOn(Intl, "DateTimeFormat").mockImplementation(((
		locales?: string | string[],
		options?: Intl.DateTimeFormatOptions,
	) => {
		const format = new originalDateTimeFormat(locales, options);
		return {
			...format,
			resolvedOptions: () => ({
				...format.resolvedOptions(),
				timeZone: timezone,
			}),
		} as Intl.DateTimeFormat;
		// biome-ignore lint/suspicious/noExplicitAny: Mocking Intl.DateTimeFormat requires flexible types
	}) as any);
}

/**
 * Mock window visibility state
 */
export function mockVisibilityState(state: DocumentVisibilityState): void {
	Object.defineProperty(document, "visibilityState", {
		value: state,
		writable: true,
		configurable: true,
	});
}

/**
 * Trigger visibility change event
 */
export function triggerVisibilityChange(hidden: boolean): void {
	mockVisibilityState(hidden ? "hidden" : "visible");
	document.dispatchEvent(new Event("visibilitychange"));
}

/**
 * Trigger beforeunload event
 */
export function triggerBeforeUnload(): void {
	window.dispatchEvent(new Event("beforeunload"));
}

/**
 * Trigger pagehide event
 */
export function triggerPageHide(): void {
	window.dispatchEvent(new Event("pagehide"));
}

/**
 * Mock console methods for testing debug output
 */
export function mockConsole() {
	return {
		log: vi.spyOn(console, "log").mockImplementation(() => {}),
		warn: vi.spyOn(console, "warn").mockImplementation(() => {}),
		error: vi.spyOn(console, "error").mockImplementation(() => {}),
	};
}

/**
 * Create mock history for testing navigation breadcrumbs
 */
export function mockHistory() {
	const pushStateSpy = vi.spyOn(history, "pushState");
	const replaceStateSpy = vi.spyOn(history, "replaceState");

	return {
		pushState: pushStateSpy,
		replaceState: replaceStateSpy,
		restore: () => {
			pushStateSpy.mockRestore();
			replaceStateSpy.mockRestore();
		},
	};
}
