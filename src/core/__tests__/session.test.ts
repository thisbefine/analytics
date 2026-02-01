import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isValidUuidV7, MockStorage, mockConsole } from "../../test-utils";
import { Session } from "../session";
import { STORAGE_KEYS } from "../types";

describe("Session", () => {
	let storage: MockStorage;
	let session: Session;

	beforeEach(() => {
		storage = new MockStorage();
		vi.useFakeTimers();
	});

	afterEach(() => {
		session?.destroy();
		vi.useRealTimers();
	});

	describe("Anonymous ID", () => {
		it("should generate a new anonymous ID if none exists", () => {
			session = new Session(storage, 1800000);
			const anonymousId = session.getAnonymousId();

			expect(anonymousId).toBeDefined();
			expect(typeof anonymousId).toBe("string");
			expect(anonymousId.length).toBeGreaterThan(0);
		});

		it("should generate a valid UUID v7 format", () => {
			session = new Session(storage, 1800000);
			const anonymousId = session.getAnonymousId();

			expect(isValidUuidV7(anonymousId)).toBe(true);
		});

		it("should persist anonymous ID across calls", () => {
			session = new Session(storage, 1800000);
			const id1 = session.getAnonymousId();
			const id2 = session.getAnonymousId();

			expect(id1).toBe(id2);
		});

		it("should persist anonymous ID in storage", () => {
			session = new Session(storage, 1800000);
			const anonymousId = session.getAnonymousId();

			expect(storage.getItem(STORAGE_KEYS.ANONYMOUS_ID)).toBe(anonymousId);
		});

		it("should load existing anonymous ID from storage", () => {
			const existingId = "existing-anonymous-id-123";
			storage.setItem(STORAGE_KEYS.ANONYMOUS_ID, existingId);

			session = new Session(storage, 1800000);
			expect(session.getAnonymousId()).toBe(existingId);
		});

		it("should generate new anonymous ID on reset", () => {
			session = new Session(storage, 1800000);
			const originalId = session.getAnonymousId();

			session.reset();
			const newId = session.getAnonymousId();

			expect(newId).not.toBe(originalId);
		});
	});

	describe("User ID", () => {
		beforeEach(() => {
			session = new Session(storage, 1800000);
		});

		it("should return undefined when no user ID is set", () => {
			expect(session.getUserId()).toBeUndefined();
		});

		it("should set and retrieve user ID", () => {
			session.setUserId("user_123");
			expect(session.getUserId()).toBe("user_123");
		});

		it("should persist user ID in storage", () => {
			session.setUserId("user_123");
			expect(storage.getItem(STORAGE_KEYS.USER_ID)).toBe("user_123");
		});

		it("should load existing user ID from storage", () => {
			storage.setItem(STORAGE_KEYS.USER_ID, "existing_user");
			session = new Session(storage, 1800000);
			expect(session.getUserId()).toBe("existing_user");
		});

		it("should clear user ID on reset", () => {
			session.setUserId("user_123");
			session.reset();
			expect(session.getUserId()).toBeUndefined();
		});

		it("should overwrite existing user ID", () => {
			session.setUserId("user_123");
			session.setUserId("user_456");
			expect(session.getUserId()).toBe("user_456");
		});
	});

	describe("User Traits", () => {
		beforeEach(() => {
			session = new Session(storage, 1800000);
		});

		it("should return undefined when no traits are set", () => {
			expect(session.getUserTraits()).toBeUndefined();
		});

		it("should set and retrieve user traits", () => {
			session.setUserTraits({ email: "test@example.com", name: "Test User" });
			expect(session.getUserTraits()).toEqual({
				email: "test@example.com",
				name: "Test User",
			});
		});

		it("should merge new traits with existing traits", () => {
			session.setUserTraits({ email: "test@example.com" });
			session.setUserTraits({ name: "Test User" });

			expect(session.getUserTraits()).toEqual({
				email: "test@example.com",
				name: "Test User",
			});
		});

		it("should overwrite existing trait values", () => {
			session.setUserTraits({ email: "old@example.com" });
			session.setUserTraits({ email: "new@example.com" });

			expect(session.getUserTraits()?.email).toBe("new@example.com");
		});

		it("should persist traits in storage as JSON", () => {
			session.setUserTraits({ email: "test@example.com" });
			const stored = storage.getItem(STORAGE_KEYS.USER_TRAITS);
			expect(stored).not.toBeNull();
			expect(JSON.parse(stored as string)).toEqual({
				email: "test@example.com",
			});
		});

		it("should handle JSON parse errors gracefully", () => {
			storage.setItem(STORAGE_KEYS.USER_TRAITS, "invalid json {{{");
			session = new Session(storage, 1800000);
			expect(session.getUserTraits()).toBeUndefined();
		});

		it("should clear traits on reset", () => {
			session.setUserTraits({ email: "test@example.com" });
			session.reset();
			expect(session.getUserTraits()).toBeUndefined();
		});
	});

	describe("Account ID & Traits", () => {
		beforeEach(() => {
			session = new Session(storage, 1800000);
		});

		it("should return undefined when no account ID is set", () => {
			expect(session.getAccountId()).toBeUndefined();
		});

		it("should set and retrieve account ID", () => {
			session.setAccountId("account_123");
			expect(session.getAccountId()).toBe("account_123");
		});

		it("should persist account ID in storage", () => {
			session.setAccountId("account_123");
			expect(storage.getItem(STORAGE_KEYS.ACCOUNT_ID)).toBe("account_123");
		});

		it("should return undefined when no account traits are set", () => {
			expect(session.getAccountTraits()).toBeUndefined();
		});

		it("should set and retrieve account traits", () => {
			session.setAccountTraits({ name: "Acme Inc", plan: "enterprise" });
			expect(session.getAccountTraits()).toEqual({
				name: "Acme Inc",
				plan: "enterprise",
			});
		});

		it("should merge new account traits with existing", () => {
			session.setAccountTraits({ name: "Acme Inc" });
			session.setAccountTraits({ plan: "enterprise" });

			expect(session.getAccountTraits()).toEqual({
				name: "Acme Inc",
				plan: "enterprise",
			});
		});

		it("should clear account ID and traits on reset", () => {
			session.setAccountId("account_123");
			session.setAccountTraits({ name: "Acme Inc" });
			session.reset();

			expect(session.getAccountId()).toBeUndefined();
			expect(session.getAccountTraits()).toBeUndefined();
		});

		it("should handle JSON parse errors for account traits gracefully", () => {
			storage.setItem(STORAGE_KEYS.ACCOUNT_TRAITS, "not valid json");
			session = new Session(storage, 1800000);
			expect(session.getAccountTraits()).toBeUndefined();
		});
	});

	describe("Session ID", () => {
		it("should generate a new session ID on first access", () => {
			session = new Session(storage, 1800000);
			const sessionId = session.getSessionId();

			expect(sessionId).toBeDefined();
			expect(isValidUuidV7(sessionId)).toBe(true);
		});

		it("should persist session ID within timeout period", () => {
			session = new Session(storage, 1800000);
			const id1 = session.getSessionId();

			vi.advanceTimersByTime(10 * 60 * 1000);

			const id2 = session.getSessionId();
			expect(id1).toBe(id2);
		});

		it("should regenerate session ID after timeout", () => {
			session = new Session(storage, 1800000);
			const originalId = session.getSessionId();

			vi.advanceTimersByTime(31 * 60 * 1000);

			const newId = session.getSessionId();
			expect(newId).not.toBe(originalId);
		});

		it("should respect custom session timeout", () => {
			const customTimeout = 5 * 60 * 1000;
			session = new Session(storage, customTimeout);
			const originalId = session.getSessionId();

			vi.advanceTimersByTime(6 * 60 * 1000);

			expect(session.getSessionId()).not.toBe(originalId);
		});

		it("should update lastActivity on ensureSession", () => {
			session = new Session(storage, 1800000);
			session.getSessionId();

			const firstActivity = storage.getItem(STORAGE_KEYS.LAST_ACTIVITY);

			vi.advanceTimersByTime(1000);
			session.getSessionId();

			const secondActivity = storage.getItem(STORAGE_KEYS.LAST_ACTIVITY);
			expect(Number(secondActivity)).toBeGreaterThan(Number(firstActivity));
		});

		it("should generate new session ID on reset", () => {
			session = new Session(storage, 1800000);
			const originalId = session.getSessionId();

			session.reset();
			const newId = session.getSessionId();

			expect(newId).not.toBe(originalId);
		});
	});

	describe("updateLastActivity", () => {
		it("should update the last activity timestamp", () => {
			session = new Session(storage, 1800000);
			const before = Date.now();

			session.updateLastActivity();

			const stored = storage.getItem(STORAGE_KEYS.LAST_ACTIVITY);
			expect(Number(stored)).toBeGreaterThanOrEqual(before);
		});

		it("should keep session alive when called within timeout", () => {
			session = new Session(storage, 1800000);
			const originalId = session.getSessionId();

			vi.advanceTimersByTime(20 * 60 * 1000);
			session.updateLastActivity();

			vi.advanceTimersByTime(20 * 60 * 1000);

			expect(session.getSessionId()).toBe(originalId);
		});
	});

	describe("getUserState", () => {
		beforeEach(() => {
			session = new Session(storage, 1800000);
		});

		it("should return complete user state snapshot", () => {
			const state = session.getUserState();

			expect(state).toHaveProperty("anonymousId");
			expect(state.anonymousId).toBeDefined();
		});

		it("should include all IDs and traits when set", () => {
			session.setUserId("user_123");
			session.setUserTraits({ email: "test@example.com" });
			session.setAccountId("account_456");
			session.setAccountTraits({ name: "Acme" });

			const state = session.getUserState();

			expect(state.anonymousId).toBeDefined();
			expect(state.userId).toBe("user_123");
			expect(state.traits).toEqual({ email: "test@example.com" });
			expect(state.accountId).toBe("account_456");
			expect(state.accountTraits).toEqual({ name: "Acme" });
		});

		it("should return undefined for unset values", () => {
			const state = session.getUserState();

			expect(state.anonymousId).toBeDefined();
			expect(state.userId).toBeUndefined();
			expect(state.traits).toBeUndefined();
			expect(state.accountId).toBeUndefined();
			expect(state.accountTraits).toBeUndefined();
		});
	});

	describe("reset", () => {
		it("should clear all user and account data", () => {
			session = new Session(storage, 1800000);
			session.setUserId("user_123");
			session.setUserTraits({ email: "test@example.com" });
			session.setAccountId("account_456");
			session.setAccountTraits({ name: "Acme" });

			session.reset();

			expect(session.getUserId()).toBeUndefined();
			expect(session.getUserTraits()).toBeUndefined();
			expect(session.getAccountId()).toBeUndefined();
			expect(session.getAccountTraits()).toBeUndefined();
		});

		it("should generate new anonymous ID", () => {
			session = new Session(storage, 1800000);
			const originalAnonymousId = session.getAnonymousId();

			session.reset();

			expect(session.getAnonymousId()).not.toBe(originalAnonymousId);
		});

		it("should generate new session ID", () => {
			session = new Session(storage, 1800000);
			const originalSessionId = session.getSessionId();

			session.reset();

			expect(session.getSessionId()).not.toBe(originalSessionId);
		});

		it("should log in debug mode", () => {
			const consoleSpy = mockConsole();
			session = new Session(storage, 1800000, true);

			session.reset();

			expect(consoleSpy.log).toHaveBeenCalledWith(
				expect.stringContaining("[Thisbefine Session]"),
				expect.stringContaining("Session reset. New anonymous ID:"),
				expect.any(String),
			);
		});
	});

	describe("Debug Logging", () => {
		it("should log when generating new anonymous ID in debug mode", () => {
			const consoleSpy = mockConsole();
			session = new Session(storage, 1800000, true);

			session.getAnonymousId();

			const hasAnonymousIdLog = consoleSpy.log.mock.calls.some(
				(call) =>
					call[0]?.includes?.("[Thisbefine Session]") &&
					call[1]?.includes?.("Generated new anonymous ID"),
			);
			expect(hasAnonymousIdLog).toBe(true);
		});

		it("should log when setting user ID in debug mode", () => {
			const consoleSpy = mockConsole();
			session = new Session(storage, 1800000, true);

			session.setUserId("user_123");

			expect(consoleSpy.log).toHaveBeenCalledWith(
				expect.stringContaining("[Thisbefine Session]"),
				"User ID set:",
				"user_123",
			);
		});

		it("should log session expiration in debug mode", () => {
			const consoleSpy = mockConsole();

			const now = Date.now();
			storage.set(STORAGE_KEYS.LAST_ACTIVITY, now.toString());
			storage.set(STORAGE_KEYS.SESSION_ID, "old-session-id");

			session = new Session(storage, 1800000, true);

			vi.advanceTimersByTime(31 * 60 * 1000);
			session.getSessionId();

			const hasExpiredLog = consoleSpy.log.mock.calls.some(
				(call) =>
					call[0]?.includes?.("[Thisbefine Session]") &&
					call[1]?.includes?.("Session expired"),
			);
			expect(hasExpiredLog).toBe(true);
		});

		it("should not log in non-debug mode", () => {
			const consoleSpy = mockConsole();
			session = new Session(storage, 1800000, false);

			session.getAnonymousId();
			session.setUserId("user_123");

			const hasSessionLogs = consoleSpy.log.mock.calls.some((call) =>
				call[0]?.includes?.("[Thisbefine Session]"),
			);
			expect(hasSessionLogs).toBe(false);
		});
	});

	describe("Cleanup", () => {
		it("should close broadcast channel on destroy", () => {
			session = new Session(storage, 1800000);

			expect(() => session.destroy()).not.toThrow();
		});

		it("should handle multiple destroy calls gracefully", () => {
			session = new Session(storage, 1800000);

			session.destroy();
			expect(() => session.destroy()).not.toThrow();
		});
	});
});
