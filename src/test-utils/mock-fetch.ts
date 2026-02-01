import { vi } from "vitest";

export interface MockResponse {
	status?: number;
	ok?: boolean;
	statusText?: string;
	body?: unknown;
	headers?: Record<string, string>;
}

export interface FetchCall {
	url: string;
	options?: RequestInit;
}

let fetchCalls: FetchCall[] = [];
let mockResponses: MockResponse[] = [];
let defaultResponse: MockResponse = { status: 200, ok: true };
let shouldThrow = false;
let throwError: Error | null = null;

/**
 * Reset fetch mock state
 */
export function resetFetchMock(): void {
	fetchCalls = [];
	mockResponses = [];
	defaultResponse = { status: 200, ok: true };
	shouldThrow = false;
	throwError = null;
}

/**
 * Create a mock Response object
 */
function createMockResponse(config: MockResponse): Response {
	const {
		status = 200,
		ok = status >= 200 && status < 300,
		statusText = "OK",
		body = {},
		headers = {},
	} = config;

	return {
		ok,
		status,
		statusText,
		headers: new Headers(headers),
		json: () => Promise.resolve(body),
		text: () =>
			Promise.resolve(typeof body === "string" ? body : JSON.stringify(body)),
		blob: () => Promise.resolve(new Blob([JSON.stringify(body)])),
		arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
		formData: () => Promise.resolve(new FormData()),
		clone: function () {
			return this;
		},
		body: null,
		bodyUsed: false,
		redirected: false,
		type: "basic" as ResponseType,
		url: "",
		bytes: () => Promise.resolve(new Uint8Array()),
	} as Response;
}

/**
 * Mock fetch globally
 */
export function mockFetch(response?: MockResponse): void {
	if (response) {
		defaultResponse = response;
	}

	globalThis.fetch = vi.fn(
		async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
			const url =
				typeof input === "string"
					? input
					: input instanceof URL
						? input.toString()
						: input.url;
			fetchCalls.push({ url, options: init });

			if (shouldThrow && throwError) {
				throw throwError;
			}

			const responseConfig = mockResponses.shift() ?? defaultResponse;
			return createMockResponse(responseConfig);
		},
	);
}

/**
 * Mock fetch to throw an error
 */
export function mockFetchError(error: Error): void {
	shouldThrow = true;
	throwError = error;
	mockFetch();
}

/**
 * Mock fetch to return a sequence of responses
 */
export function mockFetchSequence(responses: MockResponse[]): void {
	mockResponses = [...responses];
	mockFetch();
}

/**
 * Get the last fetch call
 */
export function getLastFetchCall(): FetchCall | undefined {
	return fetchCalls[fetchCalls.length - 1];
}

/**
 * Get all fetch calls
 */
export function getAllFetchCalls(): FetchCall[] {
	return [...fetchCalls];
}

/**
 * Get fetch call count
 */
export function getFetchCallCount(): number {
	return fetchCalls.length;
}

/**
 * Clear fetch call history
 */
export function clearFetchCalls(): void {
	fetchCalls = [];
}

/**
 * Mock fetch to return specific status codes in sequence
 */
export function mockFetchWithStatuses(statuses: number[]): void {
	mockFetchSequence(
		statuses.map((status) => ({
			status,
			ok: status >= 200 && status < 300,
			statusText:
				status === 429
					? "Too Many Requests"
					: status >= 500
						? "Internal Server Error"
						: "OK",
		})),
	);
}

/**
 * Mock sendBeacon
 */
export function mockSendBeacon(success = true): ReturnType<typeof vi.fn> {
	const spy = vi.fn(() => success);
	Object.defineProperty(navigator, "sendBeacon", {
		value: spy,
		writable: true,
		configurable: true,
	});
	return spy;
}
