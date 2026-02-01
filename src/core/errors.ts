import { createLogger, type Logger } from "./logger";
import type { Session } from "./session";
import type { ResolvedConfig } from "./types";

export interface Breadcrumb {
	type: "click" | "navigation" | "network" | "console" | "custom";
	message: string;
	timestamp: string;
	data?: Record<string, unknown>;
}

export interface ErrorPayload {
	message: string;
	stack?: string;
	type?: string;
	level?: "error" | "fatal" | "warning";
	fingerprint: string;
	url?: string;
	breadcrumbs?: Breadcrumb[];
	tags?: Record<string, string>;
	context?: Record<string, unknown>;
	timestamp?: string;
	anonymousId?: string;
	userId?: string;
	sessionId?: string;
}

export interface ErrorCaptureConfig {
	/** Enable error capture. Default: true */
	enabled?: boolean;
	/** Capture console.error calls as breadcrumbs. Default: false */
	captureConsoleErrors?: boolean;
	/** Capture fetch/XHR failures as breadcrumbs. Default: false */
	captureNetworkErrors?: boolean;
	/** Max breadcrumbs to retain. Default: 25 */
	maxBreadcrumbs?: number;
	/** Modify or filter errors before sending. Return null to discard. */
	beforeSend?: (payload: ErrorPayload) => ErrorPayload | null;
}

/**
 * Cyrb53 hash - a fast, high-quality 53-bit hash function.
 * Better distribution than FNV-1a, and we call it twice with
 * different seeds to get a 106-bit hash for lower collision probability.
 */
const cyrb53 = (str: string, seed = 0): number => {
	let h1 = 0xdeadbeef ^ seed;
	let h2 = 0x41c6ce57 ^ seed;
	for (let i = 0; i < str.length; i++) {
		const ch = str.charCodeAt(i);
		h1 = Math.imul(h1 ^ ch, 2654435761);
		h2 = Math.imul(h2 ^ ch, 1597334677);
	}
	h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
	h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
	h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
	h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
	return 4294967296 * (2097151 & h2) + (h1 >>> 0);
};

/**
 * Generate a 128-bit hash by running cyrb53 with two different seeds
 */
const hashString = (str: string): string => {
	const h1 = cyrb53(str, 0);
	const h2 = cyrb53(str, 1);

	return h1.toString(16).padStart(14, "0") + h2.toString(16).padStart(14, "0");
};

/**
 * Extract the top stack frame from a stack trace string
 */
const extractTopFrame = (stack: string | undefined): string => {
	if (!stack) return "";
	const lines = stack.split("\n").filter((l) => l.trim().startsWith("at "));
	return lines[0]?.trim() ?? "";
};

/**
 * Normalize error message for fingerprinting.
 * Removes dynamic values like IDs, timestamps, etc.
 */
const normalizeMessage = (message: string): string => {
	return message

		.replace(
			/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
			"<uuid>",
		)

		.replace(/\b\d{5,}\b/g, "<id>")

		.replace(/"[^"]*\d+[^"]*"/g, '"<dynamic>"')

		.replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/g, "<timestamp>")

		.replace(/\s+/g, " ")
		.trim();
};

/**
 * Generate a fingerprint for error grouping
 */
const generateFingerprint = (
	type: string | undefined,
	message: string,
	stack: string | undefined,
): string => {
	const topFrame = extractTopFrame(stack);
	const normalizedMessage = normalizeMessage(message);
	const input = `${type ?? "Error"}:${normalizedMessage}:${topFrame}`;
	return hashString(input);
};

/**
 * Truncate a string to a maximum length without allocating if not needed
 */
const truncate = (str: string, maxLen: number): string =>
	str.length > maxLen ? str.slice(0, maxLen) : str;

/**
 * Extract meaningful text from an element efficiently.
 * Avoids getting huge textContent from container elements.
 */
