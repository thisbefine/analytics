import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	clearPrivacyMocks,
	MockStorage,
	mockConsole,
	mockDNT,
	mockGPC,
	mockMsDNT,
	mockWindowDNT,
} from "../../test-utils";
import { Privacy } from "../privacy";
import { STORAGE_KEYS } from "../types";

describe("Privacy", () => {
	let storage: MockStorage;
	let privacy: Privacy;

	beforeEach(() => {
		storage = new MockStorage();
		clearPrivacyMocks();
	});

	afterEach(() => {
		clearPrivacyMocks();
	});

	describe("DNT Detection", () => {
		describe("navigator.doNotTrack", () => {
			it('should detect DNT when navigator.doNotTrack is "1"', () => {
				mockDNT("1");
				privacy = new Privacy(storage, true);
				expect(privacy.isDNTEnabled()).toBe(true);
			});

			it('should detect DNT when navigator.doNotTrack is "yes"', () => {
				mockDNT("yes");
				privacy = new Privacy(storage, true);
				expect(privacy.isDNTEnabled()).toBe(true);
			});

			it('should not detect DNT when navigator.doNotTrack is "0"', () => {
				mockDNT("0");
				privacy = new Privacy(storage, true);
				expect(privacy.isDNTEnabled()).toBe(false);
			});

			it("should not detect DNT when navigator.doNotTrack is null", () => {
				mockDNT(null);
				privacy = new Privacy(storage, true);
				expect(privacy.isDNTEnabled()).toBe(false);
			});
		});

		describe("window.doNotTrack", () => {
			it('should detect DNT when window.doNotTrack is "1"', () => {
				mockDNT(null);
				mockWindowDNT("1");
				privacy = new Privacy(storage, true);
				expect(privacy.isDNTEnabled()).toBe(true);
			});

			it('should detect DNT when window.doNotTrack is "yes"', () => {
				mockDNT(null);
				mockWindowDNT("yes");
				privacy = new Privacy(storage, true);
				expect(privacy.isDNTEnabled()).toBe(true);
			});
		});

		describe("navigator.msDoNotTrack (IE)", () => {
			it('should detect DNT when navigator.msDoNotTrack is "1"', () => {
				mockDNT(null);
				mockWindowDNT(null);
				mockMsDNT("1");
				privacy = new Privacy(storage, true);
				expect(privacy.isDNTEnabled()).toBe(true);
			});
		});

		describe("DNT precedence", () => {
			it("should check navigator.doNotTrack first", () => {
				mockDNT("1");
				mockWindowDNT("0");
				privacy = new Privacy(storage, true);
				expect(privacy.isDNTEnabled()).toBe(true);
			});
		});
	});

	describe("GPC Detection", () => {
		it("should detect GPC when navigator.globalPrivacyControl is true", () => {
			mockGPC(true);
			privacy = new Privacy(storage, true);
			expect(privacy.isGPCEnabled()).toBe(true);
		});

		it("should not detect GPC when navigator.globalPrivacyControl is false", () => {
			mockGPC(false);
			privacy = new Privacy(storage, true);
			expect(privacy.isGPCEnabled()).toBe(false);
		});

		it("should not detect GPC when navigator.globalPrivacyControl is undefined", () => {
			privacy = new Privacy(storage, true);
			expect(privacy.isGPCEnabled()).toBe(false);
		});
	});

	describe("Opt-out Management", () => {
		beforeEach(() => {
			privacy = new Privacy(storage, true);
		});

		it("should not be opted out by default", () => {
			expect(privacy.isOptedOut()).toBe(false);
		});

		it("should set opt-out flag when optOut() is called", () => {
			privacy.optOut();
			expect(privacy.isOptedOut()).toBe(true);
			expect(storage.getItem(STORAGE_KEYS.OPT_OUT)).toBe("true");
		});

		it("should clear opt-out flag when optIn() is called", () => {
			privacy.optOut();
			expect(privacy.isOptedOut()).toBe(true);

			privacy.optIn();
			expect(privacy.isOptedOut()).toBe(false);
			expect(storage.getItem(STORAGE_KEYS.OPT_OUT)).toBeNull();
		});

		it("should persist opt-out state across instances", () => {
			privacy.optOut();

			const newPrivacy = new Privacy(storage, true);
			expect(newPrivacy.isOptedOut()).toBe(true);
		});

		it("should log when opting out in debug mode", () => {
			const consoleSpy = mockConsole();
			const debugPrivacy = new Privacy(storage, true, true);

			debugPrivacy.optOut();
			expect(consoleSpy.log).toHaveBeenCalledWith(
				"[Thisbefine Privacy]",
				"User opted out of tracking",
			);
		});

		it("should log when opting in in debug mode", () => {
			const consoleSpy = mockConsole();
			const debugPrivacy = new Privacy(storage, true, true);

			debugPrivacy.optOut();
			debugPrivacy.optIn();
			expect(consoleSpy.log).toHaveBeenCalledWith(
				"[Thisbefine Privacy]",
				"User opted in to tracking",
			);
		});
	});

	describe("shouldTrack Logic", () => {
		it("should return true when no privacy signals are set", () => {
			privacy = new Privacy(storage, true);
			expect(privacy.shouldTrack()).toBe(true);
		});

		it("should return false when user has opted out", () => {
			privacy = new Privacy(storage, true);
			privacy.optOut();
			expect(privacy.shouldTrack()).toBe(false);
		});

		it("should return false when DNT is enabled and respectDNT is true", () => {
			mockDNT("1");
			privacy = new Privacy(storage, true);
			expect(privacy.shouldTrack()).toBe(false);
		});

		it("should return true when DNT is enabled but respectDNT is false", () => {
			mockDNT("1");
			privacy = new Privacy(storage, false);
			expect(privacy.shouldTrack()).toBe(true);
		});

		it("should return false when GPC is enabled and respectDNT is true", () => {
			mockGPC(true);
			privacy = new Privacy(storage, true);
			expect(privacy.shouldTrack()).toBe(false);
		});

		it("should return true when GPC is enabled but respectDNT is false", () => {
			mockGPC(true);
			privacy = new Privacy(storage, false);
			expect(privacy.shouldTrack()).toBe(true);
		});

		it("should prioritize opt-out over DNT settings", () => {
			mockDNT("0");
			privacy = new Privacy(storage, false);
			privacy.optOut();
			expect(privacy.shouldTrack()).toBe(false);
		});

		it("should log blocked reasons in debug mode", () => {
			const consoleSpy = mockConsole();
			const debugPrivacy = new Privacy(storage, true, true);
			debugPrivacy.optOut();

			debugPrivacy.shouldTrack();
			expect(consoleSpy.log).toHaveBeenCalledWith(
				"[Thisbefine Privacy]",
				"Tracking blocked: user opted out",
			);
		});

		it("should log DNT block reason in debug mode", () => {
			mockDNT("1");
			const consoleSpy = mockConsole();
			const debugPrivacy = new Privacy(storage, true, true);

			debugPrivacy.shouldTrack();
			expect(consoleSpy.log).toHaveBeenCalledWith(
				"[Thisbefine Privacy]",
				"Tracking blocked: DNT enabled",
			);
		});

		it("should log GPC block reason in debug mode", () => {
			mockGPC(true);
			const consoleSpy = mockConsole();
			const debugPrivacy = new Privacy(storage, true, true);

			debugPrivacy.shouldTrack();
			expect(consoleSpy.log).toHaveBeenCalledWith(
				"[Thisbefine Privacy]",
				"Tracking blocked: GPC enabled",
			);
		});
	});

	describe("getPrivacyStatus", () => {
		it("should return all privacy signals as an object", () => {
			privacy = new Privacy(storage, true);
			const status = privacy.getPrivacyStatus();

			expect(status).toHaveProperty("dntEnabled");
			expect(status).toHaveProperty("gpcEnabled");
			expect(status).toHaveProperty("optedOut");
			expect(status).toHaveProperty("respectDNT");
			expect(status).toHaveProperty("trackingAllowed");
		});

		it("should return correct values when no signals are set", () => {
			privacy = new Privacy(storage, true);
			const status = privacy.getPrivacyStatus();

			expect(status).toEqual({
				dntEnabled: false,
				gpcEnabled: false,
				optedOut: false,
				respectDNT: true,
				trackingAllowed: true,
				consentCategories: ["analytics", "marketing", "functional"],
			});
		});

		it("should return correct values when DNT is enabled", () => {
			mockDNT("1");
			privacy = new Privacy(storage, true);
			const status = privacy.getPrivacyStatus();

			expect(status.dntEnabled).toBe(true);
			expect(status.trackingAllowed).toBe(false);
		});

		it("should return correct values when GPC is enabled", () => {
			mockGPC(true);
			privacy = new Privacy(storage, true);
			const status = privacy.getPrivacyStatus();

			expect(status.gpcEnabled).toBe(true);
			expect(status.trackingAllowed).toBe(false);
		});

		it("should return correct values when opted out", () => {
			privacy = new Privacy(storage, true);
			privacy.optOut();
			const status = privacy.getPrivacyStatus();

			expect(status.optedOut).toBe(true);
			expect(status.trackingAllowed).toBe(false);
		});

		it("should reflect respectDNT setting", () => {
			privacy = new Privacy(storage, false);
			const status = privacy.getPrivacyStatus();

			expect(status.respectDNT).toBe(false);
		});
	});

	describe("Edge Cases", () => {
		it("should handle multiple privacy signals simultaneously", () => {
			mockDNT("1");
			mockGPC(true);
			privacy = new Privacy(storage, true);
			privacy.optOut();

			expect(privacy.shouldTrack()).toBe(false);

			const status = privacy.getPrivacyStatus();
			expect(status.dntEnabled).toBe(true);
			expect(status.gpcEnabled).toBe(true);
			expect(status.optedOut).toBe(true);
			expect(status.trackingAllowed).toBe(false);
		});

		it("should handle toggling opt-out multiple times", () => {
			privacy = new Privacy(storage, true);

			privacy.optOut();
			expect(privacy.isOptedOut()).toBe(true);

			privacy.optIn();
			expect(privacy.isOptedOut()).toBe(false);

			privacy.optOut();
			expect(privacy.isOptedOut()).toBe(true);

			privacy.optIn();
			expect(privacy.isOptedOut()).toBe(false);
		});
	});
});
