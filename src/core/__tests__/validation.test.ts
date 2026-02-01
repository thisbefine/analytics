import { describe, expect, it } from "vitest";
import {
	isNonEmptyString,
	sanitizeString,
	validateAccountId,
	validateEventName,
	validateProperties,
	validateUserId,
} from "../validation";

describe("Validation", () => {
	describe("isNonEmptyString", () => {
		it("should return true for non-empty strings", () => {
			expect(isNonEmptyString("hello")).toBe(true);
			expect(isNonEmptyString("a")).toBe(true);
			expect(isNonEmptyString("test string")).toBe(true);
		});

		it("should return false for empty strings", () => {
			expect(isNonEmptyString("")).toBe(false);
		});

		it("should return false for whitespace-only strings", () => {
			expect(isNonEmptyString("   ")).toBe(false);
			expect(isNonEmptyString("\t")).toBe(false);
			expect(isNonEmptyString("\n")).toBe(false);
			expect(isNonEmptyString("  \t\n  ")).toBe(false);
		});

		it("should return false for non-string values", () => {
			expect(isNonEmptyString(null)).toBe(false);
			expect(isNonEmptyString(undefined)).toBe(false);
			expect(isNonEmptyString(123)).toBe(false);
			expect(isNonEmptyString({})).toBe(false);
			expect(isNonEmptyString([])).toBe(false);
			expect(isNonEmptyString(true)).toBe(false);
		});
	});

	describe("validateEventName", () => {
		it("should accept valid event names", () => {
			expect(validateEventName("button_clicked").valid).toBe(true);
			expect(validateEventName("signup_completed").valid).toBe(true);
			expect(validateEventName("$pageview").valid).toBe(true);
			expect(validateEventName("User Signed Up").valid).toBe(true);
		});

		it("should reject empty event names", () => {
			const result = validateEventName("");
			expect(result.valid).toBe(false);
			expect(result.error).toContain("non-empty string");
		});

		it("should reject whitespace-only event names", () => {
			const result = validateEventName("   ");
			expect(result.valid).toBe(false);
		});

		it("should reject non-string event names", () => {
			expect(validateEventName(null).valid).toBe(false);
			expect(validateEventName(undefined).valid).toBe(false);
			expect(validateEventName(123).valid).toBe(false);
			expect(validateEventName({}).valid).toBe(false);
		});

		it("should reject event names exceeding 200 characters", () => {
			const longName = "a".repeat(201);
			const result = validateEventName(longName);
			expect(result.valid).toBe(false);
			expect(result.error).toContain("200 characters");
		});

		it("should accept event names at exactly 200 characters", () => {
			const maxName = "a".repeat(200);
			expect(validateEventName(maxName).valid).toBe(true);
		});

		it("should accept event names with special characters", () => {
			expect(validateEventName("button-clicked").valid).toBe(true);
			expect(validateEventName("user.action").valid).toBe(true);
			expect(validateEventName("event:type").valid).toBe(true);
		});

		it("should accept event names with unicode", () => {
			expect(validateEventName("ボタンクリック").valid).toBe(true);
			expect(validateEventName("user_événement").valid).toBe(true);
		});
	});

	describe("validateUserId", () => {
		it("should accept valid user IDs", () => {
			expect(validateUserId("user_123").valid).toBe(true);
			expect(validateUserId("abc@example.com").valid).toBe(true);
			expect(validateUserId("550e8400-e29b-41d4-a716-446655440000").valid).toBe(
				true,
			);
		});

		it("should reject empty user IDs", () => {
			const result = validateUserId("");
			expect(result.valid).toBe(false);
			expect(result.error).toContain("non-empty string");
		});

		it("should reject whitespace-only user IDs", () => {
			expect(validateUserId("   ").valid).toBe(false);
		});

		it("should reject non-string user IDs", () => {
			expect(validateUserId(null).valid).toBe(false);
			expect(validateUserId(undefined).valid).toBe(false);
			expect(validateUserId(123).valid).toBe(false);
		});

		it("should reject user IDs exceeding 500 characters", () => {
			const longId = "a".repeat(501);
			const result = validateUserId(longId);
			expect(result.valid).toBe(false);
			expect(result.error).toContain("500 characters");
		});

		it("should accept user IDs at exactly 500 characters", () => {
			const maxId = "a".repeat(500);
			expect(validateUserId(maxId).valid).toBe(true);
		});

		it('should reject "undefined" as a string', () => {
			const result = validateUserId("undefined");
			expect(result.valid).toBe(false);
			expect(result.error).toContain("Invalid user ID");
		});

		it('should reject "null" as a string', () => {
			const result = validateUserId("null");
			expect(result.valid).toBe(false);
			expect(result.error).toContain("Invalid user ID");
		});

		it('should reject "[object Object]" as a user ID', () => {
			const result = validateUserId("[object Object]");
			expect(result.valid).toBe(false);
			expect(result.error).toContain("Invalid user ID");
		});
	});

	describe("validateAccountId", () => {
		it("should accept valid account IDs", () => {
			expect(validateAccountId("account_123").valid).toBe(true);
			expect(validateAccountId("org-456").valid).toBe(true);
			expect(validateAccountId("company@domain.com").valid).toBe(true);
		});

		it("should reject empty account IDs", () => {
			const result = validateAccountId("");
			expect(result.valid).toBe(false);
			expect(result.error).toContain("non-empty string");
		});

		it("should reject whitespace-only account IDs", () => {
			expect(validateAccountId("   ").valid).toBe(false);
		});

		it("should reject non-string account IDs", () => {
			expect(validateAccountId(null).valid).toBe(false);
			expect(validateAccountId(undefined).valid).toBe(false);
			expect(validateAccountId(123).valid).toBe(false);
		});

		it("should reject account IDs exceeding 500 characters", () => {
			const longId = "a".repeat(501);
			const result = validateAccountId(longId);
			expect(result.valid).toBe(false);
			expect(result.error).toContain("500 characters");
		});

		it("should accept account IDs at exactly 500 characters", () => {
			const maxId = "a".repeat(500);
			expect(validateAccountId(maxId).valid).toBe(true);
		});

		it('should reject "undefined" as a string', () => {
			const result = validateAccountId("undefined");
			expect(result.valid).toBe(false);
			expect(result.error).toContain("Invalid account ID");
		});

		it('should reject "null" as a string', () => {
			const result = validateAccountId("null");
			expect(result.valid).toBe(false);
			expect(result.error).toContain("Invalid account ID");
		});

		it('should reject "[object Object]" as an account ID', () => {
			const result = validateAccountId("[object Object]");
			expect(result.valid).toBe(false);
			expect(result.error).toContain("Invalid account ID");
		});
	});

	describe("validateProperties", () => {
		it("should accept valid property objects", () => {
			expect(validateProperties({ key: "value" }).valid).toBe(true);
			expect(validateProperties({ count: 123 }).valid).toBe(true);
			expect(validateProperties({ active: true }).valid).toBe(true);
			expect(validateProperties({ nested: { a: 1 } }).valid).toBe(true);
		});

		it("should accept undefined properties", () => {
			expect(validateProperties(undefined).valid).toBe(true);
		});

		it("should accept null properties", () => {
			expect(validateProperties(null).valid).toBe(true);
		});

		it("should accept empty objects", () => {
			expect(validateProperties({}).valid).toBe(true);
		});

		it("should reject arrays", () => {
			const result = validateProperties([1, 2, 3]);
			expect(result.valid).toBe(false);
			expect(result.error).toContain("must be an object");
		});

		it("should reject non-object primitives", () => {
			expect(validateProperties("string").valid).toBe(false);
			expect(validateProperties(123).valid).toBe(false);
			expect(validateProperties(true).valid).toBe(false);
		});

		it("should reject properties exceeding 32KB", () => {
			const largeValue = "x".repeat(33 * 1024);
			const result = validateProperties({ data: largeValue });
			expect(result.valid).toBe(false);
			expect(result.error).toContain("32768 bytes");
		});

		it("should accept properties at exactly 32KB", () => {
			const value = "x".repeat(30 * 1024);
			expect(validateProperties({ data: value }).valid).toBe(true);
		});

		it("should reject circular references", () => {
			const circular: Record<string, unknown> = { a: 1 };
			circular.self = circular;

			const result = validateProperties(circular);
			expect(result.valid).toBe(false);
			expect(result.error).toContain("circular references");
		});

		it("should accept deeply nested objects", () => {
			const nested = {
				level1: {
					level2: {
						level3: {
							value: "deep",
						},
					},
				},
			};
			expect(validateProperties(nested).valid).toBe(true);
		});

		it("should accept arrays as property values", () => {
			expect(validateProperties({ items: [1, 2, 3] }).valid).toBe(true);
			expect(validateProperties({ tags: ["a", "b", "c"] }).valid).toBe(true);
		});

		it("should accept null as a property value", () => {
			expect(validateProperties({ nullable: null }).valid).toBe(true);
		});

		it("should accept Date objects (serialized to string)", () => {
			expect(validateProperties({ date: new Date() }).valid).toBe(true);
		});
	});

	describe("sanitizeString", () => {
		it("should return string unchanged if within limit", () => {
			expect(sanitizeString("hello", 10)).toBe("hello");
			expect(sanitizeString("test", 100)).toBe("test");
		});

		it("should truncate string if exceeding limit", () => {
			expect(sanitizeString("hello world", 5)).toBe("hello");
			expect(sanitizeString("abcdefghij", 3)).toBe("abc");
		});

		it("should handle exact length match", () => {
			expect(sanitizeString("hello", 5)).toBe("hello");
		});

		it("should handle empty strings", () => {
			expect(sanitizeString("", 10)).toBe("");
		});

		it("should handle zero limit", () => {
			expect(sanitizeString("hello", 0)).toBe("");
		});

		it("should handle unicode characters", () => {
			expect(sanitizeString("こんにちは", 3)).toBe("こんに");
		});

		it("should handle emojis", () => {
			expect(sanitizeString("🎉🎊🎈", 2)).toHaveLength(2);
		});
	});

	describe("Error Messages", () => {
		it("should provide descriptive error for empty event name", () => {
			const result = validateEventName("");
			expect(result.error).toBe("Event name must be a non-empty string");
		});

		it("should provide descriptive error for long event name", () => {
			const result = validateEventName("a".repeat(201));
			expect(result.error).toBe("Event name exceeds 200 characters");
		});

		it("should provide descriptive error for empty user ID", () => {
			const result = validateUserId("");
			expect(result.error).toBe("User ID must be a non-empty string");
		});

		it("should provide descriptive error for invalid user ID value", () => {
			const result = validateUserId("undefined");
			expect(result.error).toBe('Invalid user ID: "undefined"');
		});

		it("should provide descriptive error for empty account ID", () => {
			const result = validateAccountId("");
			expect(result.error).toBe("Account ID must be a non-empty string");
		});

		it("should provide descriptive error for array properties", () => {
			const result = validateProperties([]);
			expect(result.error).toBe("Properties must be an object");
		});
	});
});
