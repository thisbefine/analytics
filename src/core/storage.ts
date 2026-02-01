import { v7 as uuidv7 } from "uuid";
import type { StorageInterface } from "./types";

/**
 * Storage implementation with fallback chain:
 * 1. localStorage (persists across sessions)
 * 2. sessionStorage (per-tab)
 * 3. Cookie (cross-subdomain support, 365 day expiry)
 * 4. Memory (final fallback, lost on refresh)
 */
export class Storage implements StorageInterface {
	private memoryStorage: Map<string, string> = new Map();
	private storageType: "localStorage" | "sessionStorage" | "cookie" | "memory";
	private cookieDomain?: string;

	constructor(cookieDomain?: string) {
		this.cookieDomain = cookieDomain;
		this.storageType = this.detectStorageType();
	}

	/**
	 * Detect the best available storage mechanism
	 */
	private detectStorageType():
		| "localStorage"
		| "sessionStorage"
		| "cookie"
		| "memory" {
		if (this.isLocalStorageAvailable()) {
			return "localStorage";
		}

		if (this.isSessionStorageAvailable()) {
			return "sessionStorage";
		}

		if (this.areCookiesAvailable()) {
			return "cookie";
		}

		return "memory";
	}

	/**
	 * Check if localStorage is available
	 */
	private isLocalStorageAvailable(): boolean {
		if (typeof window === "undefined") return false;

		try {
			const testKey = "__tif_storage_test__";
			window.localStorage.setItem(testKey, testKey);
			window.localStorage.removeItem(testKey);
			return true;
		} catch {
			return false;
		}
	}

	/**
	 * Check if sessionStorage is available
	 */
	private isSessionStorageAvailable(): boolean {
		if (typeof window === "undefined") return false;

		try {
			const testKey = "__tif_storage_test__";
			window.sessionStorage.setItem(testKey, testKey);
			window.sessionStorage.removeItem(testKey);
			return true;
		} catch {
			return false;
		}
	}

	/**
	 * Check if cookies are available and can be set with expiry
	 */
	private areCookiesAvailable(): boolean {
		if (typeof document === "undefined") return false;
		if (typeof navigator !== "undefined" && !navigator.cookieEnabled) {
			return false;
		}

		try {
			const testKey = "__tif_cookie_test__";
			const testValue = "1";
			const expires = new Date(Date.now() + 60000).toUTCString();
			// biome-ignore lint/suspicious/noDocumentCookie: Cookie storage requires direct cookie access
			document.cookie = `${testKey}=${testValue}; expires=${expires}; path=/; SameSite=Lax`;
			const result = document.cookie.includes(`${testKey}=${testValue}`);

			// biome-ignore lint/suspicious/noDocumentCookie: Cookie storage requires direct cookie access
			document.cookie = `${testKey}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/`;
			return result;
		} catch {
			return false;
		}
	}

	/**
	 * Get a value from storage
	 */
	get(key: string): string | null {
		try {
			switch (this.storageType) {
				case "localStorage":
					return window.localStorage.getItem(key);

				case "sessionStorage":
					return window.sessionStorage.getItem(key);

				case "cookie":
					return this.getCookie(key);

				case "memory":
					return this.memoryStorage.get(key) ?? null;
			}
		} catch {
			return this.memoryStorage.get(key) ?? null;
		}
	}

	/**
	 * Set a value in storage
	 */
	set(key: string, value: string): void {
		try {
			switch (this.storageType) {
				case "localStorage":
					window.localStorage.setItem(key, value);
					break;

				case "sessionStorage":
					window.sessionStorage.setItem(key, value);
					break;

				case "cookie":
					this.setCookie(key, value);
					break;

				case "memory":
					this.memoryStorage.set(key, value);
					break;
			}
		} catch (error) {
			if (
				error instanceof Error &&
				(error.name === "QuotaExceededError" ||
					error.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
					error.message.includes("quota"))
			) {
				this.clearOldData();
				try {
					switch (this.storageType) {
						case "localStorage":
							window.localStorage.setItem(key, value);
							return;
						case "sessionStorage":
							window.sessionStorage.setItem(key, value);
							return;
					}
				} catch {}
			}

			this.memoryStorage.set(key, value);
		}
	}

	/**
	 * Clear old analytics data to free up quota
	 */
	private clearOldData(): void {
		const storage =
			this.storageType === "localStorage"
				? window.localStorage
				: this.storageType === "sessionStorage"
					? window.sessionStorage
					: null;

		if (!storage) return;

		const keysToCheck = ["tif_user_traits", "tif_account_traits"];
		for (const key of keysToCheck) {
			try {
				const value = storage.getItem(key);

				if (value && value.length > 10000) {
					storage.removeItem(key);
				}
			} catch {}
		}
	}

	/**
	 * Remove a value from storage
	 */
	remove(key: string): void {
		this.memoryStorage.delete(key);

		try {
			switch (this.storageType) {
				case "localStorage":
					window.localStorage.removeItem(key);
					break;

				case "sessionStorage":
					window.sessionStorage.removeItem(key);
					break;

				case "cookie":
					this.deleteCookie(key);
					break;

				case "memory":
					break;
			}
		} catch {}
	}

	/**
	 * Get a cookie value
	 */
	private getCookie(name: string): string | null {
		if (typeof document === "undefined") return null;

		const cookies = document.cookie.split(";");
		for (const cookie of cookies) {
			const [cookieName, cookieValue] = cookie.split("=").map((c) => c.trim());
			if (cookieName === name) {
				return decodeURIComponent(cookieValue);
			}
		}
		return null;
	}

	/**
	 * Set a cookie value (365 day expiry)
	 */
	private setCookie(name: string, value: string): void {
		if (typeof document === "undefined") return;

		const expires = new Date();
		expires.setTime(expires.getTime() + 365 * 24 * 60 * 60 * 1000);

		let cookie = `${name}=${encodeURIComponent(value)}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;

		if (this.cookieDomain) {
			cookie += `; domain=${this.cookieDomain}`;
		}

		// biome-ignore lint/suspicious/noDocumentCookie: Cookie storage requires direct cookie access
		document.cookie = cookie;
	}

	/**
	 * Delete a cookie
	 */
	private deleteCookie(name: string): void {
		if (typeof document === "undefined") return;

		let cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/`;

		if (this.cookieDomain) {
			cookie += `; domain=${this.cookieDomain}`;
		}

		// biome-ignore lint/suspicious/noDocumentCookie: Cookie storage requires direct cookie access
		document.cookie = cookie;
	}

	/**
	 * Get the current storage type being used
	 */
	getStorageType(): string {
		return this.storageType;
	}
}

export const generateId = (): string => uuidv7();
