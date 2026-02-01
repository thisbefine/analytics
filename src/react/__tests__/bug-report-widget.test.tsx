import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { initAnalytics } from "../../core/analytics";
import {
	clearAllStorage,
	mockFetch,
	mockLocalStorage,
	resetFetchMock,
	resetGlobalAnalytics,
} from "../../test-utils";
import { BugReportFAB } from "../bug-report-widget";

describe("BugReportFAB Component", () => {
	beforeEach(async () => {
		vi.useFakeTimers();
		mockFetch();
		mockLocalStorage();
		clearAllStorage();
		await resetGlobalAnalytics();

		initAnalytics({ apiKey: "tbf_test_key" });
	});

	afterEach(async () => {
		vi.useRealTimers();
		resetFetchMock();
		clearAllStorage();
		cleanup();
		await resetGlobalAnalytics();

		const widget = document.getElementById("thisbefine-bug-report");
		widget?.remove();
	});

	describe("Mounting", () => {
		it("should mount the widget on render", () => {
			render(<BugReportFAB />);

			const widget = document.getElementById("thisbefine-bug-report");
			expect(widget).not.toBeNull();
		});

		it("should create FAB button in the DOM", () => {
			render(<BugReportFAB />);

			const widget = document.getElementById("thisbefine-bug-report");
			const fab = widget?.shadowRoot?.querySelector(".tif-fab");
			expect(fab).not.toBeNull();
		});
	});

	describe("Unmounting", () => {
		it("should remove widget on component unmount", () => {
			const { unmount } = render(<BugReportFAB />);

			expect(document.getElementById("thisbefine-bug-report")).not.toBeNull();

			unmount();

			expect(document.getElementById("thisbefine-bug-report")).toBeNull();
		});
	});

	describe("Props", () => {
		it("should pass position prop to widget", () => {
			render(<BugReportFAB position="bottom-left" />);

			const widget = document.getElementById("thisbefine-bug-report");
			const fab = widget?.shadowRoot?.querySelector(".tif-fab");
			expect(fab?.classList.contains("bottom-left")).toBe(true);
		});

		it("should pass buttonColor prop to widget", () => {
			render(<BugReportFAB buttonColor="#00ff00" />);

			const widget = document.getElementById("thisbefine-bug-report");
			const fab = widget?.shadowRoot?.querySelector(".tif-fab") as HTMLElement;
			expect(fab?.style.backgroundColor).toBe("rgb(0, 255, 0)");
		});

		it("should pass buttonText prop to widget", () => {
			render(<BugReportFAB buttonText="Send Feedback" />);

			const widget = document.getElementById("thisbefine-bug-report");
			const fab = widget?.shadowRoot?.querySelector(".tif-fab");
			expect(fab?.getAttribute("aria-label")).toBe("Send Feedback");
		});
	});

	describe("Re-mounting on Prop Changes", () => {
		it("should re-mount widget when position changes", () => {
			const { rerender } = render(<BugReportFAB position="bottom-right" />);

			let widget = document.getElementById("thisbefine-bug-report");
			let fab = widget?.shadowRoot?.querySelector(".tif-fab");
			expect(fab?.classList.contains("bottom-right")).toBe(true);

			rerender(<BugReportFAB position="bottom-left" />);

			widget = document.getElementById("thisbefine-bug-report");
			fab = widget?.shadowRoot?.querySelector(".tif-fab");
			expect(fab?.classList.contains("bottom-left")).toBe(true);
		});

		it("should re-mount widget when buttonColor changes", () => {
			const { rerender } = render(<BugReportFAB buttonColor="#ff0000" />);

			let widget = document.getElementById("thisbefine-bug-report");
			let fab = widget?.shadowRoot?.querySelector(".tif-fab") as HTMLElement;
			expect(fab?.style.backgroundColor).toBe("rgb(255, 0, 0)");

			rerender(<BugReportFAB buttonColor="#0000ff" />);

			widget = document.getElementById("thisbefine-bug-report");
			fab = widget?.shadowRoot?.querySelector(".tif-fab") as HTMLElement;
			expect(fab?.style.backgroundColor).toBe("rgb(0, 0, 255)");
		});
	});

	describe("Rendering", () => {
		it("should return null (no React DOM output)", () => {
			const { container } = render(<BugReportFAB />);
			expect(container.innerHTML).toBe("");
		});

		it("should not affect parent DOM structure", () => {
			const { container } = render(
				<div id="app">
					<BugReportFAB />
					<main>Content</main>
				</div>,
			);

			expect(container.querySelector("#app")).not.toBeNull();
			expect(container.querySelector("main")?.textContent).toBe("Content");
		});
	});

	describe("Analytics Integration", () => {
		it("should work when analytics is initialized", () => {
			expect(() => render(<BugReportFAB />)).not.toThrow();

			const widget = document.getElementById("thisbefine-bug-report");
			expect(widget).not.toBeNull();
		});
	});

	describe("Default Props", () => {
		it("should use default position when not specified", () => {
			render(<BugReportFAB />);

			const widget = document.getElementById("thisbefine-bug-report");
			const fab = widget?.shadowRoot?.querySelector(".tif-fab");
			expect(fab?.classList.contains("bottom-right")).toBe(true);
		});

		it("should use default button color when not specified", () => {
			render(<BugReportFAB />);

			const widget = document.getElementById("thisbefine-bug-report");
			const fab = widget?.shadowRoot?.querySelector(".tif-fab") as HTMLElement;
			expect(fab?.style.backgroundColor).toBe("rgb(239, 68, 68)");
		});

		it("should use default button text when not specified", () => {
			render(<BugReportFAB />);

			const widget = document.getElementById("thisbefine-bug-report");
			const fab = widget?.shadowRoot?.querySelector(".tif-fab");
			expect(fab?.getAttribute("aria-label")).toBe("Report Bug");
		});
	});
});
