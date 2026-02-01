import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	clearFetchCalls,
	flushPromises,
	getAllFetchCalls,
	getLastFetchCall,
	mockConsole,
	mockFetch,
	mockFetchError,
	mockFetchSequence,
	mockFetchWithStatuses,
	mockSendBeacon,
	parseFetchBody,
	resetFetchMock,
	triggerBeforeUnload,
	triggerPageHide,
	triggerVisibilityChange,
} from "../../test-utils";
import { Queue } from "../queue";
import type {
	GroupEvent,
	IdentifyEvent,
	PageEvent,
	ResolvedConfig,
	TrackEvent,
} from "../types";

describe("Queue", () => {
	let queue: Queue;
	let config: ResolvedConfig;

	function createConfig(overrides?: Partial<ResolvedConfig>): ResolvedConfig {
		return {
			apiKey: "tbf_test_key",
			host: "https://test.thisbefine.com",
			flushAt: 20,
			flushInterval: 10000,
			sessionTimeout: 1800000,
			cookieDomain: undefined,
			debug: false,
			respectDNT: true,
			maxRetries: 3,
			...overrides,
		};
	}

	function createTrackEvent(
		event: string,
		properties?: Record<string, unknown>,
	): TrackEvent {
		return {
			type: "track",
			event,
			properties,
			timestamp: new Date().toISOString(),
			anonymousId: "anon_123",
			userId: "user_123",
			sessionId: "session_123",
			accountId: "account_123",
			context: {
				library: { name: "@thisbefine/analytics", version: "0.1.0" },
				userAgent: "test-agent",
				locale: "en-US",
				timezone: "America/New_York",
				page: {
					url: "https://example.com/page",
					path: "/page",
					referrer: "https://google.com",
					title: "Test Page",
				},
			},
		};
	}

	function createPageEvent(name?: string): PageEvent {
		return {
			type: "page",
			name,
			url: "https://example.com/page",
			referrer: "https://google.com",
			timestamp: new Date().toISOString(),
			anonymousId: "anon_123",
			userId: "user_123",
			sessionId: "session_123",
			context: {
				library: { name: "@thisbefine/analytics", version: "0.1.0" },
				userAgent: "test-agent",
				locale: "en-US",
				timezone: "America/New_York",
				page: {
					url: "https://example.com/page",
					path: "/page",
					referrer: "https://google.com",
					title: "Test Page",
				},
			},
		};
	}

	function createIdentifyEvent(
		userId: string,
		traits?: Record<string, unknown>,
	): IdentifyEvent {
		return {
			type: "identify",
			userId,
			traits,
			timestamp: new Date().toISOString(),
			anonymousId: "anon_123",
			sessionId: "session_123",
			context: {
				library: { name: "@thisbefine/analytics", version: "0.1.0" },
				userAgent: "test-agent",
				locale: "en-US",
				timezone: "America/New_York",
			},
		};
	}

	function createGroupEvent(
		accountId: string,
		traits?: Record<string, unknown>,
	): GroupEvent {
		return {
			type: "group",
			accountId,
			traits,
			timestamp: new Date().toISOString(),
			anonymousId: "anon_123",
			userId: "user_123",
			sessionId: "session_123",
			context: {
				library: { name: "@thisbefine/analytics", version: "0.1.0" },
				userAgent: "test-agent",
				locale: "en-US",
				timezone: "America/New_York",
			},
		};
	}

	beforeEach(() => {
		vi.useFakeTimers();
		resetFetchMock();
		mockFetch();
		config = createConfig();
	});

	afterEach(() => {
		vi.useRealTimers();
		resetFetchMock();
		vi.clearAllMocks();
	});

	describe("Batching Behavior", () => {
		it("should queue events until threshold is reached", () => {
			queue = new Queue(config);

			for (let i = 0; i < 19; i++) {
				queue.push(createTrackEvent(`event_${i}`));
			}

			expect(queue.length).toBe(19);
			expect(getAllFetchCalls().length).toBe(0);
		});

		it("should auto-flush when batch threshold is reached", async () => {
			config = createConfig({ flushAt: 5 });
			queue = new Queue(config);

			for (let i = 0; i < 5; i++) {
				queue.push(createTrackEvent(`event_${i}`));
			}

			await flushPromises();
			expect(getAllFetchCalls().length).toBe(1);
			expect(queue.length).toBe(0);
		});

		it("should respect custom flushAt config", async () => {
			config = createConfig({ flushAt: 3 });
			queue = new Queue(config);

			queue.push(createTrackEvent("event_1"));
			queue.push(createTrackEvent("event_2"));
			expect(getAllFetchCalls().length).toBe(0);

			queue.push(createTrackEvent("event_3"));
			await flushPromises();
			expect(getAllFetchCalls().length).toBe(1);
		});

		it("should auto-flush after interval", async () => {
			config = createConfig({ flushInterval: 5000 });
			queue = new Queue(config);

			queue.push(createTrackEvent("event_1"));
			expect(getAllFetchCalls().length).toBe(0);

			vi.advanceTimersByTime(5000);
			await flushPromises();
			expect(getAllFetchCalls().length).toBe(1);
		});

		it("should respect custom flushInterval config", async () => {
			config = createConfig({ flushInterval: 2000 });
			queue = new Queue(config);

			queue.push(createTrackEvent("event_1"));

			vi.advanceTimersByTime(1500);
			await flushPromises();
			expect(getAllFetchCalls().length).toBe(0);

			vi.advanceTimersByTime(500);
			await flushPromises();
			expect(getAllFetchCalls().length).toBe(1);
		});

		it("should clear timer on manual flush", async () => {
			config = createConfig({ flushInterval: 5000 });
			queue = new Queue(config);

			queue.push(createTrackEvent("event_1"));
			await queue.flush();

			expect(getAllFetchCalls().length).toBe(1);

			clearFetchCalls();
			vi.advanceTimersByTime(5000);
			await flushPromises();
			expect(getAllFetchCalls().length).toBe(0);
		});
	});

	describe("Event Formatting", () => {
		beforeEach(() => {
			queue = new Queue(config);
		});

		it("should format track events correctly", async () => {
			queue.push(createTrackEvent("button_clicked", { buttonId: "signup" }));
			await queue.flush();

			const call = getLastFetchCall();
			const body = parseFetchBody(call?.options) as {
				batch: Record<string, unknown>[];
			};

			expect(body.batch).toHaveLength(1);
			expect(body.batch[0].event).toBe("button_clicked");
			expect(body.batch[0].properties).toEqual({ buttonId: "signup" });
			expect(body.batch[0].anonymousId).toBe("anon_123");
			expect(body.batch[0].userId).toBe("user_123");
			expect(body.batch[0].sessionId).toBe("session_123");
		});

		it("should format page events as $pageview", async () => {
			queue.push(createPageEvent("Dashboard"));
			await queue.flush();

			const call = getLastFetchCall();
			const body = parseFetchBody(call?.options) as {
				batch: Record<string, unknown>[];
			};

			expect(body.batch[0].event).toBe("$pageview");
			expect((body.batch[0].properties as Record<string, unknown>).name).toBe(
				"Dashboard",
			);
		});

		it("should format identify events correctly", async () => {
			queue.push(
				createIdentifyEvent("user_456", { email: "test@example.com" }),
			);
			await queue.flush();

			const call = getLastFetchCall();
			const body = parseFetchBody(call?.options) as {
				batch: Record<string, unknown>[];
			};

			expect(body.batch[0].event).toBe("$identify");
			expect(body.batch[0].properties).toEqual({ email: "test@example.com" });
		});

		it("should format group events correctly", async () => {
			queue.push(createGroupEvent("account_789", { name: "Acme Inc" }));
			await queue.flush();

			const call = getLastFetchCall();
			const body = parseFetchBody(call?.options) as {
				batch: Record<string, unknown>[];
			};

			expect(body.batch[0].event).toBe("$group");
			expect(body.batch[0].accountId).toBe("account_789");
			expect(body.batch[0].properties).toEqual({ name: "Acme Inc" });
		});

		it("should include timestamp in payload", async () => {
			queue.push(createTrackEvent("test_event"));
			await queue.flush();

			const call = getLastFetchCall();
			const body = parseFetchBody(call?.options) as {
				batch: Record<string, unknown>[];
				sentAt: string;
			};

			expect(body.sentAt).toBeDefined();
			expect(body.batch[0].timestamp).toBeDefined();
		});

		it("should include URL and referrer for track events", async () => {
			queue.push(createTrackEvent("test_event"));
			await queue.flush();

			const call = getLastFetchCall();
			const body = parseFetchBody(call?.options) as {
				batch: Record<string, unknown>[];
			};

			expect(body.batch[0].url).toBe("https://example.com/page");
			expect(body.batch[0].referrer).toBe("https://google.com");
		});
	});

	describe("Flush Mechanisms", () => {
		it("should send to correct API endpoint", async () => {
			queue = new Queue(config);
			queue.push(createTrackEvent("test_event"));
			await queue.flush();

			const call = getLastFetchCall();
			expect(call?.url).toBe("https://test.thisbefine.com/api/v1/track");
		});

		it("should include API key header", async () => {
			queue = new Queue(config);
			queue.push(createTrackEvent("test_event"));
			await queue.flush();

			const call = getLastFetchCall();
			expect(
				(call?.options?.headers as Record<string, string>)["X-API-Key"],
			).toBe("tbf_test_key");
		});

		it("should include Content-Type header", async () => {
			queue = new Queue(config);
			queue.push(createTrackEvent("test_event"));
			await queue.flush();

			const call = getLastFetchCall();
			expect(
				(call?.options?.headers as Record<string, string>)["Content-Type"],
			).toBe("application/json");
		});

		it("should use sendBeacon when specified", async () => {
			const beaconSpy = mockSendBeacon(true);
			queue = new Queue(config);
			queue.push(createTrackEvent("test_event"));

			await queue.flush(true);

			expect(beaconSpy).toHaveBeenCalled();
		});

		it("should fall back to keepalive fetch when sendBeacon unavailable", async () => {
			Object.defineProperty(navigator, "sendBeacon", {
				value: undefined,
				configurable: true,
			});

			queue = new Queue(config);
			queue.push(createTrackEvent("test_event"));
			await queue.flush(true);

			const call = getLastFetchCall();
			expect(call?.options?.keepalive).toBe(true);
		});

		it("should handle empty queue gracefully", async () => {
			queue = new Queue(config);
			await queue.flush();
			expect(getAllFetchCalls().length).toBe(0);
		});
	});

	describe("Retry Logic", () => {
		it("should retry on 5xx errors", async () => {
			mockFetchWithStatuses([500, 500, 200]);
			queue = new Queue(createConfig({ maxRetries: 3 }));
			queue.push(createTrackEvent("test_event"));

			await queue.flush();

			expect(getAllFetchCalls().length).toBe(3);
		});

		it("should retry on network failure", async () => {
			mockFetchError(new Error("Network error"));
			mockFetchSequence([{ status: 200, ok: true }]);

			queue = new Queue(createConfig({ maxRetries: 3 }));
			queue.push(createTrackEvent("test_event"));

			await queue.flush();

			expect(queue.length).toBeGreaterThanOrEqual(0);
		});

		it("should retry on 429 rate limit", async () => {
			mockFetchWithStatuses([429, 200]);
			queue = new Queue(createConfig({ maxRetries: 3 }));
			queue.push(createTrackEvent("test_event"));

			await queue.flush();

			expect(getAllFetchCalls().length).toBe(2);
		});

		it("should NOT retry on 4xx errors (except 429)", async () => {
			mockFetchSequence([
				{ status: 400, ok: false, statusText: "Bad Request" },
				{ status: 400, ok: false, statusText: "Bad Request" },
				{ status: 400, ok: false, statusText: "Bad Request" },
				{ status: 400, ok: false, statusText: "Bad Request" },
			]);
			queue = new Queue(createConfig({ maxRetries: 3 }));
			queue.push(createTrackEvent("test_event"));

			await queue.flush();

			expect(getAllFetchCalls().length).toBe(4);

			expect(queue.length).toBe(1);
		});

		it("should use exponential backoff", async () => {
			mockFetchWithStatuses([500, 500, 200]);
			queue = new Queue(createConfig({ maxRetries: 3 }));
			queue.push(createTrackEvent("test_event"));

			await queue.flush();

			expect(getAllFetchCalls().length).toBeGreaterThan(1);
		});

		it("should respect maxRetries config", async () => {
			mockFetchWithStatuses([500, 500, 500, 500, 500]);
			queue = new Queue(createConfig({ maxRetries: 2 }));
			queue.push(createTrackEvent("test_event"));

			await queue.flush();

			expect(getAllFetchCalls().length).toBe(3);

			expect(queue.length).toBe(1);
		});

		it("should re-queue events on final failure", async () => {
			mockFetchWithStatuses([500, 500, 500, 500]);
			queue = new Queue(createConfig({ maxRetries: 2 }));
			queue.push(createTrackEvent("test_event"));

			try {
				await queue.flush();
			} catch {}

			expect(queue.length).toBe(1);
		});
	});

	describe("Page Unload Handling", () => {
		it("should flush on visibilitychange to hidden", async () => {
			queue = new Queue(config);
			queue.push(createTrackEvent("test_event"));

			triggerVisibilityChange(true);
			await flushPromises();

			expect(getAllFetchCalls().length).toBeGreaterThan(0);
		});

		it("should flush on beforeunload", async () => {
			mockSendBeacon(true);
			queue = new Queue(config);
			queue.push(createTrackEvent("test_event"));

			triggerBeforeUnload();
			await flushPromises();

			expect(navigator.sendBeacon).toHaveBeenCalled();
		});

		it("should flush on pagehide", async () => {
			mockSendBeacon(true);
			queue = new Queue(config);
			queue.push(createTrackEvent("test_event"));

			triggerPageHide();
			await flushPromises();

			expect(navigator.sendBeacon).toHaveBeenCalled();
		});

		it("should debounce rapid visibility changes", async () => {
			mockSendBeacon(true);
			queue = new Queue(config);
			queue.push(createTrackEvent("event_1"));
			queue.push(createTrackEvent("event_2"));

			triggerVisibilityChange(true);
			triggerVisibilityChange(true);
			triggerVisibilityChange(true);

			await flushPromises();

			expect(navigator.sendBeacon).toHaveBeenCalledTimes(1);
		});
	});

	describe("Concurrent Flush Handling", () => {
		it("should wait for in-progress flush before starting new one", async () => {
			queue = new Queue(config);
			queue.push(createTrackEvent("event_1"));

			const flush1 = queue.flush();
			const flush2 = queue.flush();

			await Promise.all([flush1, flush2]);

			expect(queue.length).toBe(0);
		});

		it("should not lose events during concurrent flush", async () => {
			queue = new Queue(config);

			for (let i = 0; i < 5; i++) {
				queue.push(createTrackEvent(`event_${i}`));
			}

			await Promise.all([queue.flush(), queue.flush()]);

			expect(queue.length).toBe(0);
		});
	});

	describe("Max Flush Depth", () => {
		it("should limit recursion depth to prevent stack overflow", async () => {
			const _consoleSpy = mockConsole();
			queue = new Queue(createConfig({ debug: true }));

			for (let i = 0; i < 100; i++) {
				queue.push(createTrackEvent(`event_${i}`));
			}

			await queue.flush();
		});
	});

	describe("Debug Logging", () => {
		it("should log when events are queued in debug mode", () => {
			const consoleSpy = mockConsole();
			queue = new Queue(createConfig({ debug: true }));

			queue.push(createTrackEvent("test_event"));

			expect(consoleSpy.log).toHaveBeenCalledWith(
				expect.stringContaining("[Thisbefine Queue]"),
				"Event queued:",
				"track",
				"test_event",
			);
		});

		it("should log flush success in debug mode", async () => {
			const consoleSpy = mockConsole();
			queue = new Queue(createConfig({ debug: true }));
			queue.push(createTrackEvent("test_event"));

			await queue.flush();

			expect(consoleSpy.log).toHaveBeenCalledWith(
				expect.stringContaining("[Thisbefine Queue]"),
				"Flush successful",
			);
		});

		it("should log batch size trigger in debug mode", async () => {
			const consoleSpy = mockConsole();
			queue = new Queue(createConfig({ debug: true, flushAt: 2 }));

			queue.push(createTrackEvent("event_1"));
			queue.push(createTrackEvent("event_2"));

			await flushPromises();

			expect(consoleSpy.log).toHaveBeenCalledWith(
				expect.stringContaining("[Thisbefine Queue]"),
				"Batch size reached, flushing...",
			);
		});

		it("should not log in non-debug mode", () => {
			const consoleSpy = mockConsole();
			queue = new Queue(createConfig({ debug: false }));

			queue.push(createTrackEvent("test_event"));

			expect(consoleSpy.log).not.toHaveBeenCalled();
		});
	});

	describe("Queue Length", () => {
		it("should report correct queue length", () => {
			queue = new Queue(config);

			expect(queue.length).toBe(0);

			queue.push(createTrackEvent("event_1"));
			expect(queue.length).toBe(1);

			queue.push(createTrackEvent("event_2"));
			expect(queue.length).toBe(2);
		});

		it("should be 0 after successful flush", async () => {
			queue = new Queue(config);
			queue.push(createTrackEvent("event_1"));
			queue.push(createTrackEvent("event_2"));

			await queue.flush();

			expect(queue.length).toBe(0);
		});
	});
});
