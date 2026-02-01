import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mockConsole } from "../../test-utils";
import { createLogger } from "../logger";

describe("createLogger", () => {
	let consoleSpy: ReturnType<typeof mockConsole>;

	beforeEach(() => {
		consoleSpy = mockConsole();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("Logger Creation", () => {
		it("should return a logger object with log, warn, and error methods", () => {
			const logger = createLogger("Test", true);

			expect(typeof logger.log).toBe("function");
			expect(typeof logger.warn).toBe("function");
			expect(typeof logger.error).toBe("function");
		});

		it("should accept a prefix parameter", () => {
			const logger = createLogger("CustomPrefix", true);
			logger.log("test message");

			expect(consoleSpy.log).toHaveBeenCalledWith(
				"[Thisbefine CustomPrefix]",
				"test message",
			);
		});

		it("should accept a debug boolean parameter", () => {
			const debugLogger = createLogger("Test", true);
			const nonDebugLogger = createLogger("Test", false);

			expect(debugLogger).toBeDefined();
			expect(nonDebugLogger).toBeDefined();
		});
	});

	describe("log() Method", () => {
		it("should output to console.log when debug is true", () => {
			const logger = createLogger("Test", true);
			logger.log("Test message");

			expect(consoleSpy.log).toHaveBeenCalledWith(
				"[Thisbefine Test]",
				"Test message",
			);
		});

		it("should NOT output when debug is false", () => {
			const logger = createLogger("Test", false);
			logger.log("Should not appear");

			expect(consoleSpy.log).not.toHaveBeenCalled();
		});

		it("should accept multiple arguments", () => {
			const logger = createLogger("Test", true);
			logger.log("Message", { data: 123 }, [1, 2, 3]);

			expect(consoleSpy.log).toHaveBeenCalledWith(
				"[Thisbefine Test]",
				"Message",
				{ data: 123 },
				[1, 2, 3],
			);
		});

		it("should handle no arguments", () => {
			const logger = createLogger("Test", true);
			logger.log();

			expect(consoleSpy.log).toHaveBeenCalledWith("[Thisbefine Test]");
		});

		it("should handle null and undefined values", () => {
			const logger = createLogger("Test", true);
			logger.log(null, undefined, "value");

			expect(consoleSpy.log).toHaveBeenCalledWith(
				"[Thisbefine Test]",
				null,
				undefined,
				"value",
			);
		});
	});

	describe("warn() Method", () => {
		it("should output to console.warn when debug is true", () => {
			const logger = createLogger("Test", true);
			logger.warn("Warning message");

			expect(consoleSpy.warn).toHaveBeenCalledWith(
				"[Thisbefine Test]",
				"Warning message",
			);
		});

		it("should NOT output when debug is false", () => {
			const logger = createLogger("Test", false);
			logger.warn("Should not appear");

			expect(consoleSpy.warn).not.toHaveBeenCalled();
		});

		it("should accept multiple arguments", () => {
			const logger = createLogger("Test", true);
			logger.warn("Warning", "details", { code: 123 });

			expect(consoleSpy.warn).toHaveBeenCalledWith(
				"[Thisbefine Test]",
				"Warning",
				"details",
				{ code: 123 },
			);
		});

		it("should use correct prefix", () => {
			const logger = createLogger("Session", true);
			logger.warn("Session warning");

			expect(consoleSpy.warn).toHaveBeenCalledWith(
				"[Thisbefine Session]",
				"Session warning",
			);
		});
	});

	describe("error() Method", () => {
		it("should ALWAYS output to console.error regardless of debug setting", () => {
			const debugLogger = createLogger("Test", true);
			const nonDebugLogger = createLogger("Test", false);

			debugLogger.error("Error in debug mode");
			nonDebugLogger.error("Error in non-debug mode");

			expect(consoleSpy.error).toHaveBeenCalledTimes(2);
		});

		it("should output even when debug is false", () => {
			const logger = createLogger("Test", false);
			logger.error("Critical error");

			expect(consoleSpy.error).toHaveBeenCalledWith(
				"[Thisbefine Test]",
				"Critical error",
			);
		});

		it("should accept multiple arguments", () => {
			const logger = createLogger("Test", true);
			const error = new Error("Something went wrong");
			logger.error("Error occurred:", error, { context: "test" });

			expect(consoleSpy.error).toHaveBeenCalledWith(
				"[Thisbefine Test]",
				"Error occurred:",
				error,
				{ context: "test" },
			);
		});

		it("should use correct prefix", () => {
			const logger = createLogger("Errors", false);
			logger.error("Error message");

			expect(consoleSpy.error).toHaveBeenCalledWith(
				"[Thisbefine Errors]",
				"Error message",
			);
		});
	});

	describe("Prefix Formatting", () => {
		it("should format prefix as [Thisbefine {prefix}]", () => {
			const logger = createLogger("Queue", true);
			logger.log("Message");

			expect(consoleSpy.log).toHaveBeenCalledWith(
				"[Thisbefine Queue]",
				"Message",
			);
		});

		it("should handle different prefix values", () => {
			const prefixes = ["Analytics", "Session", "Privacy", "Storage", "Errors"];

			for (const prefix of prefixes) {
				const logger = createLogger(prefix, true);
				logger.log("test");

				expect(consoleSpy.log).toHaveBeenCalledWith(
					`[Thisbefine ${prefix}]`,
					"test",
				);
			}
		});

		it("should handle empty prefix", () => {
			const logger = createLogger("", true);
			logger.log("Message");

			expect(consoleSpy.log).toHaveBeenCalledWith("[Thisbefine ]", "Message");
		});

		it("should handle prefix with special characters", () => {
			const logger = createLogger("Test-Module_v2", true);
			logger.log("Message");

			expect(consoleSpy.log).toHaveBeenCalledWith(
				"[Thisbefine Test-Module_v2]",
				"Message",
			);
		});
	});

	describe("Console Availability", () => {
		it("should not throw when console is defined", () => {
			const logger = createLogger("Test", true);

			expect(() => logger.log("test")).not.toThrow();
			expect(() => logger.warn("test")).not.toThrow();
			expect(() => logger.error("test")).not.toThrow();
		});
	});

	describe("Multiple Loggers", () => {
		it("should allow multiple independent loggers", () => {
			const logger1 = createLogger("Module1", true);
			const logger2 = createLogger("Module2", true);

			logger1.log("From module 1");
			logger2.log("From module 2");

			expect(consoleSpy.log).toHaveBeenCalledWith(
				"[Thisbefine Module1]",
				"From module 1",
			);
			expect(consoleSpy.log).toHaveBeenCalledWith(
				"[Thisbefine Module2]",
				"From module 2",
			);
		});

		it("should allow loggers with different debug settings", () => {
			const debugLogger = createLogger("Debug", true);
			const silentLogger = createLogger("Silent", false);

			debugLogger.log("Should appear");
			silentLogger.log("Should not appear");

			expect(consoleSpy.log).toHaveBeenCalledTimes(1);
			expect(consoleSpy.log).toHaveBeenCalledWith(
				"[Thisbefine Debug]",
				"Should appear",
			);
		});
	});

	describe("Edge Cases", () => {
		it("should handle logging objects", () => {
			const logger = createLogger("Test", true);
			const obj = { nested: { data: [1, 2, 3] } };
			logger.log(obj);

			expect(consoleSpy.log).toHaveBeenCalledWith("[Thisbefine Test]", obj);
		});

		it("should handle logging functions", () => {
			const logger = createLogger("Test", true);
			const fn = () => "test";
			logger.log(fn);

			expect(consoleSpy.log).toHaveBeenCalledWith("[Thisbefine Test]", fn);
		});

		it("should handle logging symbols", () => {
			const logger = createLogger("Test", true);
			const sym = Symbol("test");
			logger.log(sym);

			expect(consoleSpy.log).toHaveBeenCalledWith("[Thisbefine Test]", sym);
		});

		it("should handle logging very long strings", () => {
			const logger = createLogger("Test", true);
			const longString = "a".repeat(10000);
			logger.log(longString);

			expect(consoleSpy.log).toHaveBeenCalledWith(
				"[Thisbefine Test]",
				longString,
			);
		});
	});
});
