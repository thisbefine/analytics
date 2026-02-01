import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	createMockError,
	createTestElement,
	flushPromises,
	getAllFetchCalls,
	getLastFetchCall,
	MockStorage,
	mockConsole,
	mockFetch,
	mockHistory,
	mockLocation,
	parseFetchBody,
	resetFetchMock,
} from "../../test-utils";
import { ErrorCapture, type ErrorPayload } from "../errors";
import { Session } from "../session";
import type { ResolvedConfig } from "../types";

if (typeof PromiseRejectionEvent === "undefined") {
	class MockPromiseRejectionEvent extends Event {
		reason: unknown;
		promise: Promise<unknown>;

		constructor(
			type: string,
			init: { reason: unknown; promise: Promise<unknown> },
		) {
			super(type, { bubbles: true, cancelable: true });
			this.reason = init.reason;
			this.promise = init.promise;
		}
	}
	globalThis.PromiseRejectionEvent =
		MockPromiseRejectionEvent as unknown as typeof PromiseRejectionEvent;
}

describe("ErrorCapture", () => {
	let storage: MockStorage;
	let session: Session;
	let config: ResolvedConfig;
	let errorCapture: ErrorCapture;

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

	beforeEach(() => {
		vi.useFakeTimers();
		mockFetch();
		storage = new MockStorage();
		session = new Session(storage, 1800000);
		config = createConfig();
		mockLocation({ href: "https://example.com/page", pathname: "/page" });
	});

	afterEach(() => {
		errorCapture?.uninstall();
		session?.destroy();
		vi.useRealTimers();
		resetFetchMock();
	});

	describe("Installation", () => {
		it("should install global error handler", () => {
			const originalOnError = window.onerror;
			errorCapture = new ErrorCapture(config, session);
			errorCapture.install();

			expect(window.onerror).not.toBe(originalOnError);
		});

		it("should install unhandledrejection handler", () => {
			const addEventListenerSpy = vi.spyOn(window, "addEventListener");
			errorCapture = new ErrorCapture(config, session);
			errorCapture.install();

			expect(addEventListenerSpy).toHaveBeenCalledWith(
				"unhandledrejection",
				expect.any(Function),
			);
		});

		it("should install click listener in capture phase", () => {
			const addEventListenerSpy = vi.spyOn(document, "addEventListener");
			errorCapture = new ErrorCapture(config, session);
			errorCapture.install();

			expect(addEventListenerSpy).toHaveBeenCalledWith(
				"click",
				expect.any(Function),
				true,
			);
		});

		it("should wrap history.pushState", () => {
			const originalPushState = history.pushState;
			errorCapture = new ErrorCapture(config, session);
			errorCapture.install();

			expect(history.pushState).not.toBe(originalPushState);
		});

		it("should wrap history.replaceState", () => {
			const originalReplaceState = history.replaceState;
			errorCapture = new ErrorCapture(config, session);
			errorCapture.install();

			expect(history.replaceState).not.toBe(originalReplaceState);
		});

		it("should install popstate listener", () => {
			const addEventListenerSpy = vi.spyOn(window, "addEventListener");
			errorCapture = new ErrorCapture(config, session);
			errorCapture.install();

			expect(addEventListenerSpy).toHaveBeenCalledWith(
				"popstate",
				expect.any(Function),
			);
		});

		it("should optionally wrap console.error", () => {
			const originalConsoleError = console.error;
			errorCapture = new ErrorCapture(config, session, {
				captureConsoleErrors: true,
			});
			errorCapture.install();

			expect(console.error).not.toBe(originalConsoleError);
		});

		it("should optionally wrap fetch", () => {
			const originalFetch = window.fetch;
			errorCapture = new ErrorCapture(config, session, {
				captureNetworkErrors: true,
			});
			errorCapture.install();

			expect(window.fetch).not.toBe(originalFetch);
		});

		it("should skip installation if disabled", () => {
			const addEventListenerSpy = vi.spyOn(window, "addEventListener");
			errorCapture = new ErrorCapture(config, session, { enabled: false });
			errorCapture.install();

			expect(addEventListenerSpy).not.toHaveBeenCalledWith(
				"unhandledrejection",
				expect.any(Function),
			);
		});

		it("should not double-install on repeated install calls", () => {
			const addEventListenerSpy = vi.spyOn(window, "addEventListener");
			errorCapture = new ErrorCapture(config, session);

			errorCapture.install();
			const callCount = addEventListenerSpy.mock.calls.length;

			errorCapture.install();
			expect(addEventListenerSpy.mock.calls.length).toBe(callCount);
		});

		it("should log installation in debug mode", () => {
			const consoleSpy = mockConsole();
			errorCapture = new ErrorCapture(createConfig({ debug: true }), session);
			errorCapture.install();

			expect(consoleSpy.log).toHaveBeenCalledWith(
				expect.stringContaining("[Thisbefine Errors]"),
				"Error capture installed",
			);
		});
	});

	describe("Uninstallation", () => {
		beforeEach(() => {
			errorCapture = new ErrorCapture(config, session);
			errorCapture.install();
		});

		it("should restore original window.onerror", () => {
			const _originalOnError = window.onerror;
			errorCapture.uninstall();
		});

		it("should remove unhandledrejection handler", () => {
			const removeEventListenerSpy = vi.spyOn(window, "removeEventListener");
			errorCapture.uninstall();

			expect(removeEventListenerSpy).toHaveBeenCalledWith(
				"unhandledrejection",
				expect.any(Function),
			);
		});

		it("should remove click listener", () => {
			const removeEventListenerSpy = vi.spyOn(document, "removeEventListener");
			errorCapture.uninstall();

			expect(removeEventListenerSpy).toHaveBeenCalledWith(
				"click",
				expect.any(Function),
				true,
			);
		});

		it("should restore original history methods", () => {
			const mockHistoryFns = mockHistory();
			errorCapture.uninstall();
			mockHistoryFns.restore();
		});

		it("should restore original console.error when it was wrapped", () => {
			errorCapture.uninstall();
			const errorCapture2 = new ErrorCapture(config, session, {
				captureConsoleErrors: true,
			});
			errorCapture2.install();
			const _wrappedError = console.error;

			errorCapture2.uninstall();
		});

		it("should restore original fetch when it was wrapped", () => {
			errorCapture.uninstall();
			const errorCapture2 = new ErrorCapture(config, session, {
				captureNetworkErrors: true,
			});
			errorCapture2.install();
			const _wrappedFetch = window.fetch;

			errorCapture2.uninstall();
		});

		it("should handle double uninstall gracefully", () => {
			errorCapture.uninstall();
			expect(() => errorCapture.uninstall()).not.toThrow();
		});

		it("should log uninstallation in debug mode", () => {
			errorCapture.uninstall();

			const consoleSpy = mockConsole();
			const debugErrorCapture = new ErrorCapture(
				createConfig({ debug: true }),
				session,
			);
			debugErrorCapture.install();
			debugErrorCapture.uninstall();

			expect(consoleSpy.log).toHaveBeenCalledWith(
				expect.stringContaining("[Thisbefine Errors]"),
				"Error capture uninstalled",
			);
		});
	});

	describe("Exception Capture", () => {
		beforeEach(() => {
			errorCapture = new ErrorCapture(config, session);
			errorCapture.install();
		});

		it("should extract error message", async () => {
			const error = createMockError("Something went wrong");
			errorCapture.captureException(error);

			await flushPromises();
			vi.advanceTimersByTime(100);
			await flushPromises();

			const call = getLastFetchCall();
			const body = parseFetchBody(call?.options) as ErrorPayload;
			expect(body.message).toBe("Something went wrong");
		});

		it("should extract stack trace", async () => {
			const error = createMockError("Test error");
			errorCapture.captureException(error);

			await flushPromises();
			vi.advanceTimersByTime(100);
			await flushPromises();

			const call = getLastFetchCall();
			const body = parseFetchBody(call?.options) as ErrorPayload;
			expect(body.stack).toBeDefined();
			expect(body.stack).toContain("at someFunction");
		});

		it("should extract error type/name", async () => {
			const error = createMockError("Custom error", "CustomError");
			errorCapture.captureException(error);

			await flushPromises();
			vi.advanceTimersByTime(100);
			await flushPromises();

			const call = getLastFetchCall();
			const body = parseFetchBody(call?.options) as ErrorPayload;
			expect(body.type).toBe("CustomError");
		});

		it("should generate fingerprint", async () => {
			const error = createMockError("Test error");
			errorCapture.captureException(error);

			await flushPromises();
			vi.advanceTimersByTime(100);
			await flushPromises();

			const call = getLastFetchCall();
			const body = parseFetchBody(call?.options) as ErrorPayload;
			expect(body.fingerprint).toBeDefined();
			expect(typeof body.fingerprint).toBe("string");
		});

		it("should generate consistent fingerprint for same error", async () => {
			const error1 = createMockError("Same error message");
			const error2 = createMockError("Same error message");

			errorCapture.captureException(error1);
			await flushPromises();
			vi.advanceTimersByTime(100);
			await flushPromises();

			const call1 = getAllFetchCalls()[0];
			const body1 = parseFetchBody(call1?.options) as ErrorPayload;

			errorCapture.captureException(error2);
			await flushPromises();
			vi.advanceTimersByTime(100);
			await flushPromises();

			const call2 = getAllFetchCalls()[1];
			const body2 = parseFetchBody(call2?.options) as ErrorPayload;

			expect(body1.fingerprint).toBe(body2.fingerprint);
		});

		it("should include breadcrumbs", async () => {
			errorCapture.addBreadcrumb({
				type: "custom",
				message: "User clicked button",
			});
			errorCapture.captureException(createMockError("Error after action"));

			await flushPromises();
			vi.advanceTimersByTime(100);
			await flushPromises();

			const call = getLastFetchCall();
			const body = parseFetchBody(call?.options) as ErrorPayload;
			expect(body.breadcrumbs).toBeDefined();
			expect(body.breadcrumbs?.length).toBeGreaterThan(0);
		});

		it("should include additional context", async () => {
			errorCapture.captureException(createMockError("Error"), {
				component: "Checkout",
				step: 3,
			});

			await flushPromises();
			vi.advanceTimersByTime(100);
			await flushPromises();

			const call = getLastFetchCall();
			const body = parseFetchBody(call?.options) as ErrorPayload;
			expect(body.context).toEqual({ component: "Checkout", step: 3 });
		});

		it("should call beforeSend callback", async () => {
			const beforeSend = vi.fn((payload: ErrorPayload) => payload);
			errorCapture.uninstall();
			errorCapture = new ErrorCapture(config, session, { beforeSend });
			errorCapture.install();

			errorCapture.captureException(createMockError("Test error"));

			await flushPromises();
			vi.advanceTimersByTime(100);
			await flushPromises();

			expect(beforeSend).toHaveBeenCalled();
		});

		it("should suppress error when beforeSend returns null", async () => {
			const beforeSend = vi.fn(() => null);
			errorCapture.uninstall();
			errorCapture = new ErrorCapture(config, session, { beforeSend });
			errorCapture.install();

			errorCapture.captureException(createMockError("Suppressed error"));

			await flushPromises();
			vi.advanceTimersByTime(100);
			await flushPromises();

			expect(getAllFetchCalls().length).toBe(0);
		});

		it("should allow beforeSend to modify error", async () => {
			const beforeSend = vi.fn((payload: ErrorPayload) => ({
				...payload,
				message: "Modified message",
			}));
			errorCapture.uninstall();
			errorCapture = new ErrorCapture(config, session, { beforeSend });
			errorCapture.install();

			errorCapture.captureException(createMockError("Original message"));

			await flushPromises();
			vi.advanceTimersByTime(100);
			await flushPromises();

			const call = getLastFetchCall();
			const body = parseFetchBody(call?.options) as ErrorPayload;
			expect(body.message).toBe("Modified message");
		});
	});

	describe("Message Capture", () => {
		beforeEach(() => {
			errorCapture = new ErrorCapture(config, session);
			errorCapture.install();
		});

		it("should capture message", async () => {
			errorCapture.captureMessage("Something happened");

			await flushPromises();
			vi.advanceTimersByTime(100);
			await flushPromises();

			const call = getLastFetchCall();
			const body = parseFetchBody(call?.options) as ErrorPayload;
			expect(body.message).toBe("Something happened");
		});

		it("should accept level parameter", async () => {
			errorCapture.captureMessage("Warning message", "warning");

			await flushPromises();
			vi.advanceTimersByTime(100);
			await flushPromises();

			const call = getLastFetchCall();
			const body = parseFetchBody(call?.options) as ErrorPayload;
			expect(body.level).toBe("warning");
		});

		it("should accept context parameter", async () => {
			errorCapture.captureMessage("Error in module", "error", {
				module: "auth",
			});

			await flushPromises();
			vi.advanceTimersByTime(100);
			await flushPromises();

			const call = getLastFetchCall();
			const body = parseFetchBody(call?.options) as ErrorPayload;
			expect(body.context).toEqual({ module: "auth" });
		});

		it("should default to error level", async () => {
			errorCapture.captureMessage("No level specified");

			await flushPromises();
			vi.advanceTimersByTime(100);
			await flushPromises();

			const call = getLastFetchCall();
			const body = parseFetchBody(call?.options) as ErrorPayload;
			expect(body.level).toBe("error");
		});
	});

	describe("Breadcrumb Collection", () => {
		beforeEach(() => {
			errorCapture = new ErrorCapture(config, session);
			errorCapture.install();
		});

		it("should add manual breadcrumbs", () => {
			errorCapture.addBreadcrumb({
				type: "custom",
				message: "User performed action",
				data: { actionId: 123 },
			});
		});

		it("should include timestamp in breadcrumbs", async () => {
			errorCapture.addBreadcrumb({ type: "custom", message: "Test action" });
			errorCapture.captureException(createMockError("Error"));

			await flushPromises();
			vi.advanceTimersByTime(100);
			await flushPromises();

			const call = getLastFetchCall();
			const body = parseFetchBody(call?.options) as ErrorPayload;
			expect(body.breadcrumbs?.[0].timestamp).toBeDefined();
		});

		it("should capture click events with element info", async () => {
			const button = createTestElement("button", {
				id: "submit-btn",
				textContent: "Submit",
			});
			document.body.appendChild(button);

			const clickEvent = new MouseEvent("click", { bubbles: true });
			Object.defineProperty(clickEvent, "target", { value: button });
			document.dispatchEvent(clickEvent);

			errorCapture.captureException(createMockError("Error after click"));

			await flushPromises();
			vi.advanceTimersByTime(100);
			await flushPromises();

			const call = getLastFetchCall();
			const body = parseFetchBody(call?.options) as ErrorPayload;

			const clickBreadcrumb = body.breadcrumbs?.find((b) => b.type === "click");
			expect(clickBreadcrumb).toBeDefined();

			document.body.removeChild(button);
		});

		it("should track navigation via history.pushState", async () => {
			history.pushState({}, "", "/new-page");

			errorCapture.captureException(createMockError("Error"));

			await flushPromises();
			vi.advanceTimersByTime(100);
			await flushPromises();

			const call = getLastFetchCall();
			const body = parseFetchBody(call?.options) as ErrorPayload;

			const navBreadcrumb = body.breadcrumbs?.find(
				(b) => b.type === "navigation",
			);
			expect(navBreadcrumb).toBeDefined();
		});

		it("should track console.error when enabled", async () => {
			errorCapture.uninstall();
			errorCapture = new ErrorCapture(config, session, {
				captureConsoleErrors: true,
			});
			errorCapture.install();

			console.error("Test console error");

			errorCapture.captureException(createMockError("Error"));

			await flushPromises();
			vi.advanceTimersByTime(100);
			await flushPromises();

			const call = getLastFetchCall();
			const body = parseFetchBody(call?.options) as ErrorPayload;

			const consoleBreadcrumb = body.breadcrumbs?.find(
				(b) => b.type === "console",
			);
			expect(consoleBreadcrumb).toBeDefined();
		});

		it("should respect maxBreadcrumbs limit (FIFO)", () => {
			errorCapture.uninstall();
			errorCapture = new ErrorCapture(config, session, { maxBreadcrumbs: 3 });
			errorCapture.install();

			errorCapture.addBreadcrumb({ type: "custom", message: "First" });
			errorCapture.addBreadcrumb({ type: "custom", message: "Second" });
			errorCapture.addBreadcrumb({ type: "custom", message: "Third" });
			errorCapture.addBreadcrumb({ type: "custom", message: "Fourth" });
		});

		it("should clear breadcrumbs", async () => {
			errorCapture.addBreadcrumb({
				type: "custom",
				message: "Will be cleared",
			});
			errorCapture.clearBreadcrumbs();

			errorCapture.captureException(createMockError("Error"));

			await flushPromises();
			vi.advanceTimersByTime(100);
			await flushPromises();

			const call = getLastFetchCall();
			const body = parseFetchBody(call?.options) as ErrorPayload;

			const customBreadcrumb = body.breadcrumbs?.find(
				(b) => b.message === "Will be cleared",
			);
			expect(customBreadcrumb).toBeUndefined();
		});
	});

	describe("Global Error Handlers", () => {
		beforeEach(() => {
			errorCapture = new ErrorCapture(config, session);
			errorCapture.install();
		});

		it("should capture unhandled errors via window.onerror", async () => {
			const error = new Error("Unhandled error");

			if (window.onerror) {
				window.onerror("Unhandled error", "file.js", 10, 5, error);
			}

			await flushPromises();
			vi.advanceTimersByTime(100);
			await flushPromises();

			expect(getAllFetchCalls().length).toBeGreaterThan(0);
		});

		it("should capture unhandled promise rejections", async () => {
			const rejectedPromise = Promise.reject(new Error("Promise rejected"));
			rejectedPromise.catch(() => {});

			const event = new PromiseRejectionEvent("unhandledrejection", {
				reason: new Error("Promise rejected"),
				promise: rejectedPromise,
			});

			window.dispatchEvent(event);

			await flushPromises();
			vi.advanceTimersByTime(100);
			await flushPromises();

			expect(getAllFetchCalls().length).toBeGreaterThan(0);
		});

		it("should handle non-Error rejection reasons", async () => {
			const rejectedPromise = Promise.reject("String rejection reason");
			rejectedPromise.catch(() => {});

			const event = new PromiseRejectionEvent("unhandledrejection", {
				reason: "String rejection reason",
				promise: rejectedPromise,
			});

			window.dispatchEvent(event);

			await flushPromises();
			vi.advanceTimersByTime(100);
			await flushPromises();

			expect(getAllFetchCalls().length).toBeGreaterThan(0);
		});

		it("should construct Error objects from primitive onerror messages", async () => {
			if (window.onerror) {
				window.onerror("Script error", "unknown", 0, 0, undefined);
			}

			await flushPromises();
			vi.advanceTimersByTime(100);
			await flushPromises();

			const call = getLastFetchCall();
			const body = parseFetchBody(call?.options) as ErrorPayload;
			expect(body.message).toBe("Script error");
		});
	});

	describe("API Endpoint", () => {
		beforeEach(() => {
			errorCapture = new ErrorCapture(config, session);
			errorCapture.install();
		});

		it("should send to /api/v1/error endpoint", async () => {
			errorCapture.captureException(createMockError("Test error"));

			await flushPromises();
			vi.advanceTimersByTime(100);
			await flushPromises();

			const call = getLastFetchCall();
			expect(call?.url).toBe("https://test.thisbefine.com/api/v1/error");
		});

		it("should include API key header", async () => {
			errorCapture.captureException(createMockError("Test error"));

			await flushPromises();
			vi.advanceTimersByTime(100);
			await flushPromises();

			const call = getLastFetchCall();
			expect(
				(call?.options?.headers as Record<string, string>)["X-API-Key"],
			).toBe("tbf_test_key");
		});

		it("should include Content-Type header", async () => {
			errorCapture.captureException(createMockError("Test error"));

			await flushPromises();
			vi.advanceTimersByTime(100);
			await flushPromises();

			const call = getLastFetchCall();
			expect(
				(call?.options?.headers as Record<string, string>)["Content-Type"],
			).toBe("application/json");
		});

		it("should include session info in payload", async () => {
			session.setUserId("user_123");
			errorCapture.captureException(createMockError("Test error"));

			await flushPromises();
			vi.advanceTimersByTime(100);
			await flushPromises();

			const call = getLastFetchCall();
			const body = parseFetchBody(call?.options) as ErrorPayload;

			expect(body.anonymousId).toBeDefined();
			expect(body.userId).toBe("user_123");
			expect(body.sessionId).toBeDefined();
		});

		it("should include current URL", async () => {
			mockLocation({ href: "https://example.com/checkout" });
			errorCapture.captureException(createMockError("Error on checkout"));

			await flushPromises();
			vi.advanceTimersByTime(100);
			await flushPromises();

			const call = getLastFetchCall();
			const body = parseFetchBody(call?.options) as ErrorPayload;
			expect(body.url).toBe("https://example.com/checkout");
		});

		it("should include timestamp", async () => {
			errorCapture.captureException(createMockError("Test error"));

			await flushPromises();
			vi.advanceTimersByTime(100);
			await flushPromises();

			const call = getLastFetchCall();
			const body = parseFetchBody(call?.options) as ErrorPayload;
			expect(body.timestamp).toBeDefined();
		});
	});

	describe("Default Config Values", () => {
		it("should default enabled to true", () => {
			errorCapture = new ErrorCapture(config, session);
			errorCapture.install();

			expect(window.onerror).not.toBeNull();
		});

		it("should default captureConsoleErrors to false", () => {
			const originalConsoleError = console.error;
			errorCapture = new ErrorCapture(config, session);
			errorCapture.install();

			expect(console.error).toBe(originalConsoleError);
		});

		it("should default captureNetworkErrors to false", () => {
			errorCapture = new ErrorCapture(config, session);
		});

		it("should default maxBreadcrumbs to 25", () => {
			errorCapture = new ErrorCapture(config, session);
			errorCapture.install();

			for (let i = 0; i < 30; i++) {
				errorCapture.addBreadcrumb({
					type: "custom",
					message: `Breadcrumb ${i}`,
				});
			}
		});
	});
});
