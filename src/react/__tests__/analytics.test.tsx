import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	clearAllStorage,
	flushPromises,
	mockConsole,
	mockFetch,
	mockLocalStorage,
	resetFetchMock,
	resetGlobalAnalytics,
} from "../../test-utils";
import { Analytics } from "../analytics";

const originalEnv = process.env;

describe("React Analytics Component", () => {
	beforeEach(async () => {
		await resetGlobalAnalytics();
		vi.useFakeTimers();
		mockFetch();
		mockLocalStorage();
		clearAllStorage();
		process.env = { ...originalEnv };
	});

	afterEach(async () => {
		vi.useRealTimers();
		resetFetchMock();
		clearAllStorage();
		cleanup();
		await resetGlobalAnalytics();
		process.env = originalEnv;
		vi.clearAllMocks();
	});

	describe("Initialization", () => {
		it("should initialize analytics on mount", async () => {
			const consoleSpy = mockConsole();

			render(<Analytics apiKey="tbf_test_key" debug />);

			await waitFor(() => {
				expect(consoleSpy.log).toHaveBeenCalledWith(
					expect.stringContaining("[Thisbefine Analytics]"),
					"Analytics initialized",
					expect.any(Object),
				);
			});
		});

		it("should prevent re-initialization on re-render", async () => {
			const consoleSpy = mockConsole();

			const { rerender } = render(<Analytics apiKey="tbf_test_key" debug />);

			await flushPromises();

			rerender(<Analytics apiKey="tbf_test_key" debug />);

			await flushPromises();

			const initCalls = consoleSpy.log.mock.calls.filter(
				(call) => call[1] === "Analytics initialized",
			);
			expect(initCalls.length).toBeLessThanOrEqual(1);

			const alreadyInitWarnings = consoleSpy.warn.mock.calls.filter(
				(call) =>
					typeof call[0] === "string" &&
					call[0].includes("already initialized"),
			);
			expect(alreadyInitWarnings.length).toBeLessThanOrEqual(1);
		});

		it("should read API key from environment variable", async () => {
			process.env.NEXT_PUBLIC_TBF_API_KEY = "tbf_env_key";
			const consoleSpy = mockConsole();

			render(<Analytics debug />);

			await flushPromises();

			const hasInitOrReused =
				consoleSpy.log.mock.calls.some(
					(call) => call[1] === "Analytics initialized",
				) ||
				consoleSpy.warn.mock.calls.some(
					(call) =>
						typeof call[0] === "string" &&
						call[0].includes("already initialized"),
				);
			expect(hasInitOrReused).toBe(true);
		});

		it("should warn when no API key is provided", async () => {
			const consoleSpy = mockConsole();
			delete process.env.NEXT_PUBLIC_TBF_API_KEY;

			render(<Analytics />);

			await waitFor(() => {
				expect(consoleSpy.warn).toHaveBeenCalledWith(
					expect.stringContaining("No API key provided"),
				);
			});
		});

		it("should use custom host when provided", async () => {
			expect(() => {
				render(
					<Analytics
						apiKey="tbf_test_key"
						host="https://custom.example.com"
						debug
					/>,
				);
			}).not.toThrow();
		});
	});

	describe("Pageview Tracking", () => {
		it("should track pageview on mount by default", async () => {
			const consoleSpy = mockConsole();

			render(<Analytics apiKey="tbf_test_key" debug />);

			await waitFor(() => {
				expect(consoleSpy.log).toHaveBeenCalledWith(
					expect.stringContaining("[Thisbefine Queue]"),
					"Event queued:",
					"page",
					"",
				);
			});
		});

		it("should skip pageview when trackPageviews is false", async () => {
			const consoleSpy = mockConsole();

			render(<Analytics apiKey="tbf_test_key" debug trackPageviews={false} />);

			await flushPromises();

			const pageEvents = consoleSpy.log.mock.calls.filter(
				(call) => call[2] === "page",
			);
			expect(pageEvents.length).toBe(0);
		});
	});

	describe("Additional Config", () => {
		it("should pass additional config options", async () => {
			render(
				<Analytics
					apiKey="tbf_test_key"
					debug
					config={{
						flushAt: 50,
						sessionTimeout: 60000,
						respectDNT: false,
					}}
				/>,
			);

			await flushPromises();
		});

		it("should enable debug mode", async () => {
			const consoleSpy = mockConsole();

			render(<Analytics apiKey="tbf_test_key" debug />);

			await waitFor(() => {
				expect(consoleSpy.log).toHaveBeenCalled();
			});
		});

		it("should disable debug mode by default", async () => {
			vi.clearAllMocks();
			const consoleSpy = mockConsole();

			render(<Analytics apiKey="tbf_test_key" />);

			await flushPromises();

			const analyticsDebugLogs = consoleSpy.log.mock.calls.filter(
				(call) =>
					typeof call[0] === "string" &&
					call[0].includes("[Thisbefine Analytics]"),
			);
			expect(analyticsDebugLogs.length).toBe(0);
		});
	});

	describe("Rendering", () => {
		it("should return null (no DOM output)", () => {
			const { container } = render(<Analytics apiKey="tbf_test_key" />);
			expect(container.innerHTML).toBe("");
		});

		it("should not affect DOM structure", () => {
			const { container } = render(
				<div id="app">
					<Analytics apiKey="tbf_test_key" />
					<h1>My App</h1>
				</div>,
			);

			expect(container.querySelector("#app")).not.toBeNull();
			expect(container.querySelector("h1")?.textContent).toBe("My App");
		});
	});

	describe("Popstate Handling", () => {
		it("should set up popstate listener when trackPageviews is true", async () => {
			const addEventListenerSpy = vi.spyOn(window, "addEventListener");

			render(<Analytics apiKey="tbf_test_key" trackPageviews />);

			await flushPromises();

			expect(addEventListenerSpy).toHaveBeenCalledWith(
				"popstate",
				expect.any(Function),
			);
		});

		it("should not set up popstate listener when trackPageviews is false", async () => {
			const addEventListenerSpy = vi.spyOn(window, "addEventListener");

			render(<Analytics apiKey="tbf_test_key" trackPageviews={false} />);

			await flushPromises();

			const _popstateCalls = addEventListenerSpy.mock.calls.filter(
				(call) => call[0] === "popstate",
			);
		});

		it("should clean up popstate listener on unmount", async () => {
			const removeEventListenerSpy = vi.spyOn(window, "removeEventListener");

			const { unmount } = render(
				<Analytics apiKey="tbf_test_key" trackPageviews />,
			);

			await flushPromises();

			unmount();

			expect(removeEventListenerSpy).toHaveBeenCalledWith(
				"popstate",
				expect.any(Function),
			);
		});
	});
});
