import { createLogger, type Logger } from "./logger";
import { generateId } from "./storage";
import type {
	AccountTraits,
	StorageInterface,
	UserState,
	UserTraits,
} from "./types";
import { STORAGE_KEYS } from "./types";

const BROADCAST_CHANNEL_NAME = "thisbefine_session";

interface SessionMessage {
	type: "reset" | "identify" | "sync_request" | "sync_response";
	sessionId?: string;
	anonymousId?: string;
	userId?: string;
}

/**
 * Session manager handles:
 * - Anonymous ID generation and persistence (with optional rotation)
 * - User ID management
 * - Session ID with timeout-based regeneration
 * - User traits storage
 * - Cross-tab synchronization via BroadcastChannel
 */
export class Session {
	private storage: StorageInterface;
	private sessionTimeout: number;
	private anonymousIdMaxAge: number;
	private currentSessionId: string | null = null;
	private logger: Logger;
	private broadcastChannel: BroadcastChannel | null = null;

	constructor(
		storage: StorageInterface,
		sessionTimeout: number,
		debug = false,
		anonymousIdMaxAge = 0,
	) {
		this.storage = storage;
		this.sessionTimeout = sessionTimeout;
		this.anonymousIdMaxAge = anonymousIdMaxAge;
		this.logger = createLogger("Session", debug);

		this.ensureSession();
		this.setupCrossTabSync();
	}

	/**
	 * Set up cross-tab session synchronization using BroadcastChannel
	 */
	private setupCrossTabSync(): void {
		if (typeof BroadcastChannel === "undefined") {
			this.logger.log(
				"BroadcastChannel not available, cross-tab sync disabled",
			);
			return;
		}

		try {
			this.broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
			this.broadcastChannel.onmessage = (
				event: MessageEvent<SessionMessage>,
			) => {
				this.handleBroadcastMessage(event.data);
			};
			this.logger.log("Cross-tab sync enabled");
		} catch {
			this.logger.log("Failed to create BroadcastChannel");
		}
	}

	/**
	 * Handle messages from other tabs
	 */
	private handleBroadcastMessage(message: SessionMessage): void {
		switch (message.type) {
			case "reset":
				this.currentSessionId = this.storage.get(STORAGE_KEYS.SESSION_ID);
				this.logger.log("Session synced from another tab (reset)");
				break;

			case "identify":
				this.logger.log("User identified in another tab:", message.userId);
				break;

			case "sync_request":
				this.broadcastMessage({
					type: "sync_response",
					sessionId: this.currentSessionId ?? undefined,
					anonymousId: this.storage.get(STORAGE_KEYS.ANONYMOUS_ID) ?? undefined,
					userId: this.storage.get(STORAGE_KEYS.USER_ID) ?? undefined,
				});
				break;

			case "sync_response":
				if (message.sessionId && message.sessionId !== this.currentSessionId) {
					this.currentSessionId = message.sessionId;
					this.logger.log("Session synced from another tab");
				}
				break;
		}
	}

	/**
	 * Broadcast a message to other tabs
	 */
	private broadcastMessage(message: SessionMessage): void {
		try {
			this.broadcastChannel?.postMessage(message);
		} catch {}
	}

	/**
	 * Get the anonymous ID, generating one if it doesn't exist or has expired.
	 * If anonymousIdMaxAge is set, the ID will be rotated after that duration.
	 */
	getAnonymousId(): string {
		let anonymousId = this.storage.get(STORAGE_KEYS.ANONYMOUS_ID);
		const createdAtStr = this.storage.get(STORAGE_KEYS.ANONYMOUS_ID_CREATED);
		const createdAt = createdAtStr ? parseInt(createdAtStr, 10) : 0;
		const now = Date.now();

		const needsRotation =
			this.anonymousIdMaxAge > 0 &&
			createdAt > 0 &&
			now - createdAt > this.anonymousIdMaxAge;

		if (!anonymousId || needsRotation) {
			anonymousId = generateId();
			this.storage.set(STORAGE_KEYS.ANONYMOUS_ID, anonymousId);
			this.storage.set(STORAGE_KEYS.ANONYMOUS_ID_CREATED, now.toString());
			this.logger.log(
				needsRotation
					? "Rotated anonymous ID (max age exceeded):"
					: "Generated new anonymous ID:",
				anonymousId,
			);
		} else if (!createdAt) {
			this.storage.set(STORAGE_KEYS.ANONYMOUS_ID_CREATED, now.toString());
		}

		return anonymousId;
	}

	/**
	 * Get the current user ID (if identified)
	 */
	getUserId(): string | undefined {
		return this.storage.get(STORAGE_KEYS.USER_ID) ?? undefined;
	}

	/**
	 * Set the user ID (called during identify)
	 */
	setUserId(userId: string): void {
		this.storage.set(STORAGE_KEYS.USER_ID, userId);
		this.logger.log("User ID set:", userId);
		this.broadcastMessage({ type: "identify", userId });
	}