const getElementText = (el: HTMLElement, maxLen: number): string => {
	if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
		return truncate(el.value || el.placeholder || "", maxLen);
	}

	const ariaLabel = el.getAttribute("aria-label");
	if (ariaLabel) {
		return truncate(ariaLabel.trim(), maxLen);
	}

	if (el.childNodes.length <= 3) {
		let text = "";
		for (const node of el.childNodes) {
			if (node.nodeType === Node.TEXT_NODE) {
				text += node.textContent || "";
			}
		}
		text = text.trim();
		if (text) {
			return truncate(text, maxLen);
		}
	}

	if (
		el.tagName === "BUTTON" ||
		el.tagName === "A" ||
		el.getAttribute("role") === "button"
	) {
		const firstLine = el.innerText?.split("\n")[0]?.trim() ?? "";
		return truncate(firstLine, maxLen);
	}

	return "";
};

/**
 * Error capture module for the analytics SDK.
 *
 * Captures unhandled exceptions, unhandled promise rejections,
 * and records breadcrumbs (clicks, navigation, console, network).
 */
export class ErrorCapture {
	private config: ResolvedConfig;
	private errorConfig: Required<Omit<ErrorCaptureConfig, "beforeSend">> & {
		beforeSend?: ErrorCaptureConfig["beforeSend"];
	};
	private session: Session;
	private breadcrumbs: Breadcrumb[] = [];
	private installed = false;
	private logger: Logger;

	private originalOnError: OnErrorEventHandler | null = null;
	private originalConsoleError: ((...args: unknown[]) => void) | null = null;
	private originalFetch: typeof fetch | null = null;
	private unhandledRejectionHandler:
		| ((e: PromiseRejectionEvent) => void)
		| null = null;
	private clickHandler: ((e: MouseEvent) => void) | null = null;
	private lastClickTarget: EventTarget | null = null;
	private lastClickTime = 0;
	private originalPushState: typeof history.pushState | null = null;
	private originalReplaceState: typeof history.replaceState | null = null;
	private popstateHandler: (() => void) | null = null;

	constructor(
		config: ResolvedConfig,
		session: Session,
		errorConfig?: ErrorCaptureConfig,
	) {
		this.config = config;
		this.session = session;
		this.logger = createLogger("Errors", config.debug);
		this.errorConfig = {
			enabled: errorConfig?.enabled ?? true,
			captureConsoleErrors: errorConfig?.captureConsoleErrors ?? false,
			captureNetworkErrors: errorConfig?.captureNetworkErrors ?? false,
			maxBreadcrumbs: errorConfig?.maxBreadcrumbs ?? 25,
			beforeSend: errorConfig?.beforeSend,
		};
	}

	/**
	 * Install global error handlers and breadcrumb collectors
	 */
	install(): void {
		if (this.installed || typeof window === "undefined") return;
		if (!this.errorConfig.enabled) return;

		this.installErrorHandler();
		this.installUnhandledRejectionHandler();
		this.installClickBreadcrumbs();
		this.installNavigationBreadcrumbs();

		if (this.errorConfig.captureConsoleErrors) {
			this.installConsoleBreadcrumbs();
		}

		if (this.errorConfig.captureNetworkErrors) {
			this.installNetworkBreadcrumbs();
		}

		this.installed = true;
		this.logger.log("Error capture installed");
	}

	/**
	 * Remove all handlers and restore originals
	 */
	uninstall(): void {
		if (!this.installed || typeof window === "undefined") return;

		window.onerror = this.originalOnError;
		this.originalOnError = null;

		if (this.unhandledRejectionHandler) {
			window.removeEventListener(
				"unhandledrejection",
				this.unhandledRejectionHandler,
			);
			this.unhandledRejectionHandler = null;
		}

		if (this.clickHandler) {
			document.removeEventListener("click", this.clickHandler, true);
			this.clickHandler = null;
		}

		if (this.originalPushState) {
			history.pushState = this.originalPushState;
			this.originalPushState = null;
		}
		if (this.originalReplaceState) {
			history.replaceState = this.originalReplaceState;
			this.originalReplaceState = null;
		}
		if (this.popstateHandler) {
			window.removeEventListener("popstate", this.popstateHandler);
			this.popstateHandler = null;
		}

		if (this.originalConsoleError) {
			console.error = this.originalConsoleError;
			this.originalConsoleError = null;
		}

		if (this.originalFetch) {
			window.fetch = this.originalFetch;
			this.originalFetch = null;
		}

		this.installed = false;
		this.logger.log("Error capture uninstalled");
	}

