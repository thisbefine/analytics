import type { StorageInterface } from "./types";
import { STORAGE_KEYS } from "./types";

/**
 * Privacy manager handles:
 * - Do Not Track (DNT) detection
 * - Global Privacy Control (GPC) detection
 * - User opt-out/opt-in state
 */
export class Privacy {
	private storage: StorageInterface;
	private respectDNT: boolean;
	private debug: boolean;

	constructor(storage: StorageInterface, respectDNT: boolean, debug = false) {
		this.storage = storage;
		this.respectDNT = respectDNT;
		this.debug = debug;
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
	 * Get a summary of privacy signals for debugging
	 */
	getPrivacyStatus(): {
		dntEnabled: boolean;
		gpcEnabled: boolean;
		optedOut: boolean;
		respectDNT: boolean;
		trackingAllowed: boolean;
	} {
		return {
			dntEnabled: this.isDNTEnabled(),
			gpcEnabled: this.isGPCEnabled(),
			optedOut: this.isOptedOut(),
			respectDNT: this.respectDNT,
			trackingAllowed: this.shouldTrack(),
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
