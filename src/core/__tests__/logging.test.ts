import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type LogLevel, log } from "../logging";
import type { Analytics } from "../types";

describe("log() Function", () => {
	let mockAnalytics: Analytics;
	let trackCalls: Array<{
		event: string;
		properties?: Record<string, unknown>;
	}>;

	beforeEach(() => {
		trackCalls = [];

		mockAnalytics = {
			track: vi.fn((event: string, properties?: Record<string, unknown>) => {
				trackCalls.push({ event, properties });
			}),
			identify: vi.fn(),
			page: vi.fn(),
			group: vi.fn(),
			reset: vi.fn(),
			flush: vi.fn(() => Promise.resolve()),
			optOut: vi.fn(),
			optIn: vi.fn(),
			isOptedOut: vi.fn(() => false),
			getUser: vi.fn(() => ({ anonymousId: "anon_123" })),
			captureException: vi.fn(),
			captureMessage: vi.fn(),
			addBreadcrumb: vi.fn(),
			log: vi.fn(),
		};
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("Event Tracking", () => {
		it("should send a $log track event", () => {
			log(mockAnalytics, "Test message", "info");

			expect(mockAnalytics.track).toHaveBeenCalledWith(
				"$log",
				expect.any(Object),
			);
		});

		it("should call track on the analytics instance", () => {
			log(mockAnalytics, "Test message", "info");

			expect(mockAnalytics.track).toHaveBeenCalledTimes(1);
		});

		it("should use $log as the event name", () => {
			log(mockAnalytics, "Test message", "info");

			expect(trackCalls[0].event).toBe("$log");
		});
	});

	describe("Message Property", () => {
		it("should include message in properties", () => {
			log(mockAnalytics, "Test log message", "info");

			expect(trackCalls[0].properties?.message).toBe("Test log message");
		});

		it("should handle empty message", () => {
			log(mockAnalytics, "", "info");

			expect(trackCalls[0].properties?.message).toBe("");
		});

		it("should handle long messages", () => {
			const longMessage = "a".repeat(1000);
			log(mockAnalytics, longMessage, "info");

			expect(trackCalls[0].properties?.message).toBe(longMessage);
		});

		it("should handle messages with special characters", () => {
			const specialMessage =
				"Error: Failed to connect! <script>alert('xss')</script>";
			log(mockAnalytics, specialMessage, "error");

			expect(trackCalls[0].properties?.message).toBe(specialMessage);
		});

		it("should handle unicode messages", () => {
			const unicodeMessage = "エラー発生: データベース接続失敗 🚨";
			log(mockAnalytics, unicodeMessage, "error");

			expect(trackCalls[0].properties?.message).toBe(unicodeMessage);
		});
	});

	describe("Level Property", () => {
		it("should include level in properties", () => {
			log(mockAnalytics, "Test message", "warn");

			expect(trackCalls[0].properties?.level).toBe("warn");
		});

		it("should handle all log levels", () => {
			const levels: LogLevel[] = ["debug", "info", "warn", "error", "fatal"];

			for (const level of levels) {
				trackCalls = [];
				log(mockAnalytics, `${level} message`, level);

				expect(trackCalls[0].properties?.level).toBe(level);
			}
		});

		it("should handle debug level", () => {
			log(mockAnalytics, "Debug info", "debug");
			expect(trackCalls[0].properties?.level).toBe("debug");
		});

		it("should handle info level", () => {
			log(mockAnalytics, "Info message", "info");
			expect(trackCalls[0].properties?.level).toBe("info");
		});

		it("should handle warn level", () => {
			log(mockAnalytics, "Warning message", "warn");
			expect(trackCalls[0].properties?.level).toBe("warn");
		});

		it("should handle error level", () => {
			log(mockAnalytics, "Error occurred", "error");
			expect(trackCalls[0].properties?.level).toBe("error");
		});

		it("should handle fatal level", () => {
			log(mockAnalytics, "Fatal error!", "fatal");
			expect(trackCalls[0].properties?.level).toBe("fatal");
		});
	});

	describe("Metadata", () => {
		it("should include metadata in properties", () => {
			log(mockAnalytics, "User action", "info", {
				userId: "123",
				action: "click",
			});

			expect(trackCalls[0].properties?.userId).toBe("123");
			expect(trackCalls[0].properties?.action).toBe("click");
		});

		it("should handle empty metadata object", () => {
			log(mockAnalytics, "Message", "info", {});

			expect(trackCalls[0].properties).toEqual({
				message: "Message",
				level: "info",
			});
		});

		it("should handle undefined metadata", () => {
			log(mockAnalytics, "Message", "info", undefined);

			expect(trackCalls[0].properties).toEqual({
				message: "Message",
				level: "info",
			});
		});

		it("should handle metadata without optional parameter", () => {
			log(mockAnalytics, "Message", "info");

			expect(trackCalls[0].properties).toEqual({
				message: "Message",
				level: "info",
			});
		});

		it("should handle complex metadata values", () => {
			log(mockAnalytics, "Complex data", "info", {
				nested: { value: 123 },
				array: [1, 2, 3],
				boolean: true,
				nullValue: null,
			});

			expect(trackCalls[0].properties?.nested).toEqual({ value: 123 });
			expect(trackCalls[0].properties?.array).toEqual([1, 2, 3]);
			expect(trackCalls[0].properties?.boolean).toBe(true);
			expect(trackCalls[0].properties?.nullValue).toBeNull();
		});
	});

	describe("Reserved Key Prefixing", () => {
		it("should prefix 'message' key in metadata with 'meta_'", () => {
			log(mockAnalytics, "Actual message", "info", {
				message: "Conflicting message",
			});

			expect(trackCalls[0].properties?.message).toBe("Actual message");
			expect(trackCalls[0].properties?.meta_message).toBe(
				"Conflicting message",
			);
		});

		it("should prefix 'level' key in metadata with 'meta_'", () => {
			log(mockAnalytics, "Test", "info", {
				level: "custom_level",
			});

			expect(trackCalls[0].properties?.level).toBe("info");
			expect(trackCalls[0].properties?.meta_level).toBe("custom_level");
		});

		it("should prefix both reserved keys when both are present", () => {
			log(mockAnalytics, "Actual message", "error", {
				message: "Meta message",
				level: "Meta level",
				otherKey: "Other value",
			});

			expect(trackCalls[0].properties?.message).toBe("Actual message");
			expect(trackCalls[0].properties?.level).toBe("error");
			expect(trackCalls[0].properties?.meta_message).toBe("Meta message");
			expect(trackCalls[0].properties?.meta_level).toBe("Meta level");
			expect(trackCalls[0].properties?.otherKey).toBe("Other value");
		});

		it("should not prefix non-reserved keys", () => {
			log(mockAnalytics, "Test", "info", {
				userId: "123",
				action: "click",
				component: "Button",
			});

			expect(trackCalls[0].properties?.userId).toBe("123");
			expect(trackCalls[0].properties?.action).toBe("click");
			expect(trackCalls[0].properties?.component).toBe("Button");
			expect(trackCalls[0].properties?.meta_userId).toBeUndefined();
		});
	});

	describe("Properties Structure", () => {
		it("should always have message and level in properties", () => {
			log(mockAnalytics, "Test", "debug");

			expect(trackCalls[0].properties).toHaveProperty("message");
			expect(trackCalls[0].properties).toHaveProperty("level");
		});

		it("should spread metadata after message and level", () => {
			log(mockAnalytics, "Test", "info", { custom: "value" });

			const props = trackCalls[0].properties;
			expect(props).toEqual({
				message: "Test",
				level: "info",
				custom: "value",
			});
		});

		it("should maintain correct property order (message, level, then metadata)", () => {
			log(mockAnalytics, "Test", "warn", { a: 1, b: 2, c: 3 });

			const props = trackCalls[0].properties as Record<string, unknown>;
			const keys = Object.keys(props);

			expect(keys.includes("message")).toBe(true);
			expect(keys.includes("level")).toBe(true);
			expect(keys.includes("a")).toBe(true);
			expect(keys.includes("b")).toBe(true);
			expect(keys.includes("c")).toBe(true);
		});
	});

	describe("Edge Cases", () => {
		it("should handle metadata with numeric keys", () => {
			log(mockAnalytics, "Test", "info", {
				"123": "numeric key",
				456: "another numeric",
			});

			expect(trackCalls[0].properties?.["123"]).toBe("numeric key");
		});

		it("should handle metadata with empty string key", () => {
			log(mockAnalytics, "Test", "info", {
				"": "empty key value",
			});

			expect(trackCalls[0].properties?.[""]).toBe("empty key value");
		});

		it("should handle metadata with symbol-like string keys", () => {
			log(mockAnalytics, "Test", "info", {
				"Symbol(test)": "symbol-like key",
			});

			expect(trackCalls[0].properties?.["Symbol(test)"]).toBe(
				"symbol-like key",
			);
		});

		it("should handle very large metadata objects", () => {
			const largeMetadata: Record<string, unknown> = {};
			for (let i = 0; i < 100; i++) {
				largeMetadata[`key_${i}`] = `value_${i}`;
			}

			log(mockAnalytics, "Large metadata", "info", largeMetadata);

			expect(mockAnalytics.track).toHaveBeenCalled();
			expect(trackCalls[0].properties?.key_0).toBe("value_0");
			expect(trackCalls[0].properties?.key_99).toBe("value_99");
		});
	});

	describe("Integration with Analytics", () => {
		it("should use the provided analytics instance", () => {
			const anotherMockAnalytics: Analytics = {
				...mockAnalytics,
				track: vi.fn(),
			};

			log(anotherMockAnalytics, "Test", "info");

			expect(anotherMockAnalytics.track).toHaveBeenCalled();
			expect(mockAnalytics.track).not.toHaveBeenCalled();
		});

		it("should not call other analytics methods", () => {
			log(mockAnalytics, "Test", "info");

			expect(mockAnalytics.identify).not.toHaveBeenCalled();
			expect(mockAnalytics.page).not.toHaveBeenCalled();
			expect(mockAnalytics.group).not.toHaveBeenCalled();
			expect(mockAnalytics.reset).not.toHaveBeenCalled();
		});
	});
});