	/**
	 * Add a breadcrumb manually
	 */
	addBreadcrumb(breadcrumb: Omit<Breadcrumb, "timestamp">): void {
		this.pushBreadcrumb({
			...breadcrumb,
			timestamp: new Date().toISOString(),
		});
	}

	/**
	 * Clear all breadcrumbs
	 */
	clearBreadcrumbs(): void {
		this.breadcrumbs = [];
	}

	/**
	 * Capture an exception and send it to the API
	 */
	captureException(error: Error, context?: Record<string, unknown>): void {
		const message = error.message || String(error);
		const stack = error.stack;
		const type = error.name || "Error";
		const fingerprint = generateFingerprint(type, message, stack);

		this.sendError({
			message,
			stack,
			type,
			level: "error",
			fingerprint,
			context,
		});
	}

	/**
	 * Capture a message as an error event
	 */
	captureMessage(
		message: string,
		level: "error" | "fatal" | "warning" = "error",
		context?: Record<string, unknown>,
	): void {
		const fingerprint = generateFingerprint(undefined, message, undefined);

		this.sendError({
			message,
			level,
			fingerprint,
			context,
		});
	}

	private installErrorHandler(): void {
		this.originalOnError = window.onerror;

		window.onerror = (
			message: string | Event,
			source?: string,
			lineno?: number,
			colno?: number,
			error?: Error,
		) => {
			if (error) {
				this.captureException(error);
			} else {
				const msg = typeof message === "string" ? message : "Unknown error";
				this.captureMessage(msg);
			}

			if (typeof this.originalOnError === "function") {
				return this.originalOnError.call(
					window,
					message,
					source,
					lineno,
					colno,
					error,
				);
			}
			return false;
		};
	}

	private installUnhandledRejectionHandler(): void {
		this.unhandledRejectionHandler = (event: PromiseRejectionEvent) => {
			const reason = event.reason;
			if (reason instanceof Error) {
				this.captureException(reason);
			} else {
				const message =
					typeof reason === "string" ? reason : "Unhandled promise rejection";
				this.captureMessage(message);
			}
		};

		window.addEventListener(
			"unhandledrejection",
			this.unhandledRejectionHandler,
		);
	}

	private installClickBreadcrumbs(): void {
		this.clickHandler = (event: MouseEvent) => {
			const target = event.target as HTMLElement | null;
			if (!target) return;

			const now = Date.now();
			if (target === this.lastClickTarget && now - this.lastClickTime < 100) {
				return;
			}
			this.lastClickTarget = target;
			this.lastClickTime = now;

			const tag = target.tagName?.toLowerCase() ?? "unknown";
			const id = target.id ? `#${target.id}` : "";
			const text = getElementText(target, 50);
			const message = `${tag}${id}${text ? ` "${text}"` : ""}`;

			this.pushBreadcrumb({
				type: "click",
				message,
				timestamp: new Date().toISOString(),
				data: {
					tagName: tag,
					id: target.id || undefined,
					className:
						typeof target.className === "string"
							? truncate(target.className, 100)
							: undefined,
				},
			});
		};

		document.addEventListener("click", this.clickHandler, true);
	}

