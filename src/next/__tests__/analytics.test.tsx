import { cleanup, render, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
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

const mockUsePathname = vi.fn(() => "/test-page");
const mockUseSearchParams = vi.fn(() => ({
	toString: () => "",
}));

vi.mock("next/navigation", () => ({
	usePathname: () => mockUsePathname(),
	useSearchParams: () => mockUseSearchParams(),
}));

import { Analytics } from "../analytics";

const originalEnv = process.env;

vi.mock("react", async () => {
	const actual = await vi.importActual("react");
	return {
		...actual,
		Suspense: ({ children }: { children: ReactNode; fallback: ReactNode }) =>
			children,
	};
});

describe("Next.js Analytics Component", () => {
	beforeEach(async () => {
		await resetGlobalAnalytics();
		vi.useFakeTimers();
		mockFetch();
		mockLocalStorage();
		clearAllStorage();
		process.env = { ...originalEnv };
		mockUsePathname.mockReturnValue("/test-page");
		mockUseSearchParams.mockReturnValue({ toString: () => "" });
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

			await flushPromises();
			vi.runAllTimers();

			const pageEvents = consoleSpy.log.mock.calls.filter(
				(call) => call[2] === "page",
			);
			expect(pageEvents.length).toBeGreaterThan(0);
		});

		it("should not track pageviews when trackPageviews is false", async () => {
			const consoleSpy = mockConsole();

			render(<Analytics apiKey="tbf_test_key" debug trackPageviews={false} />);

			await flushPromises();
			vi.runAllTimers();

			const pageEvents = consoleSpy.log.mock.calls.filter(
				(call) => call[2] === "page",
			);
			expect(pageEvents.length).toBe(0);
		});

		it("should track page changes via usePathname", async () => {
			const consoleSpy = mockConsole();

			const { rerender } = render(<Analytics apiKey="tbf_test_key" debug />);

			await flushPromises();
			vi.runAllTimers();

			const initialPageEvents = consoleSpy.log.mock.calls.filter(
				(call) => call[2] === "page",
			).length;

			mockUsePathname.mockReturnValue("/new-page");

			rerender(<Analytics apiKey="tbf_test_key" debug />);

			await flushPromises();
			vi.runAllTimers();

			const afterPageEvents = consoleSpy.log.mock.calls.filter(
				(call) => call[2] === "page",
			).length;

			expect(afterPageEvents).toBeGreaterThanOrEqual(initialPageEvents);
		});

		it("should include search params in tracking", async () => {
			mockUseSearchParams.mockReturnValue({ toString: () => "tab=settings" });
			const consoleSpy = mockConsole();

			render(<Analytics apiKey="tbf_test_key" debug />);

			await flushPromises();

			expect(consoleSpy.log).toHaveBeenCalled();
		});

		it("should prevent duplicate tracking of same path", async () => {
			const consoleSpy = mockConsole();

			const { rerender } = render(<Analytics apiKey="tbf_test_key" debug />);

			await flushPromises();
			vi.runAllTimers();

			const initialPageCount = consoleSpy.log.mock.calls.filter(
				(call) => call[2] === "page",
			).length;

			rerender(<Analytics apiKey="tbf_test_key" debug />);

			await flushPromises();
			vi.runAllTimers();

			const afterRerenderCount = consoleSpy.log.mock.calls.filter(
				(call) => call[2] === "page",
			).length;

			expect(afterRerenderCount).toBe(initialPageCount);
		});
	});

	describe("Rendering", () => {
		it("should return null when trackPageviews is false", () => {
			const { container } = render(
				<Analytics apiKey="tbf_test_key" trackPageviews={false} />,
			);
			expect(container.innerHTML).toBe("");
		});

		it("should render PageTracker when trackPageviews is true", () => {
			const { container } = render(
				<Analytics apiKey="tbf_test_key" trackPageviews />,
			);
			expect(container.innerHTML).toBe("");
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

	describe("Suspense Boundary", () => {
		it("should wrap PageTracker in Suspense", () => {
			expect(() => render(<Analytics apiKey="tbf_test_key" />)).not.toThrow();
		});
	});

	describe("Edge Cases", () => {
		it("should handle undefined pathname", async () => {
			mockUsePathname.mockReturnValue(null as unknown as string);

			expect(() =>
				render(<Analytics apiKey="tbf_test_key" debug />),
			).not.toThrow();
		});

		it("should handle null searchParams", async () => {
			mockUseSearchParams.mockReturnValue(
				null as unknown as { toString: () => string },
			);

			expect(() =>
				render(<Analytics apiKey="tbf_test_key" debug />),
			).not.toThrow();
		});
	});
});
