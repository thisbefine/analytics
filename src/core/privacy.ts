import type { ConsentCategory, ConsentConfig, StorageInterface } from "./types";
import { STORAGE_KEYS } from "./types";

/** Storage key for consent categories */
const CONSENT_KEY = "tif_consent";

/** All available consent categories */
const ALL_CATEGORIES: ConsentCategory[] = [
	"analytics",
	"marketing",
	"functional",
];

/**
 * Privacy manager handles:
 * - Do Not Track (DNT) detection
 * - Global Privacy Control (GPC) detection
 * - User opt-out/opt-in state
 * - Granular consent categories (analytics, marketing, functional)
 */
export class Privacy {
	private storage: StorageInterface;
	private respectDNT: boolean;
	private debug: boolean;
	private consentConfig: ConsentConfig;
	private consentCategories: Set<ConsentCategory>;

	constructor(
		storage: StorageInterface,
		respectDNT: boolean,
		debug = false,
		consentConfig?: ConsentConfig,
	) {
		this.storage = storage;
		this.respectDNT = respectDNT;
		this.debug = debug;
		this.consentConfig = consentConfig ?? {};

		this.consentCategories = this.loadConsentFromStorage();
	}

	/**
	 * Load consent categories from storage.
	 * Fails safe: if stored consent is corrupted, returns empty set (no consent)
	 * rather than defaulting to consent, to protect user privacy.
	 */
	private loadConsentFromStorage(): Set<ConsentCategory> {
		try {
			const stored = this.storage.get(CONSENT_KEY);
			if (stored) {
				const parsed = JSON.parse(stored) as ConsentCategory[];
				if (Array.isArray(parsed)) {
					return new Set(parsed.filter((c) => ALL_CATEGORIES.includes(c)));
				}
				console.warn(
					"[Thisbefine Privacy] Stored consent data is invalid, failing safe with no consent",
				);
				return new Set();
			}
		} catch (error) {
			console.warn(
				"[Thisbefine Privacy] Failed to load consent from storage, failing safe with no consent:",
				error,
			);
			return new Set();
		}

		const defaultConsent = this.consentConfig.defaultConsent ?? true;
		if (defaultConsent) {
			return new Set(this.consentConfig.categories ?? ALL_CATEGORIES);
		}
		return new Set();
	}

	/**
	 * Save consent categories to storage.
	 * Returns true if saved successfully, false otherwise.
	 * Warns on failure since consent preferences may not persist across sessions.
	 */
	private saveConsentToStorage(): boolean {
		try {
			this.storage.set(
				CONSENT_KEY,
				JSON.stringify([...this.consentCategories]),
			);
			return true;
		} catch (error) {
			console.warn(
				"[Thisbefine Privacy] Failed to persist consent to storage. User consent preference may not persist across sessions:",
				error,
			);
			return false;
		}
	}

	/**
	 * Check if Do Not Track is enabled in the browser
	 */
	isDNTEnabled(): boolean {
		if (typeof navigator === "undefined") return false;

		const dnt =
			navigator.doNotTrack ||
			(window as unknown as { doNotTrack?: string }).doNotTrack ||
			(navigator as unknown as { msDoNotTrack?: string }).msDoNotTrack;

		return dnt === "1" || dnt === "yes";
	}

	/**
	 * Check if Global Privacy Control is enabled
	 * GPC is a newer standard that's gaining adoption
	 */
	isGPCEnabled(): boolean {
		if (typeof navigator === "undefined") return false;

		return (
			(navigator as unknown as { globalPrivacyControl?: boolean })
				.globalPrivacyControl === true
		);
	}

	/**
	 * Check if the user has explicitly opted out
	 */
	isOptedOut(): boolean {
		return this.storage.get(STORAGE_KEYS.OPT_OUT) === "true";
	}

	/**
	 * Opt out of tracking
	 */
	optOut(): void {
		this.storage.set(STORAGE_KEYS.OPT_OUT, "true");
		this.log("User opted out of tracking");
	}

	/**
	 * Opt back in to tracking
	 */
	optIn(): void {
		this.storage.remove(STORAGE_KEYS.OPT_OUT);
		this.log("User opted in to tracking");
	}

	/**
	 * Check if tracking should be allowed based on all privacy signals
	 */
	shouldTrack(): boolean {
		if (this.isOptedOut()) {
			this.log("Tracking blocked: user opted out");
			return false;
		}

		if (this.respectDNT && this.isDNTEnabled()) {
			this.log("Tracking blocked: DNT enabled");
			return false;
		}

		if (this.respectDNT && this.isGPCEnabled()) {
			this.log("Tracking blocked: GPC enabled");
			return false;
		}

		return true;
	}

	/**
	 * Check if tracking is allowed for a specific consent category
	 */
	shouldTrackForCategory(category: ConsentCategory): boolean {
		if (!this.shouldTrack()) {
			return false;
		}
		return this.consentCategories.has(category);
	}

	/**
	 * Check if a specific consent category is enabled
	 */
	hasConsent(category: ConsentCategory): boolean {
		return this.consentCategories.has(category);
	}

	/**
	 * Get all currently consented categories
	 */
	getConsentedCategories(): ConsentCategory[] {
		return [...this.consentCategories];
	}

	/**
	 * Set consent for specific categories (replaces current consent)
	 */
	setConsent(categories: ConsentCategory[]): void {
		this.consentCategories = new Set(
			categories.filter((c) => ALL_CATEGORIES.includes(c)),
		);
		this.saveConsentToStorage();
		this.log("Consent updated:", [...this.consentCategories]);
	}

	/**
	 * Grant consent for a specific category
	 */
	grantConsent(category: ConsentCategory): void {
		if (ALL_CATEGORIES.includes(category)) {
			this.consentCategories.add(category);
			this.saveConsentToStorage();
			this.log("Consent granted:", category);
		}
	}

	/**
	 * Revoke consent for a specific category
	 */
	revokeConsent(category: ConsentCategory): void {
		this.consentCategories.delete(category);
		this.saveConsentToStorage();
		this.log("Consent revoked:", category);
	}

	/**
	 * Grant consent for all categories
	 */
	grantAllConsent(): void {
		this.consentCategories = new Set(ALL_CATEGORIES);
		this.saveConsentToStorage();
		this.log("All consent granted");
	}

	/**
	 * Revoke consent for all categories
	 */
	revokeAllConsent(): void {
		this.consentCategories.clear();
		this.saveConsentToStorage();
		this.log("All consent revoked");
	}

	/**
	 * Get a summary of privacy signals for debugging
	 */
	getPrivacyStatus(): {
		dntEnabled: boolean;
		gpcEnabled: boolean;
		optedOut: boolean;
		respectDNT: boolean;
		trackingAllowed: boolean;
		consentCategories: ConsentCategory[];
	} {
		return {
			dntEnabled: this.isDNTEnabled(),
			gpcEnabled: this.isGPCEnabled(),
			optedOut: this.isOptedOut(),
			respectDNT: this.respectDNT,
			trackingAllowed: this.shouldTrack(),
			consentCategories: this.getConsentedCategories(),
		};
	}

	/**
	 * Debug logger
	 */
	private log(...args: unknown[]): void {
		if (this.debug && typeof console !== "undefined") {
			console.log("[Thisbefine Privacy]", ...args);
		}
	}
}
