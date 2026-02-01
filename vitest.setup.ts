import { afterEach, beforeEach, vi } from "vitest";
import "@testing-library/jest-dom/vitest";

beforeEach(() => {
	vi.clearAllMocks();
	vi.useFakeTimers({ shouldAdvanceTime: true });

	try {
		if (typeof localStorage !== "undefined" && localStorage?.clear) {
			localStorage.clear();
		}
	} catch {}

	try {
		if (typeof sessionStorage !== "undefined" && sessionStorage?.clear) {
			sessionStorage.clear();
		}
	} catch {}

	try {
		if (typeof document !== "undefined" && document?.cookie) {
			document.cookie.split(";").forEach((c) => {
				// biome-ignore lint/suspicious/noDocumentCookie: Test cleanup requires direct cookie access
				document.cookie = c
					.replace(/^ +/, "")
					.replace(/=.*/, `=;expires=${new Date().toUTCString()};path=/`);
			});
		}
	} catch {}
});

afterEach(() => {
	vi.useRealTimers();
	vi.restoreAllMocks();
});

if (typeof BroadcastChannel === "undefined") {
	class MockBroadcastChannel {
		name: string;
		onmessage: ((event: MessageEvent) => void) | null = null;

		constructor(name: string) {
			this.name = name;
		}

		postMessage(_message: unknown): void {}

		close(): void {}
	}

	globalThis.BroadcastChannel =
		MockBroadcastChannel as unknown as typeof BroadcastChannel;
}
