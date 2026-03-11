import { render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { initAnalytics, getAnalytics } from "../../core/analytics";
import { AnalyticsProvider, useAnalyticsContext, useAnalyticsReady, useIsClient } from "../context";
import { useAnalytics } from "../hooks";

const TestUseAnalytics = () => {
	useAnalytics();
	return null;
};

const TestContextConsumer = () => {
	const { analytics, isReady, isClient } = useAnalyticsContext();
	return (
		<div data-analytics={analytics ? "yes" : "no"} data-ready={String(isReady)} data-client={String(isClient)} />
	);
};

const TestReady = () => {
	const ready = useAnalyticsReady();
	const isClient = useIsClient();
	return <div data-ready={String(ready)} data-client={String(isClient)} />;
};

describe("Analytics Context", () => {
	afterEach(async () => {
		const instance = getAnalytics();
		if (instance) {
			await instance.destroy();
		}
	});

it("should throw when useAnalytics is called without provider", () => {
	expect(() => render(<TestUseAnalytics />)).toThrow(
		"Analytics not initialized",
	);
});

it("should return default context when no provider or global instance", () => {
	const { container } = render(<TestContextConsumer />);
	const div = container.querySelector("div");
	expect(div?.getAttribute("data-analytics")).toBe("no");
	expect(div?.getAttribute("data-ready")).toBe("false");
	expect(div?.getAttribute("data-client")).toBe("false");
});

	it("should fall back to global analytics instance", () => {
		initAnalytics({ apiKey: "tbf_test_key" });
		const { container } = render(<TestContextConsumer />);
		const div = container.querySelector("div");
		expect(div?.getAttribute("data-analytics")).toBe("yes");
		expect(div?.getAttribute("data-ready")).toBe("true");
		expect(div?.getAttribute("data-client")).toBe("true");
	});

	it("should provide context when AnalyticsProvider is used", async () => {
		const { container } = render(
			<AnalyticsProvider apiKey="tbf_test_key">
				<TestContextConsumer />
			</AnalyticsProvider>,
		);

		await waitFor(() => {
			const div = container.querySelector("div");
			expect(div?.getAttribute("data-ready")).toBe("true");
		});
	});

	it("useAnalyticsReady and useIsClient should update on client", async () => {
		const { container } = render(
			<AnalyticsProvider apiKey="tbf_test_key">
				<TestReady />
			</AnalyticsProvider>,
		);

		await waitFor(() => {
			const div = container.querySelector("div");
			expect(div?.getAttribute("data-client")).toBe("true");
			expect(div?.getAttribute("data-ready")).toBe("true");
		});
	});
});
