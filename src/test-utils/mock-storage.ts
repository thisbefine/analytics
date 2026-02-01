import { vi } from "vitest";
import type { StorageInterface } from "../core/types";

/**
 * Mock Storage implementation for testing
 * Implements both Web Storage API and SDK's StorageInterface
 */
export class MockStorage implements Storage, StorageInterface {
	private store: Map<string, string> = new Map();

	get length(): number {
		return this.store.size;
	}

	clear(): void {
		this.store.clear();
		this._length = 0;
	}

	getItem(key: string): string | null {
		return this.store.get(key) ?? null;
	}

	key(index: number): string | null {
		const keys = Array.from(this.store.keys());
		return keys[index] ?? null;
	}

	removeItem(key: string): void {
		this.store.delete(key);
	}

	setItem(key: string, value: string): void {
		this.store.set(key, value);
	}

	get(key: string): string | null {
		return this.getItem(key);
	}

	set(key: string, value: string): void {
		this.setItem(key, value);
	}

	remove(key: string): void {
		this.removeItem(key);
	}

	keys(): string[] {
		return Array.from(this.store.keys());
	}

	values(): string[] {
		return Array.from(this.store.values());
	}

	size(): number {
		return this.store.size;
	}

	getStorageType(): string {
		return "memory";
	}
}

/**
 * Create a mock storage that throws on access (simulating unavailable storage)
 */
export class ThrowingStorage implements Storage, StorageInterface {
	get length(): number {
		throw new Error("Storage unavailable");
	}

	clear(): void {
		throw new Error("Storage unavailable");
	}

	getItem(_key: string): string | null {
		throw new Error("Storage unavailable");
	}

	key(_index: number): string | null {
		throw new Error("Storage unavailable");
	}

	removeItem(_key: string): void {
		throw new Error("Storage unavailable");
	}

	setItem(_key: string, _value: string): void {
		throw new Error("Storage unavailable");
	}

	get(_key: string): string | null {
		throw new Error("Storage unavailable");
	}

	set(_key: string, _value: string): void {
		throw new Error("Storage unavailable");
	}

	remove(_key: string): void {
		throw new Error("Storage unavailable");
	}

	getStorageType(): string {
		return "memory";
	}
}

/**
 * Create a mock storage that throws quota exceeded on setItem/set
 */
export class QuotaExceededStorage extends MockStorage {
	setItem(_key: string, _value: string): void {
		const error = new Error("QuotaExceededError");
		error.name = "QuotaExceededError";
		throw error;
	}

	set(_key: string, _value: string): void {
		const error = new Error("QuotaExceededError");
		error.name = "QuotaExceededError";
		throw error;
	}
}

/**
 * Install mock localStorage
 */
export function mockLocalStorage(storage?: Storage): MockStorage {
	const mockStorage = storage ?? new MockStorage();
	Object.defineProperty(window, "localStorage", {
		value: mockStorage,
		writable: true,
		configurable: true,
	});
	return mockStorage as MockStorage;
}

/**
 * Install mock sessionStorage
 */
export function mockSessionStorage(storage?: Storage): MockStorage {
	const mockStorage = storage ?? new MockStorage();
	Object.defineProperty(window, "sessionStorage", {
		value: mockStorage,
		writable: true,
		configurable: true,
	});
	return mockStorage as MockStorage;
}

/**
 * Make localStorage unavailable (throws on access)
 */
export function mockLocalStorageUnavailable(): void {
	Object.defineProperty(window, "localStorage", {
		get() {
			throw new Error("localStorage is not available");
		},
		configurable: true,
	});
}

/**
 * Make sessionStorage unavailable (throws on access)
 */
export function mockSessionStorageUnavailable(): void {
	Object.defineProperty(window, "sessionStorage", {
		get() {
			throw new Error("sessionStorage is not available");
		},
		configurable: true,
	});
}

/**
 * Clear all storage mechanisms
 */
export function clearAllStorage(): void {
	try {
		localStorage.clear();
	} catch {}
	try {
		sessionStorage.clear();
	} catch {}
	document.cookie.split(";").forEach((c) => {
		// biome-ignore lint/suspicious/noDocumentCookie: Test cleanup requires direct cookie access
		document.cookie = c
			.replace(/^ +/, "")
			.replace(/=.*/, `=;expires=${new Date().toUTCString()};path=/`);
	});
}

/**
 * Create a spy on storage methods
 */
export function spyOnStorage(storage: Storage) {
	return {
		getItem: vi.spyOn(storage, "getItem"),
		setItem: vi.spyOn(storage, "setItem"),
		removeItem: vi.spyOn(storage, "removeItem"),
		clear: vi.spyOn(storage, "clear"),
	};
}
