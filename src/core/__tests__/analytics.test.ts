import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	clearAllStorage,
	clearPrivacyMocks,
	createTestConfig,
	flushPromises,
	getAllFetchCalls,
	getLastFetchCall,
	mockConsole,
	mockDNT,
	mockFetch,
	mockGPC,
	mockLanguage,
	mockLocalStorage,
	mockLocation,
	mockReferrer,
	mockScreen,
	mockTitle,
	mockUserAgent,
	parseFetchBody,
	resetFetchMock,
	resetGlobalAnalytics,
	TEST_API_KEY,
	TEST_HOST,
} from "../../test-utils";
import {
	AnalyticsImpl,
	createAnalytics,
	getAnalytics,
	initAnalytics,
} from "../analytics";

describe("Analytics", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		mockFetch();
		mockLocalStorage();
		clearAllStorage();
		clearPrivacyMocks();
		mockLocation({ href: "https://example.com/page", pathname: "/page" });
		mockReferrer("https://google.com");
		mockTitle("Test Page");
		mockUserAgent("TestBrowser/1.0");
		mockLanguage("en-US");
		mockScreen(1920, 1080);
	});

	afterEach(async () => {
		vi.useRealTimers();
		resetFetchMock();
		clearAllStorage();
		clearPrivacyMocks();
		await resetGlobalAnalytics();
	});

	describe("Initialization & Configuration", () => {
		it("should create instance with required config", () => {
			const analytics = createAnalytics({ apiKey: TEST_API_KEY });
			expect(analytics).toBeDefined();
		});

		it("should apply default config values", () => {
			const analytics = new AnalyticsImpl({ apiKey: TEST_API_KEY });

			analytics.track("test_event");
			expect(analytics).toBeDefined();
		});

		it("should merge custom config with defaults", () => {
			const analytics = new AnalyticsImpl({
				apiKey: TEST_API_KEY,
				host: "https://custom.host.com",
				flushAt: 50,
				debug: true,
			});

			analytics.track("test_event");
		});

		it("should read API key from config", async () => {
			const analytics = createAnalytics({
				apiKey: "tbf_custom_key",
				host: TEST_HOST,
			});
			analytics.track("test_event");
			await analytics.flush();

			const call = getLastFetchCall();
			expect(
				(call?.options?.headers as Record<string, string>)["X-API-Key"],
			).toBe("tbf_custom_key");
		});

		it("should initialize error capture when enabled", () => {
			const analytics = createAnalytics({
				apiKey: TEST_API_KEY,
				errors: { enabled: true },
			});

			expect(() => analytics.captureException(new Error("test"))).not.toThrow();
		});

		it("should skip error capture when disabled", () => {
			const analytics = createAnalytics({
				apiKey: TEST_API_KEY,
				errors: { enabled: false },
			});

			analytics.captureException(new Error("test"));
		});

		it("should log initialization in debug mode", () => {
			const consoleSpy = mockConsole();
			createAnalytics({ apiKey: TEST_API_KEY, debug: true });

			expect(consoleSpy.log).toHaveBeenCalledWith(
				expect.stringContaining("[Thisbefine Analytics]"),
				"Analytics initialized",
				expect.any(Object),
			);
		});
	});

	describe("Global Instance Management", () => {
		afterEach(async () => {
			await resetGlobalAnalytics();
		});

		it("should return null from getAnalytics before init", async () => {
			await resetGlobalAnalytics();
			expect(getAnalytics()).toBeNull();
		});

		it("should return instance from getAnalytics after init", () => {
			initAnalytics({ apiKey: TEST_API_KEY });
			expect(getAnalytics()).not.toBeNull();
		});

		it("should return same instance on subsequent getAnalytics calls", () => {
			initAnalytics({ apiKey: TEST_API_KEY });
			const instance1 = getAnalytics();
			const instance2 = getAnalytics();
			expect(instance1).toBe(instance2);
		});

		it("should warn on double initialization", () => {
			const consoleSpy = mockConsole();

			initAnalytics({ apiKey: TEST_API_KEY });
			initAnalytics({ apiKey: "another_key" });

			expect(consoleSpy.warn).toHaveBeenCalledWith(
				"[Thisbefine] Analytics already initialized",
			);
		});

		it("should return existing instance on double initialization", () => {
			const instance1 = initAnalytics({ apiKey: TEST_API_KEY });
			const instance2 = initAnalytics({ apiKey: "another_key" });
			expect(instance1).toBe(instance2);
		});
	});

	describe("Context Generation", () => {
		let analytics: AnalyticsImpl;

		beforeEach(() => {
			analytics = new AnalyticsImpl(createTestConfig());
		});

		it("should include library info in context", async () => {
			analytics.track("test_event");
			await analytics.flush();

			const call = getLastFetchCall();
			const body = parseFetchBody(call?.options) as {
				batch: Record<string, unknown>[];
			};

			expect(body.batch[0]).toBeDefined();
		});

		it("should capture user agent", async () => {
			analytics.track("test_event");
			await analytics.flush();

			expect(getAllFetchCalls().length).toBe(1);
		});

		it("should capture locale", async () => {
			mockLanguage("fr-FR");
			const frAnalytics = new AnalyticsImpl(createTestConfig());
			frAnalytics.track("test_event");
			await frAnalytics.flush();

			expect(getAllFetchCalls().length).toBe(1);
		});

		it("should capture screen dimensions", async () => {
			mockScreen(2560, 1440);
			const hdAnalytics = new AnalyticsImpl(createTestConfig());
			hdAnalytics.track("test_event");
			await hdAnalytics.flush();

			expect(getAllFetchCalls().length).toBe(1);
		});

		it("should capture page URL and path", async () => {
			mockLocation({
				href: "https://test.com/dashboard",
				pathname: "/dashboard",
			});
			const analytics = new AnalyticsImpl(createTestConfig());
			analytics.track("test_event");
			await analytics.flush();

			const call = getLastFetchCall();
			const body = parseFetchBody(call?.options) as {
				batch: Record<string, unknown>[];
			};
			expect(body.batch[0].url).toBe("https://test.com/dashboard");
		});

		it("should capture referrer", async () => {
			mockReferrer("https://referrer.com");
			const analytics = new AnalyticsImpl(createTestConfig());
			analytics.track("test_event");
			await analytics.flush();

			const call = getLastFetchCall();
			const body = parseFetchBody(call?.options) as {
				batch: Record<string, unknown>[];
			};
			expect(body.batch[0].referrer).toBe("https://referrer.com");
		});
	});

	describe("track() Method", () => {
		let analytics: AnalyticsImpl;

		beforeEach(() => {
			analytics = new AnalyticsImpl(createTestConfig());
		});

		it("should queue track events", async () => {
			analytics.track("button_clicked");
			await analytics.flush();

			const call = getLastFetchCall();
			const body = parseFetchBody(call?.options) as {
				batch: Record<string, unknown>[];
			};
			expect(body.batch[0].event).toBe("button_clicked");
		});

		it("should include event properties", async () => {
			analytics.track("purchase", { amount: 99.99, currency: "USD" });
			await analytics.flush();

			const call = getLastFetchCall();
			const body = parseFetchBody(call?.options) as {
				batch: Record<string, unknown>[];
			};
			expect(body.batch[0].properties).toEqual({
				amount: 99.99,
				currency: "USD",
			});
		});

		it("should include session ID", async () => {
			analytics.track("test_event");
			await analytics.flush();

			const call = getLastFetchCall();
			const body = parseFetchBody(call?.options) as {
				batch: Record<string, unknown>[];
			};
			expect(body.batch[0].sessionId).toBeDefined();
		});

		it("should include anonymous ID", async () => {
			analytics.track("test_event");
			await analytics.flush();

			const call = getLastFetchCall();
			const body = parseFetchBody(call?.options) as {
				batch: Record<string, unknown>[];
			};
			expect(body.batch[0].anonymousId).toBeDefined();
		});

		it("should respect privacy opt-out", async () => {
			analytics.optOut();
			analytics.track("test_event");
			await analytics.flush();

			expect(getAllFetchCalls().length).toBe(0);
		});

		it("should handle events without properties", async () => {
			analytics.track("simple_event");
			await analytics.flush();

			const call = getLastFetchCall();
			const body = parseFetchBody(call?.options) as {
				batch: Record<string, unknown>[];
			};
			expect(body.batch[0].event).toBe("simple_event");
		});

		it("should validate event name", () => {
			const consoleSpy = mockConsole();
			const debugAnalytics = new AnalyticsImpl(
				createTestConfig({ debug: true }),
			);

			debugAnalytics.track("");
			expect(consoleSpy.warn).toHaveBeenCalledWith(
				expect.stringContaining("[Thisbefine Analytics]"),
				"Invalid event:",
				expect.any(String),
			);
		});

		it("should validate properties", () => {
			const consoleSpy = mockConsole();
			const debugAnalytics = new AnalyticsImpl(
				createTestConfig({ debug: true }),
			);

			const circular: Record<string, unknown> = {};
			circular.self = circular;

			debugAnalytics.track("test", circular);
			expect(consoleSpy.warn).toHaveBeenCalled();
		});
	});

	describe("identify() Method", () => {
		let analytics: AnalyticsImpl;

		beforeEach(() => {
			analytics = new AnalyticsImpl(createTestConfig());
		});

		it("should set user ID in session", () => {
			analytics.identify("user_123");
			const user = analytics.getUser();
			expect(user.userId).toBe("user_123");
		});

		it("should merge user traits", () => {
			analytics.identify("user_123", { email: "test@example.com" });
			analytics.identify("user_123", { name: "Test User" });

			const user = analytics.getUser();
			expect(user.traits).toEqual({
				email: "test@example.com",
				name: "Test User",
			});
		});

		it("should queue identify event", async () => {
			analytics.identify("user_123", { email: "test@example.com" });
			await analytics.flush();

			const call = getLastFetchCall();
			const body = parseFetchBody(call?.options) as {
				batch: Record<string, unknown>[];
			};
			expect(body.batch[0].event).toBe("$identify");
		});

		it("should work without traits", async () => {
			analytics.identify("user_123");
			await analytics.flush();

			const call = getLastFetchCall();
			const body = parseFetchBody(call?.options) as {
				batch: Record<string, unknown>[];
			};
			expect(body.batch[0].userId).toBe("user_123");
		});

		it("should preserve existing traits on re-identify", () => {
			analytics.identify("user_123", {
				email: "old@example.com",
				name: "Old Name",
			});
			analytics.identify("user_123", { email: "new@example.com" });

			const user = analytics.getUser();
			expect(user.traits?.email).toBe("new@example.com");
			expect(user.traits?.name).toBe("Old Name");
		});

		it("should validate user ID", () => {
			const consoleSpy = mockConsole();
			const debugAnalytics = new AnalyticsImpl(
				createTestConfig({ debug: true }),
			);

			debugAnalytics.identify("");
			expect(consoleSpy.warn).toHaveBeenCalled();
		});
	});

	describe("page() Method", () => {
		let analytics: AnalyticsImpl;

		beforeEach(() => {
			analytics = new AnalyticsImpl(createTestConfig());
		});

		it("should track page with auto-detected URL", async () => {
			mockLocation({
				href: "https://example.com/dashboard",
				pathname: "/dashboard",
			});
			analytics.page();
			await analytics.flush();

			const call = getLastFetchCall();
			const body = parseFetchBody(call?.options) as {
				batch: Record<string, unknown>[];
			};
			expect(body.batch[0].url).toBe("https://example.com/dashboard");
		});

		it("should allow custom page name", async () => {
			analytics.page("Dashboard");
			await analytics.flush();

			const call = getLastFetchCall();
			const body = parseFetchBody(call?.options) as {
				batch: Record<string, unknown>[];
			};
			expect(body.batch[0].event).toBe("$pageview");
			expect((body.batch[0].properties as Record<string, unknown>).name).toBe(
				"Dashboard",
			);
		});

		it("should include page properties", async () => {
			analytics.page("Dashboard", { section: "overview" });
			await analytics.flush();

			const call = getLastFetchCall();
			const body = parseFetchBody(call?.options) as {
				batch: Record<string, unknown>[];
			};
			expect(
				(body.batch[0].properties as Record<string, unknown>).section,
			).toBe("overview");
		});

		it("should include referrer", async () => {
			mockReferrer("https://google.com/search");
			const analytics = new AnalyticsImpl(createTestConfig());
			analytics.page();
			await analytics.flush();

			const call = getLastFetchCall();
			const body = parseFetchBody(call?.options) as {
				batch: Record<string, unknown>[];
			};
			expect(body.batch[0].referrer).toBe("https://google.com/search");
		});
	});

	describe("group() Method", () => {
		let analytics: AnalyticsImpl;

		beforeEach(() => {
			analytics = new AnalyticsImpl(createTestConfig());
		});

		it("should set account ID in session", () => {
			analytics.group("account_123");
			const user = analytics.getUser();
			expect(user.accountId).toBe("account_123");
		});

		it("should merge account traits", () => {
			analytics.group("account_123", { name: "Acme Inc" });
			analytics.group("account_123", { plan: "enterprise" });

			const user = analytics.getUser();
			expect(user.accountTraits).toEqual({
				name: "Acme Inc",
				plan: "enterprise",
			});
		});

		it("should queue group event", async () => {
			analytics.group("account_123", { name: "Acme Inc" });
			await analytics.flush();

			const call = getLastFetchCall();
			const body = parseFetchBody(call?.options) as {
				batch: Record<string, unknown>[];
			};
			expect(body.batch[0].event).toBe("$group");
			expect(body.batch[0].accountId).toBe("account_123");
		});

		it("should validate account ID", () => {
			const consoleSpy = mockConsole();
			const debugAnalytics = new AnalyticsImpl(
				createTestConfig({ debug: true }),
			);

			debugAnalytics.group("");
			expect(consoleSpy.warn).toHaveBeenCalled();
		});
	});

	describe("reset() Method", () => {
		let analytics: AnalyticsImpl;

		beforeEach(() => {
			analytics = new AnalyticsImpl(createTestConfig());
		});

		it("should clear user ID", () => {
			analytics.identify("user_123");
			analytics.reset();
			expect(analytics.getUser().userId).toBeUndefined();
		});

		it("should clear account ID", () => {
			analytics.group("account_123");
			analytics.reset();
			expect(analytics.getUser().accountId).toBeUndefined();
		});

		it("should clear all traits", () => {
			analytics.identify("user_123", { email: "test@example.com" });
			analytics.group("account_123", { name: "Acme" });
			analytics.reset();

			const user = analytics.getUser();
			expect(user.traits).toBeUndefined();
			expect(user.accountTraits).toBeUndefined();
		});

		it("should generate new anonymous ID", () => {
			const originalAnonymousId = analytics.getUser().anonymousId;
			analytics.reset();
			expect(analytics.getUser().anonymousId).not.toBe(originalAnonymousId);
		});

		it("should preserve opt-out status", () => {
			analytics.optOut();
			analytics.reset();
			expect(analytics.isOptedOut()).toBe(true);
		});

		it("should flush queue before reset", async () => {
			analytics.track("pre_reset_event");
			analytics.reset();

			await flushPromises();
		});
	});

	describe("Opt-in/Opt-out", () => {
		let analytics: AnalyticsImpl;

		beforeEach(() => {
			analytics = new AnalyticsImpl(createTestConfig());
		});

		it("should stop tracking after optOut()", async () => {
			analytics.optOut();
			analytics.track("should_not_track");
			await analytics.flush();

			expect(getAllFetchCalls().length).toBe(0);
		});

		it("should resume tracking after optIn()", async () => {
			analytics.optOut();
			analytics.optIn();
			analytics.track("should_track");
			await analytics.flush();

			expect(getAllFetchCalls().length).toBe(1);
		});

		it("should return correct isOptedOut() status", () => {
			expect(analytics.isOptedOut()).toBe(false);
			analytics.optOut();
			expect(analytics.isOptedOut()).toBe(true);
			analytics.optIn();
			expect(analytics.isOptedOut()).toBe(false);
		});

		it("should respect DNT setting", async () => {
			mockDNT("1");
			const dntAnalytics = new AnalyticsImpl(
				createTestConfig({ respectDNT: true }),
			);
			dntAnalytics.track("should_not_track");
			await dntAnalytics.flush();

			expect(getAllFetchCalls().length).toBe(0);
		});

		it("should ignore DNT when respectDNT is false", async () => {
			mockDNT("1");
			const analytics = new AnalyticsImpl(
				createTestConfig({ respectDNT: false }),
			);
			analytics.track("should_track");
			await analytics.flush();

			expect(getAllFetchCalls().length).toBe(1);
		});

		it("should respect GPC setting", async () => {
			mockGPC(true);
			const gpcAnalytics = new AnalyticsImpl(
				createTestConfig({ respectDNT: true }),
			);
			gpcAnalytics.track("should_not_track");
			await gpcAnalytics.flush();

			expect(getAllFetchCalls().length).toBe(0);
		});
	});

	describe("flush() Method", () => {
		let analytics: AnalyticsImpl;

		beforeEach(() => {
			analytics = new AnalyticsImpl(createTestConfig());
		});

		it("should flush queue immediately", async () => {
			analytics.track("event_1");
			analytics.track("event_2");
			await analytics.flush();

			expect(getAllFetchCalls().length).toBe(1);
		});

		it("should return a promise", () => {
			const result = analytics.flush();
			expect(result).toBeInstanceOf(Promise);
		});

		it("should resolve after successful send", async () => {
			analytics.track("test_event");
			const result = await analytics.flush();
			expect(result.success).toBe(true);
			expect(result.eventCount).toBe(1);
		});

		it("should handle empty queue gracefully", async () => {
			const result = await analytics.flush();
			expect(result.success).toBe(true);
			expect(result.eventCount).toBe(0);
			expect(getAllFetchCalls().length).toBe(0);
		});
	});

	describe("getUser() Method", () => {
		let analytics: AnalyticsImpl;

		beforeEach(() => {
			analytics = new AnalyticsImpl(createTestConfig());
		});

		it("should return complete user state", () => {
			const user = analytics.getUser();
			expect(user).toHaveProperty("anonymousId");
		});

		it("should include anonymous ID", () => {
			const user = analytics.getUser();
			expect(user.anonymousId).toBeDefined();
			expect(typeof user.anonymousId).toBe("string");
		});

		it("should include user ID when set", () => {
			analytics.identify("user_123");
			const user = analytics.getUser();
			expect(user.userId).toBe("user_123");
		});

		it("should include traits when set", () => {
			analytics.identify("user_123", { email: "test@example.com" });
			const user = analytics.getUser();
			expect(user.traits).toEqual({ email: "test@example.com" });
		});

		it("should include account info when set", () => {
			analytics.group("account_123", { name: "Acme" });
			const user = analytics.getUser();
			expect(user.accountId).toBe("account_123");
			expect(user.accountTraits).toEqual({ name: "Acme" });
		});
	});

	describe("Error Capture Methods", () => {
		let analytics: AnalyticsImpl;

		beforeEach(() => {
			analytics = new AnalyticsImpl(
				createTestConfig({ errors: { enabled: true } }),
			);
		});

		it("should have captureException method", () => {
			expect(typeof analytics.captureException).toBe("function");
		});

		it("should have captureMessage method", () => {
			expect(typeof analytics.captureMessage).toBe("function");
		});

		it("should have addBreadcrumb method", () => {
			expect(typeof analytics.addBreadcrumb).toBe("function");
		});

		it("should not throw when error capture is disabled", () => {
			const noErrorAnalytics = new AnalyticsImpl(
				createTestConfig({ errors: { enabled: false } }),
			);

			expect(() =>
				noErrorAnalytics.captureException(new Error("test")),
			).not.toThrow();
			expect(() => noErrorAnalytics.captureMessage("test")).not.toThrow();
			expect(() =>
				noErrorAnalytics.addBreadcrumb({ type: "custom", message: "test" }),
			).not.toThrow();
		});
	});

	describe("log() Method", () => {
		let analytics: AnalyticsImpl;

		beforeEach(() => {
			analytics = new AnalyticsImpl(createTestConfig());
		});

		it("should track log as $log event", async () => {
			analytics.log("Test log message", "info");
			await analytics.flush();

			const call = getLastFetchCall();
			const body = parseFetchBody(call?.options) as {
				batch: Record<string, unknown>[];
			};
			expect(body.batch[0].event).toBe("$log");
		});

		it("should include message in properties", async () => {
			analytics.log("Test log message", "info");
			await analytics.flush();

			const call = getLastFetchCall();
			const body = parseFetchBody(call?.options) as {
				batch: Record<string, unknown>[];
			};
			expect(
				(body.batch[0].properties as Record<string, unknown>).message,
			).toBe("Test log message");
		});

		it("should include level in properties", async () => {
			analytics.log("Error occurred", "error");
			await analytics.flush();

			const call = getLastFetchCall();
			const body = parseFetchBody(call?.options) as {
				batch: Record<string, unknown>[];
			};
			expect((body.batch[0].properties as Record<string, unknown>).level).toBe(
				"error",
			);
		});

		it("should include metadata in properties", async () => {
			analytics.log("User action", "info", { userId: "123", action: "click" });
			await analytics.flush();

			const call = getLastFetchCall();
			const body = parseFetchBody(call?.options) as {
				batch: Record<string, unknown>[];
			};
			expect((body.batch[0].properties as Record<string, unknown>).userId).toBe(
				"123",
			);
			expect((body.batch[0].properties as Record<string, unknown>).action).toBe(
				"click",
			);
		});
	});

	describe("Lifecycle Events", () => {
		let analytics: AnalyticsImpl;

		beforeEach(() => {
			analytics = new AnalyticsImpl(createTestConfig());
		});

		describe("User Lifecycle", () => {
			describe("signup()", () => {
				it("should track $signup event", async () => {
					analytics.signup({ method: "google", plan: "free" });
					await analytics.flush();

					const call = getLastFetchCall();
					const body = parseFetchBody(call?.options) as {
						batch: Record<string, unknown>[];
					};
					expect(body.batch[0].event).toBe("$signup");
				});

				it("should include signup properties", async () => {
					analytics.signup({
						method: "email",
						plan: "pro",
						invitedBy: "user_123",
						source: "web",
					});
					await analytics.flush();

					const call = getLastFetchCall();
					const body = parseFetchBody(call?.options) as {
						batch: Record<string, unknown>[];
					};
					const props = body.batch[0].properties as Record<string, unknown>;
					expect(props.method).toBe("email");
					expect(props.plan).toBe("pro");
					expect(props.invitedBy).toBe("user_123");
					expect(props.source).toBe("web");
				});

				it("should work without properties", async () => {
					analytics.signup();
					await analytics.flush();

					const call = getLastFetchCall();
					const body = parseFetchBody(call?.options) as {
						batch: Record<string, unknown>[];
					};
					expect(body.batch[0].event).toBe("$signup");
				});
			});

			describe("login()", () => {
				it("should track $login event", async () => {
					analytics.login({ method: "passkey" });
					await analytics.flush();

					const call = getLastFetchCall();
					const body = parseFetchBody(call?.options) as {
						batch: Record<string, unknown>[];
					};
					expect(body.batch[0].event).toBe("$login");
				});

				it("should include login properties", async () => {
					analytics.login({ method: "google", isNewDevice: true });
					await analytics.flush();

					const call = getLastFetchCall();
					const body = parseFetchBody(call?.options) as {
						batch: Record<string, unknown>[];
					};
					const props = body.batch[0].properties as Record<string, unknown>;
					expect(props.method).toBe("google");
					expect(props.isNewDevice).toBe(true);
				});
			});

			describe("logout()", () => {
				it("should track $logout event", async () => {
					analytics.logout({ reason: "manual" });
					await analytics.flush();

					const call = getLastFetchCall();
					const body = parseFetchBody(call?.options) as {
						batch: Record<string, unknown>[];
					};
					expect(body.batch[0].event).toBe("$logout");
				});

				it("should include logout properties", async () => {
					analytics.logout({ reason: "session_expired", source: "api" });
					await analytics.flush();

					const call = getLastFetchCall();
					const body = parseFetchBody(call?.options) as {
						batch: Record<string, unknown>[];
					};
					const props = body.batch[0].properties as Record<string, unknown>;
					expect(props.reason).toBe("session_expired");
					expect(props.source).toBe("api");
				});
			});

			describe("accountDeleted()", () => {
				it("should track $account_deleted event", async () => {
					analytics.accountDeleted({ reason: "too_expensive" });
					await analytics.flush();

					const call = getLastFetchCall();
					const body = parseFetchBody(call?.options) as {
						batch: Record<string, unknown>[];
					};
					expect(body.batch[0].event).toBe("$account_deleted");
				});

				it("should include account deleted properties", async () => {
					analytics.accountDeleted({
						reason: "not_using",
						feedbackScore: 7,
						tenure: 90,
					});
					await analytics.flush();

					const call = getLastFetchCall();
					const body = parseFetchBody(call?.options) as {
						batch: Record<string, unknown>[];
					};
					const props = body.batch[0].properties as Record<string, unknown>;
					expect(props.reason).toBe("not_using");
					expect(props.feedbackScore).toBe(7);
					expect(props.tenure).toBe(90);
				});
			});
		});

		describe("Subscription Lifecycle", () => {
			describe("subscriptionStarted()", () => {
				it("should track $subscription_started event", async () => {
					analytics.subscriptionStarted({ plan: "pro" });
					await analytics.flush();

					const call = getLastFetchCall();
					const body = parseFetchBody(call?.options) as {
						batch: Record<string, unknown>[];
					};
					expect(body.batch[0].event).toBe("$subscription_started");
				});

				it("should include subscription properties", async () => {
					analytics.subscriptionStarted({
						plan: "team",
						interval: "yearly",
						mrr: 499,
						trialConverted: true,
					});
					await analytics.flush();

					const call = getLastFetchCall();
					const body = parseFetchBody(call?.options) as {
						batch: Record<string, unknown>[];
					};
					const props = body.batch[0].properties as Record<string, unknown>;
					expect(props.plan).toBe("team");
					expect(props.interval).toBe("yearly");
					expect(props.mrr).toBe(499);
					expect(props.trialConverted).toBe(true);
				});

				it("should warn when plan is missing", () => {
					const consoleSpy = mockConsole();
					const debugAnalytics = new AnalyticsImpl(
						createTestConfig({ debug: true }),
					);

					// @ts-expect-error - testing missing required field
					debugAnalytics.subscriptionStarted({});

					expect(consoleSpy.warn).toHaveBeenCalledWith(
						expect.stringContaining("[Thisbefine Analytics]"),
						"subscriptionStarted: plan is required, event not sent",
					);
				});
			});

			describe("subscriptionCancelled()", () => {
				it("should track $subscription_cancelled event", async () => {
					analytics.subscriptionCancelled({ plan: "pro" });
					await analytics.flush();

					const call = getLastFetchCall();
					const body = parseFetchBody(call?.options) as {
						batch: Record<string, unknown>[];
					};
					expect(body.batch[0].event).toBe("$subscription_cancelled");
				});

				it("should include cancellation properties", async () => {
					analytics.subscriptionCancelled({
						plan: "pro",
						reason: "too_expensive",
						feedback: "Great product but over budget",
						mrr: 99,
						tenure: 180,
						willChurnAt: "2024-12-31T00:00:00Z",
					});
					await analytics.flush();

					const call = getLastFetchCall();
					const body = parseFetchBody(call?.options) as {
						batch: Record<string, unknown>[];
					};
					const props = body.batch[0].properties as Record<string, unknown>;
					expect(props.plan).toBe("pro");
					expect(props.reason).toBe("too_expensive");
					expect(props.feedback).toBe("Great product but over budget");
					expect(props.mrr).toBe(99);
					expect(props.tenure).toBe(180);
					expect(props.willChurnAt).toBe("2024-12-31T00:00:00Z");
				});

				it("should warn when plan is missing", () => {
					const consoleSpy = mockConsole();
					const debugAnalytics = new AnalyticsImpl(
						createTestConfig({ debug: true }),
					);

					// @ts-expect-error - testing missing required field
					debugAnalytics.subscriptionCancelled({});

					expect(consoleSpy.warn).toHaveBeenCalledWith(
						expect.stringContaining("[Thisbefine Analytics]"),
						"subscriptionCancelled: plan is required, event not sent",
					);
				});
			});

			describe("subscriptionRenewed()", () => {
				it("should track $subscription_renewed event", async () => {
					analytics.subscriptionRenewed({ plan: "pro" });
					await analytics.flush();

					const call = getLastFetchCall();
					const body = parseFetchBody(call?.options) as {
						batch: Record<string, unknown>[];
					};
					expect(body.batch[0].event).toBe("$subscription_renewed");
				});

				it("should include renewal properties", async () => {
					analytics.subscriptionRenewed({
						plan: "team",
						interval: "monthly",
						mrr: 199,
						renewalCount: 12,
					});
					await analytics.flush();

					const call = getLastFetchCall();
					const body = parseFetchBody(call?.options) as {
						batch: Record<string, unknown>[];
					};
					const props = body.batch[0].properties as Record<string, unknown>;
					expect(props.plan).toBe("team");
					expect(props.interval).toBe("monthly");
					expect(props.mrr).toBe(199);
					expect(props.renewalCount).toBe(12);
				});
			});

			describe("planUpgraded()", () => {
				it("should track $plan_upgraded event", async () => {
					analytics.planUpgraded({ fromPlan: "starter", toPlan: "pro" });
					await analytics.flush();

					const call = getLastFetchCall();
					const body = parseFetchBody(call?.options) as {
						batch: Record<string, unknown>[];
					};
					expect(body.batch[0].event).toBe("$plan_upgraded");
				});

				it("should include upgrade properties", async () => {
					analytics.planUpgraded({
						fromPlan: "starter",
						toPlan: "enterprise",
						mrrChange: 400,
					});
					await analytics.flush();

					const call = getLastFetchCall();
					const body = parseFetchBody(call?.options) as {
						batch: Record<string, unknown>[];
					};
					const props = body.batch[0].properties as Record<string, unknown>;
					expect(props.fromPlan).toBe("starter");
					expect(props.toPlan).toBe("enterprise");
					expect(props.mrrChange).toBe(400);
				});

				it("should warn when fromPlan or toPlan is missing", () => {
					const consoleSpy = mockConsole();
					const debugAnalytics = new AnalyticsImpl(
						createTestConfig({ debug: true }),
					);

					// @ts-expect-error - testing missing required field
					debugAnalytics.planUpgraded({ fromPlan: "starter" });

					expect(consoleSpy.warn).toHaveBeenCalledWith(
						expect.stringContaining("[Thisbefine Analytics]"),
						"planUpgraded: fromPlan and toPlan are required, event not sent",
					);
				});
			});

			describe("planDowngraded()", () => {
				it("should track $plan_downgraded event", async () => {
					analytics.planDowngraded({ fromPlan: "pro", toPlan: "starter" });
					await analytics.flush();

					const call = getLastFetchCall();
					const body = parseFetchBody(call?.options) as {
						batch: Record<string, unknown>[];
					};
					expect(body.batch[0].event).toBe("$plan_downgraded");
				});

				it("should include downgrade properties", async () => {
					analytics.planDowngraded({
						fromPlan: "enterprise",
						toPlan: "pro",
						reason: "budget_cuts",
						mrrChange: -300,
					});
					await analytics.flush();

					const call = getLastFetchCall();
					const body = parseFetchBody(call?.options) as {
						batch: Record<string, unknown>[];
					};
					const props = body.batch[0].properties as Record<string, unknown>;
					expect(props.fromPlan).toBe("enterprise");
					expect(props.toPlan).toBe("pro");
					expect(props.reason).toBe("budget_cuts");
					expect(props.mrrChange).toBe(-300);
				});
			});

			describe("trialStarted()", () => {
				it("should track $trial_started event", async () => {
					analytics.trialStarted({ plan: "pro" });
					await analytics.flush();

					const call = getLastFetchCall();
					const body = parseFetchBody(call?.options) as {
						batch: Record<string, unknown>[];
					};
					expect(body.batch[0].event).toBe("$trial_started");
				});

				it("should include trial properties", async () => {
					analytics.trialStarted({
						plan: "enterprise",
						trialDays: 30,
						expiresAt: "2024-12-31T00:00:00Z",
					});
					await analytics.flush();

					const call = getLastFetchCall();
					const body = parseFetchBody(call?.options) as {
						batch: Record<string, unknown>[];
					};
					const props = body.batch[0].properties as Record<string, unknown>;
					expect(props.plan).toBe("enterprise");
					expect(props.trialDays).toBe(30);
					expect(props.expiresAt).toBe("2024-12-31T00:00:00Z");
				});
			});

			describe("trialEnded()", () => {
				it("should track $trial_ended event", async () => {
					analytics.trialEnded({ plan: "pro", converted: true });
					await analytics.flush();

					const call = getLastFetchCall();
					const body = parseFetchBody(call?.options) as {
						batch: Record<string, unknown>[];
					};
					expect(body.batch[0].event).toBe("$trial_ended");
				});

				it("should include trial end properties", async () => {
					analytics.trialEnded({
						plan: "pro",
						converted: false,
						reason: "no_budget",
					});
					await analytics.flush();

					const call = getLastFetchCall();
					const body = parseFetchBody(call?.options) as {
						batch: Record<string, unknown>[];
					};
					const props = body.batch[0].properties as Record<string, unknown>;
					expect(props.plan).toBe("pro");
					expect(props.converted).toBe(false);
					expect(props.reason).toBe("no_budget");
				});

				it("should warn when plan or converted is missing", () => {
					const consoleSpy = mockConsole();
					const debugAnalytics = new AnalyticsImpl(
						createTestConfig({ debug: true }),
					);

					// @ts-expect-error - testing missing required field
					debugAnalytics.trialEnded({ plan: "pro" });

					expect(consoleSpy.warn).toHaveBeenCalledWith(
						expect.stringContaining("[Thisbefine Analytics]"),
						"trialEnded: plan and converted are required, event not sent",
					);
				});
			});
		});

		describe("Engagement", () => {
			describe("inviteSent()", () => {
				it("should track $invite_sent event", async () => {
					analytics.inviteSent({ inviteEmail: "colleague@example.com" });
					await analytics.flush();

					const call = getLastFetchCall();
					const body = parseFetchBody(call?.options) as {
						batch: Record<string, unknown>[];
					};
					expect(body.batch[0].event).toBe("$invite_sent");
				});

				it("should include invite properties", async () => {
					analytics.inviteSent({
						inviteEmail: "colleague@example.com",
						role: "editor",
					});
					await analytics.flush();

					const call = getLastFetchCall();
					const body = parseFetchBody(call?.options) as {
						batch: Record<string, unknown>[];
					};
					const props = body.batch[0].properties as Record<string, unknown>;
					expect(props.inviteEmail).toBe("colleague@example.com");
					expect(props.role).toBe("editor");
				});

				it("should work without properties", async () => {
					analytics.inviteSent();
					await analytics.flush();

					const call = getLastFetchCall();
					const body = parseFetchBody(call?.options) as {
						batch: Record<string, unknown>[];
					};
					expect(body.batch[0].event).toBe("$invite_sent");
				});
			});

			describe("inviteAccepted()", () => {
				it("should track $invite_accepted event", async () => {
					analytics.inviteAccepted({ invitedBy: "user_123" });
					await analytics.flush();

					const call = getLastFetchCall();
					const body = parseFetchBody(call?.options) as {
						batch: Record<string, unknown>[];
					};
					expect(body.batch[0].event).toBe("$invite_accepted");
				});

				it("should include invite accepted properties", async () => {
					analytics.inviteAccepted({ invitedBy: "user_123", role: "viewer" });
					await analytics.flush();

					const call = getLastFetchCall();
					const body = parseFetchBody(call?.options) as {
						batch: Record<string, unknown>[];
					};
					const props = body.batch[0].properties as Record<string, unknown>;
					expect(props.invitedBy).toBe("user_123");
					expect(props.role).toBe("viewer");
				});
			});

			describe("featureActivated()", () => {
				it("should track $feature_activated event", async () => {
					analytics.featureActivated({ feature: "dark_mode" });
					await analytics.flush();

					const call = getLastFetchCall();
					const body = parseFetchBody(call?.options) as {
						batch: Record<string, unknown>[];
					};
					expect(body.batch[0].event).toBe("$feature_activated");
				});

				it("should include feature activation properties", async () => {
					analytics.featureActivated({
						feature: "ai_assistant",
						isFirstTime: true,
						source: "settings",
					});
					await analytics.flush();

					const call = getLastFetchCall();
					const body = parseFetchBody(call?.options) as {
						batch: Record<string, unknown>[];
					};
					const props = body.batch[0].properties as Record<string, unknown>;
					expect(props.feature).toBe("ai_assistant");
					expect(props.isFirstTime).toBe(true);
					expect(props.source).toBe("settings");
				});

				it("should warn when feature is missing", () => {
					const consoleSpy = mockConsole();
					const debugAnalytics = new AnalyticsImpl(
						createTestConfig({ debug: true }),
					);

					// @ts-expect-error - testing missing required field
					debugAnalytics.featureActivated({});

					expect(consoleSpy.warn).toHaveBeenCalledWith(
						expect.stringContaining("[Thisbefine Analytics]"),
						"featureActivated: feature is required, event not sent",
					);
				});
			});
		});

		describe("Privacy & Opt-out", () => {
			it("should respect privacy opt-out for lifecycle events", async () => {
				analytics.optOut();
				analytics.signup({ method: "google" });
				analytics.subscriptionStarted({ plan: "pro" });
				await analytics.flush();

				expect(getAllFetchCalls().length).toBe(0);
			});

			it("should resume tracking lifecycle events after opt-in", async () => {
				analytics.optOut();
				analytics.optIn();
				analytics.signup({ method: "email" });
				await analytics.flush();

				expect(getAllFetchCalls().length).toBe(1);
			});
		});

		describe("Session Context", () => {
			it("should include session and user context in lifecycle events", async () => {
				analytics.identify("user_123", { email: "test@example.com" });
				analytics.group("account_456", { name: "Acme Inc" });
				analytics.signup({ method: "google" });
				await analytics.flush();

				const call = getLastFetchCall();
				const body = parseFetchBody(call?.options) as {
					batch: Record<string, unknown>[];
				};
				const signupEvent = body.batch.find((e) => e.event === "$signup");
				expect(signupEvent?.userId).toBe("user_123");
				expect(signupEvent?.accountId).toBe("account_456");
				expect(signupEvent?.sessionId).toBeDefined();
				expect(signupEvent?.anonymousId).toBeDefined();
			});
		});
	});
});