	private installNavigationBreadcrumbs(): void {
		const addNavBreadcrumb = (url: string) => {
			this.pushBreadcrumb({
				type: "navigation",
				message: url,
				timestamp: new Date().toISOString(),
			});
		};

		this.originalPushState = history.pushState.bind(history);
		history.pushState = (...args: Parameters<typeof history.pushState>) => {
			this.originalPushState?.(...args);
			addNavBreadcrumb(window.location.href);
		};

		this.originalReplaceState = history.replaceState.bind(history);
		history.replaceState = (
			...args: Parameters<typeof history.replaceState>
		) => {
			this.originalReplaceState?.(...args);
			addNavBreadcrumb(window.location.href);
		};

		this.popstateHandler = () => {
			addNavBreadcrumb(window.location.href);
		};
		window.addEventListener("popstate", this.popstateHandler);
	}

	private installConsoleBreadcrumbs(): void {
		this.originalConsoleError = console.error.bind(console);

		console.error = (...args: unknown[]) => {
			this.pushBreadcrumb({
				type: "console",
				message: args.map((a) => String(a)).join(" "),
				timestamp: new Date().toISOString(),
			});
			this.originalConsoleError?.(...args);
		};
	}

	private installNetworkBreadcrumbs(): void {
		this.originalFetch = window.fetch.bind(window);

		window.fetch = async (
			input: RequestInfo | URL,
			init?: RequestInit,
		): Promise<Response> => {
			const url =
				typeof input === "string"
					? input
					: input instanceof URL
						? input.toString()
						: input.url;
			const method = init?.method ?? "GET";

			try {
				if (!this.originalFetch) {
					throw new Error("originalFetch is not available");
				}
				const response = await this.originalFetch(input, init);

				if (!response.ok) {
					this.pushBreadcrumb({
						type: "network",
						message: `${method} ${url} → ${response.status}`,
						timestamp: new Date().toISOString(),
						data: { method, url, status: response.status },
					});
				}

				return response;
			} catch (error) {
				this.pushBreadcrumb({
					type: "network",
					message: `${method} ${url} → failed`,
					timestamp: new Date().toISOString(),
					data: {
						method,
						url,
						error: error instanceof Error ? error.message : "Unknown",
					},
				});
				throw error;
			}
		};
	}

	private pushBreadcrumb(breadcrumb: Breadcrumb): void {
		this.breadcrumbs.push(breadcrumb);
		if (this.breadcrumbs.length > this.errorConfig.maxBreadcrumbs) {
			this.breadcrumbs.shift();
		}
	}

	private sendError(
		partial: Omit<
			ErrorPayload,
			"url" | "breadcrumbs" | "anonymousId" | "userId" | "sessionId"
		> & {
			context?: Record<string, unknown>;
		},
	): void {
		const payload: ErrorPayload = {
			...partial,
			url: typeof window !== "undefined" ? window.location.href : undefined,
			breadcrumbs: [...this.breadcrumbs],
			anonymousId: this.session.getAnonymousId(),
			userId: this.session.getUserId(),
			sessionId: this.session.getSessionId(),
			timestamp: new Date().toISOString(),
		};

		const finalPayload = this.errorConfig.beforeSend
			? this.errorConfig.beforeSend(payload)
			: payload;

		if (!finalPayload) {
			this.logger.log("Error discarded by beforeSend");
			return;
		}

		this.postError(finalPayload);
	}

	private async postError(payload: ErrorPayload): Promise<void> {
		const url = `${this.config.host}/api/v1/error`;

		for (let attempt = 0; attempt < 2; attempt++) {
			try {
				const response = await fetch(url, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"X-API-Key": this.config.apiKey,
					},
					body: JSON.stringify(payload),
				});

				if (response.ok) {
					this.logger.log("Error sent:", payload.message);
					return;
				}

				if (
					response.status >= 400 &&
					response.status < 500 &&
					response.status !== 429
				) {
					this.logger.log("Error rejected (client error):", response.status);
					return;
				}
			} catch {
				this.logger.log("Error send failed, attempt", attempt + 1);
			}

			if (attempt === 0) {
				await new Promise((r) => setTimeout(r, 1000));
			}
		}
	}
}
