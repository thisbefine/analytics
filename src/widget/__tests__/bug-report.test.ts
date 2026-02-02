import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Analytics } from "../../core/types";
import {
	getLastFetchCall,
	mockFetch,
	mockLocation,
	mockUserAgent,
	parseFetchBody,
	resetFetchMock,
} from "../../test-utils";
import { createBugReportWidget } from "../bug-report";

describe("Bug Report Widget", () => {
	let mockAnalytics: Analytics;
	let widgetInstance: { destroy: () => void } | null = null;

	function createMockAnalytics(overrides?: Partial<Analytics>): Analytics {
		return {
			track: vi.fn(),
			identify: vi.fn(),
			page: vi.fn(),
			group: vi.fn(),
			reset: vi.fn(),
			flush: vi.fn(() => Promise.resolve()),
			optOut: vi.fn(),
			optIn: vi.fn(),
			isOptedOut: vi.fn(() => false),
			getUser: vi.fn(() => ({
				anonymousId: "anon_test_123",
				userId: "user_test_456",
			})),
			captureException: vi.fn(),
			captureMessage: vi.fn(),
			addBreadcrumb: vi.fn(),
			log: vi.fn(),
			signup: vi.fn(),
			login: vi.fn(),
			logout: vi.fn(),
			accountDeleted: vi.fn(),
			subscriptionStarted: vi.fn(),
			subscriptionCancelled: vi.fn(),
			subscriptionRenewed: vi.fn(),
			planUpgraded: vi.fn(),
			planDowngraded: vi.fn(),
			trialStarted: vi.fn(),
			trialEnded: vi.fn(),
			inviteSent: vi.fn(),
			inviteAccepted: vi.fn(),
			featureActivated: vi.fn(),
			...overrides,
		};
	}

	beforeEach(() => {
		vi.useFakeTimers();
		mockFetch();
		mockLocation({ href: "https://example.com/page", pathname: "/page" });
		mockUserAgent("TestBrowser/1.0");
		mockAnalytics = createMockAnalytics();
		(
			mockAnalytics as unknown as { config: { host: string; apiKey: string } }
		).config = {
			host: "https://test.thisbefine.com",
			apiKey: "tbf_test_key",
		};
	});

	afterEach(() => {
		vi.useRealTimers();
		resetFetchMock();
		widgetInstance?.destroy();
		widgetInstance = null;

		const widget = document.getElementById("thisbefine-bug-report");
		widget?.remove();
	});

	describe("Widget Creation", () => {
		it("should create widget and return destroy function", () => {
			widgetInstance = createBugReportWidget(mockAnalytics);

			expect(widgetInstance).toBeDefined();
			expect(typeof widgetInstance.destroy).toBe("function");
		});

		it("should create a host element in the DOM", () => {
			widgetInstance = createBugReportWidget(mockAnalytics);

			const host = document.getElementById("thisbefine-bug-report");
			expect(host).not.toBeNull();
		});

		it("should create a Shadow DOM container", () => {
			widgetInstance = createBugReportWidget(mockAnalytics);

			const host = document.getElementById("thisbefine-bug-report");
			expect(host?.shadowRoot).not.toBeNull();
		});

		it("should contain styles in shadow root", () => {
			widgetInstance = createBugReportWidget(mockAnalytics);

			const host = document.getElementById("thisbefine-bug-report");
			const style = host?.shadowRoot?.querySelector("style");
			expect(style).not.toBeNull();
		});

		it("should create FAB button in shadow root", () => {
			widgetInstance = createBugReportWidget(mockAnalytics);

			const host = document.getElementById("thisbefine-bug-report");
			const fab = host?.shadowRoot?.querySelector(".tif-fab");
			expect(fab).not.toBeNull();
		});
	});

	describe("Widget Options", () => {
		it("should use default position (bottom-right)", () => {
			widgetInstance = createBugReportWidget(mockAnalytics);

			const host = document.getElementById("thisbefine-bug-report");
			const fab = host?.shadowRoot?.querySelector(".tif-fab");
			expect(fab?.classList.contains("bottom-right")).toBe(true);
		});

		it("should accept bottom-left position", () => {
			widgetInstance = createBugReportWidget(mockAnalytics, {
				position: "bottom-left",
			});

			const host = document.getElementById("thisbefine-bug-report");
			const fab = host?.shadowRoot?.querySelector(".tif-fab");
			expect(fab?.classList.contains("bottom-left")).toBe(true);
		});

		it("should use default button color (red)", () => {
			widgetInstance = createBugReportWidget(mockAnalytics);

			const host = document.getElementById("thisbefine-bug-report");
			const fab = host?.shadowRoot?.querySelector(".tif-fab") as HTMLElement;
			expect(fab?.style.backgroundColor).toBe("rgb(239, 68, 68)");
		});

		it("should accept custom button color", () => {
			widgetInstance = createBugReportWidget(mockAnalytics, {
				buttonColor: "#3b82f6",
			});

			const host = document.getElementById("thisbefine-bug-report");
			const fab = host?.shadowRoot?.querySelector(".tif-fab") as HTMLElement;
			expect(fab?.style.backgroundColor).toBe("rgb(59, 130, 246)");
		});

		it("should use default button text for aria-label", () => {
			widgetInstance = createBugReportWidget(mockAnalytics);

			const host = document.getElementById("thisbefine-bug-report");
			const fab = host?.shadowRoot?.querySelector(".tif-fab");
			expect(fab?.getAttribute("aria-label")).toBe("Report Bug");
		});

		it("should accept custom button text", () => {
			widgetInstance = createBugReportWidget(mockAnalytics, {
				buttonText: "Feedback",
			});

			const host = document.getElementById("thisbefine-bug-report");
			const fab = host?.shadowRoot?.querySelector(".tif-fab");
			expect(fab?.getAttribute("aria-label")).toBe("Feedback");
		});
	});

	describe("UI Interactions", () => {
		it("should open modal when FAB is clicked", () => {
			widgetInstance = createBugReportWidget(mockAnalytics);

			const host = document.getElementById("thisbefine-bug-report");
			const fab = host?.shadowRoot?.querySelector(".tif-fab") as HTMLElement;

			fab?.click();

			const modal = host?.shadowRoot?.querySelector(".tif-modal");
			expect(modal).not.toBeNull();
		});

		it("should close modal when close button is clicked", () => {
			widgetInstance = createBugReportWidget(mockAnalytics);

			const host = document.getElementById("thisbefine-bug-report");
			const fab = host?.shadowRoot?.querySelector(".tif-fab") as HTMLElement;
			fab?.click();

			const closeBtn = host?.shadowRoot?.querySelector(
				".tif-close",
			) as HTMLElement;
			closeBtn?.click();

			const modal = host?.shadowRoot?.querySelector(".tif-modal");
			expect(modal).toBeNull();
		});

		it("should close modal when cancel button is clicked", () => {
			widgetInstance = createBugReportWidget(mockAnalytics);

			const host = document.getElementById("thisbefine-bug-report");
			const fab = host?.shadowRoot?.querySelector(".tif-fab") as HTMLElement;
			fab?.click();

			const cancelBtn = host?.shadowRoot?.querySelector(
				".tif-btn-cancel",
			) as HTMLElement;
			cancelBtn?.click();

			const modal = host?.shadowRoot?.querySelector(".tif-modal");
			expect(modal).toBeNull();
		});

		it("should close modal when clicking overlay background", () => {
			widgetInstance = createBugReportWidget(mockAnalytics);

			const host = document.getElementById("thisbefine-bug-report");
			const fab = host?.shadowRoot?.querySelector(".tif-fab") as HTMLElement;
			fab?.click();

			const overlay = host?.shadowRoot?.querySelector(
				".tif-overlay",
			) as HTMLElement;

			const clickEvent = new MouseEvent("click", { bubbles: true });
			Object.defineProperty(clickEvent, "target", { value: overlay });
			overlay?.dispatchEvent(clickEvent);

			const modal = host?.shadowRoot?.querySelector(".tif-modal");
			expect(modal).toBeNull();
		});

		it("should contain form fields in modal", () => {
			widgetInstance = createBugReportWidget(mockAnalytics);

			const host = document.getElementById("thisbefine-bug-report");
			const fab = host?.shadowRoot?.querySelector(".tif-fab") as HTMLElement;
			fab?.click();

			expect(host?.shadowRoot?.querySelector("#tif-title")).not.toBeNull();
			expect(host?.shadowRoot?.querySelector("#tif-desc")).not.toBeNull();
			expect(host?.shadowRoot?.querySelector("#tif-severity")).not.toBeNull();
		});

		it("should have severity dropdown with options", () => {
			widgetInstance = createBugReportWidget(mockAnalytics);

			const host = document.getElementById("thisbefine-bug-report");
			const fab = host?.shadowRoot?.querySelector(".tif-fab") as HTMLElement;
			fab?.click();

			const severity = host?.shadowRoot?.querySelector(
				"#tif-severity",
			) as HTMLSelectElement;
			const options = severity?.querySelectorAll("option");

			expect(options?.length).toBe(4);
			expect(options?.[0]?.value).toBe("low");
			expect(options?.[1]?.value).toBe("medium");
			expect(options?.[2]?.value).toBe("high");
			expect(options?.[3]?.value).toBe("critical");
		});

		it("should default severity to medium", () => {
			widgetInstance = createBugReportWidget(mockAnalytics);

			const host = document.getElementById("thisbefine-bug-report");
			const fab = host?.shadowRoot?.querySelector(".tif-fab") as HTMLElement;
			fab?.click();

			const severity = host?.shadowRoot?.querySelector(
				"#tif-severity",
			) as HTMLSelectElement;
			expect(severity?.value).toBe("medium");
		});
	});

	describe("Form Validation", () => {
		it("should show error when submitting without title", async () => {
			widgetInstance = createBugReportWidget(mockAnalytics);

			const host = document.getElementById("thisbefine-bug-report");
			const fab = host?.shadowRoot?.querySelector(".tif-fab") as HTMLElement;
			fab?.click();

			const descInput = host?.shadowRoot?.querySelector(
				"#tif-desc",
			) as HTMLTextAreaElement;
			descInput.value = "Description text";

			const submitBtn = host?.shadowRoot?.querySelector(
				"#tif-submit",
			) as HTMLButtonElement;
			submitBtn?.click();

			await vi.advanceTimersByTimeAsync(100);

			const toast = host?.shadowRoot?.querySelector(".tif-toast.error");
			expect(toast).not.toBeNull();
		});

		it("should show error when submitting without description", async () => {
			widgetInstance = createBugReportWidget(mockAnalytics);

			const host = document.getElementById("thisbefine-bug-report");
			const fab = host?.shadowRoot?.querySelector(".tif-fab") as HTMLElement;
			fab?.click();

			const titleInput = host?.shadowRoot?.querySelector(
				"#tif-title",
			) as HTMLInputElement;
			titleInput.value = "Bug title";

			const submitBtn = host?.shadowRoot?.querySelector(
				"#tif-submit",
			) as HTMLButtonElement;
			submitBtn?.click();

			await vi.advanceTimersByTimeAsync(100);

			const toast = host?.shadowRoot?.querySelector(".tif-toast.error");
			expect(toast).not.toBeNull();
		});

		it("should have maxlength on title input", () => {
			widgetInstance = createBugReportWidget(mockAnalytics);

			const host = document.getElementById("thisbefine-bug-report");
			const fab = host?.shadowRoot?.querySelector(".tif-fab") as HTMLElement;
			fab?.click();

			const titleInput = host?.shadowRoot?.querySelector(
				"#tif-title",
			) as HTMLInputElement;
			expect(titleInput?.getAttribute("maxlength")).toBe("500");
		});

		it("should have maxlength on description textarea", () => {
			widgetInstance = createBugReportWidget(mockAnalytics);

			const host = document.getElementById("thisbefine-bug-report");
			const fab = host?.shadowRoot?.querySelector(".tif-fab") as HTMLElement;
			fab?.click();

			const descInput = host?.shadowRoot?.querySelector(
				"#tif-desc",
			) as HTMLTextAreaElement;
			expect(descInput?.getAttribute("maxlength")).toBe("10000");
		});
	});

	describe("Screenshot Handling", () => {
		it("should have screenshot upload zone", () => {
			widgetInstance = createBugReportWidget(mockAnalytics);

			const host = document.getElementById("thisbefine-bug-report");
			const fab = host?.shadowRoot?.querySelector(".tif-fab") as HTMLElement;
			fab?.click();

			const screenshotZone = host?.shadowRoot?.querySelector("#tif-screenshot");
			expect(screenshotZone).not.toBeNull();
		});

		it("should have hidden file input for upload", () => {
			widgetInstance = createBugReportWidget(mockAnalytics);

			const host = document.getElementById("thisbefine-bug-report");
			const fab = host?.shadowRoot?.querySelector(".tif-fab") as HTMLElement;
			fab?.click();

			const fileInput = host?.shadowRoot?.querySelector(
				'#tif-screenshot input[type="file"]',
			) as HTMLInputElement;
			expect(fileInput).not.toBeNull();
			expect(fileInput?.accept).toBe("image/*");
		});

		it("should trigger file input when screenshot zone is clicked", () => {
			widgetInstance = createBugReportWidget(mockAnalytics);

			const host = document.getElementById("thisbefine-bug-report");
			const fab = host?.shadowRoot?.querySelector(".tif-fab") as HTMLElement;
			fab?.click();

			const screenshotZone = host?.shadowRoot?.querySelector(
				"#tif-screenshot",
			) as HTMLElement;
			const fileInput = host?.shadowRoot?.querySelector(
				'#tif-screenshot input[type="file"]',
			) as HTMLInputElement;

			const clickSpy = vi.spyOn(fileInput, "click");
			screenshotZone?.click();

			expect(clickSpy).toHaveBeenCalled();
		});
	});

	describe("Context Info", () => {
		it("should display context information in collapsible details", () => {
			widgetInstance = createBugReportWidget(mockAnalytics);

			const host = document.getElementById("thisbefine-bug-report");
			const fab = host?.shadowRoot?.querySelector(".tif-fab") as HTMLElement;
			fab?.click();

			const contextDetails = host?.shadowRoot?.querySelector(".tif-context");
			expect(contextDetails).not.toBeNull();
		});

		it("should include URL in context", () => {
			mockLocation({ href: "https://test.example.com/dashboard" });
			widgetInstance = createBugReportWidget(mockAnalytics);

			const host = document.getElementById("thisbefine-bug-report");
			const fab = host?.shadowRoot?.querySelector(".tif-fab") as HTMLElement;
			fab?.click();

			const contextPre = host?.shadowRoot?.querySelector(".tif-context pre");
			expect(contextPre?.textContent).toContain(
				"https://test.example.com/dashboard",
			);
		});

		it("should include browser info in context", () => {
			mockUserAgent("Mozilla/5.0 TestBrowser");
			widgetInstance = createBugReportWidget(mockAnalytics);

			const host = document.getElementById("thisbefine-bug-report");
			const fab = host?.shadowRoot?.querySelector(".tif-fab") as HTMLElement;
			fab?.click();

			const contextPre = host?.shadowRoot?.querySelector(".tif-context pre");
			expect(contextPre?.textContent).toContain("Mozilla/5.0 TestBrowser");
		});
	});

	describe("Form Submission", () => {
		it("should submit to correct API endpoint", async () => {
			widgetInstance = createBugReportWidget(mockAnalytics);

			const host = document.getElementById("thisbefine-bug-report");
			const fab = host?.shadowRoot?.querySelector(".tif-fab") as HTMLElement;
			fab?.click();

			const titleInput = host?.shadowRoot?.querySelector(
				"#tif-title",
			) as HTMLInputElement;
			const descInput = host?.shadowRoot?.querySelector(
				"#tif-desc",
			) as HTMLTextAreaElement;
			titleInput.value = "Test bug";
			descInput.value = "Test description";

			const submitBtn = host?.shadowRoot?.querySelector(
				"#tif-submit",
			) as HTMLButtonElement;
			submitBtn?.click();

			await vi.advanceTimersByTimeAsync(100);

			const call = getLastFetchCall();
			expect(call?.url).toBe("https://test.thisbefine.com/api/v1/bug-report");
		});

		it("should include form fields in request", async () => {
			widgetInstance = createBugReportWidget(mockAnalytics);

			const host = document.getElementById("thisbefine-bug-report");
			const fab = host?.shadowRoot?.querySelector(".tif-fab") as HTMLElement;
			fab?.click();

			const titleInput = host?.shadowRoot?.querySelector(
				"#tif-title",
			) as HTMLInputElement;
			const descInput = host?.shadowRoot?.querySelector(
				"#tif-desc",
			) as HTMLTextAreaElement;
			const severitySelect = host?.shadowRoot?.querySelector(
				"#tif-severity",
			) as HTMLSelectElement;

			titleInput.value = "Critical bug found";
			descInput.value = "The app crashes when clicking submit";
			severitySelect.value = "critical";

			const submitBtn = host?.shadowRoot?.querySelector(
				"#tif-submit",
			) as HTMLButtonElement;
			submitBtn?.click();

			await vi.advanceTimersByTimeAsync(100);

			const call = getLastFetchCall();
			const body = parseFetchBody(call?.options) as {
				title: string;
				description: string;
				severity: string;
			};

			expect(body.title).toBe("Critical bug found");
			expect(body.description).toBe("The app crashes when clicking submit");
			expect(body.severity).toBe("critical");
		});

		it("should include user info in request", async () => {
			widgetInstance = createBugReportWidget(mockAnalytics);

			const host = document.getElementById("thisbefine-bug-report");
			const fab = host?.shadowRoot?.querySelector(".tif-fab") as HTMLElement;
			fab?.click();

			const titleInput = host?.shadowRoot?.querySelector(
				"#tif-title",
			) as HTMLInputElement;
			const descInput = host?.shadowRoot?.querySelector(
				"#tif-desc",
			) as HTMLTextAreaElement;
			titleInput.value = "Bug";
			descInput.value = "Description";

			const submitBtn = host?.shadowRoot?.querySelector(
				"#tif-submit",
			) as HTMLButtonElement;
			submitBtn?.click();

			await vi.advanceTimersByTimeAsync(100);

			const call = getLastFetchCall();
			const body = parseFetchBody(call?.options) as {
				anonymousId: string;
				userId: string;
			};

			expect(body.anonymousId).toBe("anon_test_123");
			expect(body.userId).toBe("user_test_456");
		});

		it("should include API key header", async () => {
			widgetInstance = createBugReportWidget(mockAnalytics);

			const host = document.getElementById("thisbefine-bug-report");
			const fab = host?.shadowRoot?.querySelector(".tif-fab") as HTMLElement;
			fab?.click();

			const titleInput = host?.shadowRoot?.querySelector(
				"#tif-title",
			) as HTMLInputElement;
			const descInput = host?.shadowRoot?.querySelector(
				"#tif-desc",
			) as HTMLTextAreaElement;
			titleInput.value = "Bug";
			descInput.value = "Description";

			const submitBtn = host?.shadowRoot?.querySelector(
				"#tif-submit",
			) as HTMLButtonElement;
			submitBtn?.click();

			await vi.advanceTimersByTimeAsync(100);

			const call = getLastFetchCall();
			expect(
				(call?.options?.headers as Record<string, string>)["X-API-Key"],
			).toBe("tbf_test_key");
		});

		it("should show success toast on successful submission", async () => {
			widgetInstance = createBugReportWidget(mockAnalytics);

			const host = document.getElementById("thisbefine-bug-report");
			const fab = host?.shadowRoot?.querySelector(".tif-fab") as HTMLElement;
			fab?.click();

			const titleInput = host?.shadowRoot?.querySelector(
				"#tif-title",
			) as HTMLInputElement;
			const descInput = host?.shadowRoot?.querySelector(
				"#tif-desc",
			) as HTMLTextAreaElement;
			titleInput.value = "Bug";
			descInput.value = "Description";

			const submitBtn = host?.shadowRoot?.querySelector(
				"#tif-submit",
			) as HTMLButtonElement;
			submitBtn?.click();

			await vi.advanceTimersByTimeAsync(100);

			const toast = host?.shadowRoot?.querySelector(".tif-toast.success");
			expect(toast).not.toBeNull();
		});

		it("should close modal on successful submission", async () => {
			widgetInstance = createBugReportWidget(mockAnalytics);

			const host = document.getElementById("thisbefine-bug-report");
			const fab = host?.shadowRoot?.querySelector(".tif-fab") as HTMLElement;
			fab?.click();

			const titleInput = host?.shadowRoot?.querySelector(
				"#tif-title",
			) as HTMLInputElement;
			const descInput = host?.shadowRoot?.querySelector(
				"#tif-desc",
			) as HTMLTextAreaElement;
			titleInput.value = "Bug";
			descInput.value = "Description";

			const submitBtn = host?.shadowRoot?.querySelector(
				"#tif-submit",
			) as HTMLButtonElement;
			submitBtn?.click();

			await vi.advanceTimersByTimeAsync(100);

			const modal = host?.shadowRoot?.querySelector(".tif-modal");
			expect(modal).toBeNull();
		});

		it("should disable submit button while submitting", async () => {
			widgetInstance = createBugReportWidget(mockAnalytics);

			const host = document.getElementById("thisbefine-bug-report");
			const fab = host?.shadowRoot?.querySelector(".tif-fab") as HTMLElement;
			fab?.click();

			const titleInput = host?.shadowRoot?.querySelector(
				"#tif-title",
			) as HTMLInputElement;
			const descInput = host?.shadowRoot?.querySelector(
				"#tif-desc",
			) as HTMLTextAreaElement;
			titleInput.value = "Bug";
			descInput.value = "Description";

			const submitBtn = host?.shadowRoot?.querySelector(
				"#tif-submit",
			) as HTMLButtonElement;
			submitBtn?.click();

			expect(submitBtn?.disabled).toBe(true);
			expect(submitBtn?.textContent).toBe("Submitting...");
		});
	});

	describe("Cleanup", () => {
		it("should remove DOM element on destroy", () => {
			widgetInstance = createBugReportWidget(mockAnalytics);

			expect(document.getElementById("thisbefine-bug-report")).not.toBeNull();

			widgetInstance.destroy();
			widgetInstance = null;

			expect(document.getElementById("thisbefine-bug-report")).toBeNull();
		});

		it("should handle multiple destroy calls gracefully", () => {
			widgetInstance = createBugReportWidget(mockAnalytics);

			expect(() => {
				widgetInstance?.destroy();
				widgetInstance?.destroy();
			}).not.toThrow();

			widgetInstance = null;
		});
	});

	describe("Accessibility", () => {
		it("should have aria-label on FAB", () => {
			widgetInstance = createBugReportWidget(mockAnalytics);

			const host = document.getElementById("thisbefine-bug-report");
			const fab = host?.shadowRoot?.querySelector(".tif-fab");
			expect(fab?.getAttribute("aria-label")).toBeDefined();
		});

		it("should have aria-label on close button", () => {
			widgetInstance = createBugReportWidget(mockAnalytics);

			const host = document.getElementById("thisbefine-bug-report");
			const fab = host?.shadowRoot?.querySelector(".tif-fab") as HTMLElement;
			fab?.click();

			const closeBtn = host?.shadowRoot?.querySelector(".tif-close");
			expect(closeBtn?.getAttribute("aria-label")).toBe("Close");
		});

		it("should have labels for form fields", () => {
			widgetInstance = createBugReportWidget(mockAnalytics);

			const host = document.getElementById("thisbefine-bug-report");
			const fab = host?.shadowRoot?.querySelector(".tif-fab") as HTMLElement;
			fab?.click();

			const titleLabel = host?.shadowRoot?.querySelector(
				'label[for="tif-title"]',
			);
			const descLabel = host?.shadowRoot?.querySelector(
				'label[for="tif-desc"]',
			);
			const severityLabel = host?.shadowRoot?.querySelector(
				'label[for="tif-severity"]',
			);

			expect(titleLabel).not.toBeNull();
			expect(descLabel).not.toBeNull();
			expect(severityLabel).not.toBeNull();
		});
	});
});