	/**
	 * Get user traits
	 */
	getUserTraits(): UserTraits | undefined {
		const traitsJson = this.storage.get(STORAGE_KEYS.USER_TRAITS);
		if (!traitsJson) return undefined;

		try {
			return JSON.parse(traitsJson) as UserTraits;
		} catch {
			return undefined;
		}
	}

	/**
	 * Set user traits (merges with existing traits)
	 */
	setUserTraits(traits: UserTraits): void {
		const existingTraits = this.getUserTraits() ?? {};
		const mergedTraits = { ...existingTraits, ...traits };
		this.storage.set(STORAGE_KEYS.USER_TRAITS, JSON.stringify(mergedTraits));
		this.logger.log("User traits updated:", mergedTraits);
	}

	/**
	 * Get the current account ID (if grouped)
	 */
	getAccountId(): string | undefined {
		return this.storage.get(STORAGE_KEYS.ACCOUNT_ID) ?? undefined;
	}

	/**
	 * Set the account ID (called during group)
	 */
	setAccountId(accountId: string): void {
		this.storage.set(STORAGE_KEYS.ACCOUNT_ID, accountId);
		this.logger.log("Account ID set:", accountId);
	}

	/**
	 * Get account traits
	 */
	getAccountTraits(): AccountTraits | undefined {
		const traitsJson = this.storage.get(STORAGE_KEYS.ACCOUNT_TRAITS);
		if (!traitsJson) return undefined;

		try {
			return JSON.parse(traitsJson) as AccountTraits;
		} catch {
			return undefined;
		}
	}

	/**
	 * Set account traits (merges with existing traits)
	 */
	setAccountTraits(traits: AccountTraits): void {
		const existingTraits = this.getAccountTraits() ?? {};
		const mergedTraits = { ...existingTraits, ...traits };
		this.storage.set(STORAGE_KEYS.ACCOUNT_TRAITS, JSON.stringify(mergedTraits));
		this.logger.log("Account traits updated:", mergedTraits);
	}

	/**
	 * Get the current session ID, creating a new one if the session has expired
	 */
	getSessionId(): string {
		this.ensureSession();

		if (!this.currentSessionId) {
			this.currentSessionId = generateId();
			this.storage.set(STORAGE_KEYS.SESSION_ID, this.currentSessionId);
		}
		return this.currentSessionId;
	}

	/**
	 * Check if the session has expired and create a new one if needed
	 */
	private ensureSession(): void {
		const storedSessionId = this.storage.get(STORAGE_KEYS.SESSION_ID);
		const lastActivityStr = this.storage.get(STORAGE_KEYS.LAST_ACTIVITY);
		const lastActivity = lastActivityStr ? parseInt(lastActivityStr, 10) : 0;
		const now = Date.now();

		const sessionExpired = now - lastActivity > this.sessionTimeout;

		if (!storedSessionId || sessionExpired) {
			this.currentSessionId = generateId();
			this.storage.set(STORAGE_KEYS.SESSION_ID, this.currentSessionId);
			this.logger.log(
				sessionExpired
					? "Session expired, created new:"
					: "Created new session:",
				this.currentSessionId,
			);
		} else {
			this.currentSessionId = storedSessionId;
		}

		this.updateLastActivity();
	}

	/**
	 * Update the last activity timestamp
	 */
	updateLastActivity(): void {
		this.storage.set(STORAGE_KEYS.LAST_ACTIVITY, Date.now().toString());
	}

	/**
	 * Reset the session (clear user, account, and session data)
	 */
	reset(): void {
		this.storage.remove(STORAGE_KEYS.USER_ID);
		this.storage.remove(STORAGE_KEYS.USER_TRAITS);
		this.storage.remove(STORAGE_KEYS.ACCOUNT_ID);
		this.storage.remove(STORAGE_KEYS.ACCOUNT_TRAITS);

		const newAnonymousId = generateId();
		this.storage.set(STORAGE_KEYS.ANONYMOUS_ID, newAnonymousId);
		this.storage.set(STORAGE_KEYS.ANONYMOUS_ID_CREATED, Date.now().toString());

		const newSessionId = generateId();
		this.currentSessionId = newSessionId;
		this.storage.set(STORAGE_KEYS.SESSION_ID, newSessionId);

		this.updateLastActivity();

		this.broadcastMessage({
			type: "reset",
			sessionId: newSessionId,
			anonymousId: newAnonymousId,
		});

		this.logger.log("Session reset. New anonymous ID:", newAnonymousId);
	}

	/**
	 * Clean up resources (call when destroying the analytics instance)
	 */
	destroy(): void {
		try {
			this.broadcastChannel?.close();
			this.broadcastChannel = null;
		} catch {}
	}

	/**
	 * Get the full user state
	 */
	getUserState(): UserState {
		return {
			anonymousId: this.getAnonymousId(),
			userId: this.getUserId(),
			traits: this.getUserTraits(),
			accountId: this.getAccountId(),
			accountTraits: this.getAccountTraits(),
		};
	}
}
