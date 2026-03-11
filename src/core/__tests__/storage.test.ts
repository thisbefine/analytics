import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	clearAllStorage,
	mockLocalStorage,
	mockLocalStorageUnavailable,
	mockSessionStorage,
	mockSessionStorageUnavailable,
} from "../../test-utils";
import { generateId, Storage } from "../storage";

describe("Storage", () => {
	beforeEach(() => {
		clearAllStorage();
	});

	afterEach(() => {
		clearAllStorage();
	});

	describe("Storage Type Detection", () => {
		it("should detect localStorage when available", () => {
			mockLocalStorage();
			const storage = new Storage();
			expect(storage.getStorageType()).toBe("localStorage");
		});

		it("should fall back to sessionStorage when localStorage is unavailable", () => {
			mockLocalStorageUnavailable();
			mockSessionStorage();
			const storage = new Storage();
			expect(storage.getStorageType()).toBe("sessionStorage");
		});

		it("should fall back to cookie when both localStorage and sessionStorage are unavailable", () => {
			mockLocalStorageUnavailable();
			mockSessionStorageUnavailable();
			const storage = new Storage();
			expect(storage.getStorageType()).toBe("cookie");
		});

		it("should fall back to memory when all storage mechanisms are unavailable", () => {
			mockLocalStorageUnavailable();
			mockSessionStorageUnavailable();
			Object.defineProperty(navigator, "cookieEnabled", {
				value: false,
				configurable: true,
			});
			const storage = new Storage();
			expect(storage.getStorageType()).toBe("memory");
		});
	});

	describe("LocalStorage Operations", () => {
		let storage: Storage;

		beforeEach(() => {
			mockLocalStorage();
			storage = new Storage();
		});

		it("should set and get values correctly", () => {
			storage.set("test_key", "test_value");
			expect(storage.get("test_key")).toBe("test_value");
		});

		it("should return null for non-existent keys", () => {
			expect(storage.get("non_existent")).toBeNull();
		});

		it("should remove values correctly", () => {
			storage.set("test_key", "test_value");
			storage.remove("test_key");
			expect(storage.get("test_key")).toBeNull();
		});

		it("should handle JSON values correctly", () => {
			const jsonValue = JSON.stringify({ foo: "bar", count: 42 });
			storage.set("json_key", jsonValue);
			const retrieved = storage.get("json_key");
			expect(retrieved).toBe(jsonValue);
			expect(JSON.parse(retrieved as string)).toEqual({
				foo: "bar",
				count: 42,
			});
		});

		it("should handle empty string values", () => {
			storage.set("empty_key", "");
			expect(storage.get("empty_key")).toBe("");
		});

		it("should handle special characters in values", () => {
			const specialValue = "Hello, 世界! 🌍 <script>alert('xss')</script>";
			storage.set("special_key", specialValue);
			expect(storage.get("special_key")).toBe(specialValue);
		});

		it("should report correct storage type", () => {
			expect(storage.getStorageType()).toBe("localStorage");
		});
	});

	describe("SessionStorage Operations", () => {
		let storage: Storage;

		beforeEach(() => {
			mockLocalStorageUnavailable();
			mockSessionStorage();
			storage = new Storage();
		});

		it("should set and get values correctly", () => {
			storage.set("session_key", "session_value");
			expect(storage.get("session_key")).toBe("session_value");
		});

		it("should remove values correctly", () => {
			storage.set("session_key", "session_value");
			storage.remove("session_key");
			expect(storage.get("session_key")).toBeNull();
		});

		it("should report correct storage type", () => {
			expect(storage.getStorageType()).toBe("sessionStorage");
		});
	});

	describe("Cookie Storage Operations", () => {
		let storage: Storage;

		beforeEach(() => {
			mockLocalStorageUnavailable();
			mockSessionStorageUnavailable();
			Object.defineProperty(navigator, "cookieEnabled", {
				value: true,
				configurable: true,
			});
			storage = new Storage();
		});

		it("should set and get cookie values correctly", () => {
			storage.set("cookie_key", "cookie_value");
			expect(storage.get("cookie_key")).toBe("cookie_value");
		});

		it("should remove cookie values correctly", () => {
			storage.set("cookie_key", "cookie_value");
			storage.remove("cookie_key");
			expect(storage.get("cookie_key")).toBeNull();
		});

		it("should encode and decode special characters in cookies", () => {
			const specialValue = "hello=world&foo=bar";
			storage.set("encoded_key", specialValue);
			expect(storage.get("encoded_key")).toBe(specialValue);
		});

		it("should report storage type (cookie or memory fallback)", () => {
			const storageType = storage.getStorageType();
			expect(["cookie", "memory"]).toContain(storageType);
		});

		it("should support cookie domain when provided", () => {
			const domainStorage = new Storage(".example.com");
			expect(() => domainStorage.set("domain_key", "domain_value")).not.toThrow();
			expect(() => domainStorage.remove("domain_key")).not.toThrow();
		});
	});

	describe("Memory Storage Operations", () => {
		let storage: Storage;

		beforeEach(() => {
			mockLocalStorageUnavailable();
			mockSessionStorageUnavailable();
			Object.defineProperty(navigator, "cookieEnabled", {
				value: false,
				configurable: true,
			});
			storage = new Storage();
		});

		it("should set and get values correctly", () => {
			storage.set("memory_key", "memory_value");
			expect(storage.get("memory_key")).toBe("memory_value");
		});

		it("should remove values correctly", () => {
			storage.set("memory_key", "memory_value");
			storage.remove("memory_key");
			expect(storage.get("memory_key")).toBeNull();
		});

		it("should report correct storage type", () => {
			expect(storage.getStorageType()).toBe("memory");
		});

		it("should lose data between instances (simulating page refresh)", () => {
			storage.set("memory_key", "memory_value");
			const newStorage = new Storage();
			expect(newStorage.get("memory_key")).toBeNull();
		});
	});

	describe("Storage Fallback Chain", () => {
		it("should fall back to memory on quota exceeded error", () => {
			const mockStore = mockLocalStorage();

			let callCount = 0;
			vi.spyOn(mockStore, "setItem").mockImplementation((key, _value) => {
				callCount++;
				if (callCount > 1 && key !== "__tif_storage_test__") {
					const error = new Error("QuotaExceededError");
					error.name = "QuotaExceededError";
					throw error;
				}
			});

			const storage = new Storage();
			storage.set("key1", "value1");
			expect(storage.get("key1")).toBeNull();
		});

		it("should clear old data on quota exceeded error", () => {
			const mockStore = mockLocalStorage();
			const removeSpy = vi.spyOn(mockStore, "removeItem");
			const storage = new Storage();

			mockStore.setItem("tif_user_traits", "x".repeat(20000));

			// Access private helper for targeted coverage.
			(storage as unknown as { clearOldData: () => void }).clearOldData();

			const removedKeys = removeSpy.mock.calls.map((call) => call[0]);
			expect(removedKeys).toContain("tif_user_traits");
		});

		it("should handle NS_ERROR_DOM_QUOTA_REACHED gracefully", () => {
			const mockStore = mockLocalStorage();
			let callCount = 0;
			vi.spyOn(mockStore, "setItem").mockImplementation((key, _value) => {
				callCount++;
				if (callCount > 1 && key !== "__tif_storage_test__") {
					const error = new Error("NS_ERROR_DOM_QUOTA_REACHED");
					error.name = "NS_ERROR_DOM_QUOTA_REACHED";
					throw error;
				}
			});

			const storage = new Storage();
			expect(() => storage.set("quota_key", "value")).not.toThrow();
			expect(storage.get("quota_key")).toBeNull();
		});

		it("should handle quota errors based on message", () => {
			const mockStore = mockLocalStorage();
			let callCount = 0;
			vi.spyOn(mockStore, "setItem").mockImplementation((key, _value) => {
				callCount++;
				if (callCount > 1 && key !== "__tif_storage_test__") {
					throw new Error("quota exceeded");
				}
			});

			const storage = new Storage();
			expect(() => storage.set("quota_msg_key", "value")).not.toThrow();
			expect(storage.get("quota_msg_key")).toBeNull();
		});

		it("should handle storage access errors gracefully", () => {
			mockLocalStorage();
			const storage = new Storage();

			vi.spyOn(window.localStorage, "getItem").mockImplementation(() => {
				throw new Error("Access denied");
			});

			expect(storage.get("any_key")).toBeNull();
		});
	});

	describe("generateId", () => {
		it("should generate a valid UUID", () => {
			const id = generateId();
			expect(id).toMatch(
				/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
			);
		});

		it("should generate unique IDs", () => {
			const ids = new Set<string>();
			for (let i = 0; i < 100; i++) {
				ids.add(generateId());
			}
			expect(ids.size).toBe(100);
		});

		it("should generate UUID v7 format", () => {
			const id = generateId();
			expect(id.charAt(14)).toBe("7");
		});
	});

	describe("Edge Cases", () => {
		it("should handle very long values", () => {
			mockLocalStorage();
			const storage = new Storage();
			const longValue = "a".repeat(10000);
			storage.set("long_key", longValue);
			expect(storage.get("long_key")).toBe(longValue);
		});

		it("should handle unicode keys and values", () => {
			mockLocalStorage();
			const storage = new Storage();
			storage.set("日本語キー", "日本語の値 🎉");
			expect(storage.get("日本語キー")).toBe("日本語の値 🎉");
		});

		it("should handle keys with special characters", () => {
			mockLocalStorage();
			const storage = new Storage();
			storage.set("key.with.dots", "value1");
			storage.set("key-with-dashes", "value2");
			storage.set("key_with_underscores", "value3");
			expect(storage.get("key.with.dots")).toBe("value1");
			expect(storage.get("key-with-dashes")).toBe("value2");
			expect(storage.get("key_with_underscores")).toBe("value3");
		});

		it("should overwrite existing values", () => {
			mockLocalStorage();
			const storage = new Storage();
			storage.set("key", "value1");
			storage.set("key", "value2");
			expect(storage.get("key")).toBe("value2");
		});

		it("should handle removing non-existent keys gracefully", () => {
			mockLocalStorage();
			const storage = new Storage();
			expect(() => storage.remove("non_existent")).not.toThrow();
		});
	});
});
