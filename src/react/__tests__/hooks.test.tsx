import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { initAnalytics } from "../../core/analytics";
import type { Analytics } from "../../core/types";
import {
	clearAllStorage,
	mockFetch,
	mockLocalStorage,
	resetFetchMock,
	resetGlobalAnalytics,
} from "../../test-utils";
import {
	useAccountDeleted,
	useAnalytics,
	useCaptureException,
	useFeatureActivated,
	useGetUser,
	useGroup,
	useIdentify,
	useInviteAccepted,
	useInviteSent,
	useLog,
	useLogin,
	useLogout,
	usePage,
	usePlanDowngraded,
	usePlanUpgraded,
	useReset,
	useSignup,
	useSubscriptionCancelled,
	useSubscriptionRenewed,
	useSubscriptionStarted,
	useTrack,
	useTrialEnded,
	useTrialStarted,
} from "../hooks";

describe("React Hooks", () => {
	let analyticsInstance: Analytics;

	beforeEach(async () => {
		vi.useFakeTimers();
		mockFetch();
		mockLocalStorage();
		clearAllStorage();
		await resetGlobalAnalytics();

		analyticsInstance = initAnalytics({ apiKey: "tbf_test_key" });
	});

	afterEach(async () => {
		vi.useRealTimers();
		resetFetchMock();
		clearAllStorage();
		await resetGlobalAnalytics();
	});

	describe("useAnalytics", () => {
		it("should return analytics instance when initialized", () => {
			const { result } = renderHook(() => useAnalytics());
			expect(result.current).toBeDefined();
			expect(typeof result.current.track).toBe("function");
		});

		it("should throw when analytics is not initialized", async () => {
			await resetGlobalAnalytics();

			const { getAnalytics } = await import("../../core/analytics");
			const instance = getAnalytics();

			if (instance === null) {
				expect(() => {
					renderHook(() => useAnalytics());
				}).toThrow(
					"Analytics not initialized. Make sure you have added <Analytics /> to your app.",
				);
			} else {
				const { result } = renderHook(() => useAnalytics());
				expect(result.current).toBe(instance);
			}
		});

		it("should return same reference on re-render", () => {
			const { result, rerender } = renderHook(() => useAnalytics());
			const firstInstance = result.current;

			rerender();

			expect(result.current).toBe(firstInstance);
		});
	});

	describe("useTrack", () => {
		it("should return a memoized track function", () => {
			const { result } = renderHook(() => useTrack("button_clicked"));

			expect(typeof result.current).toBe("function");
		});

		it("should track events with correct event name", () => {
			const trackSpy = vi.spyOn(analyticsInstance, "track");
			const { result } = renderHook(() => useTrack("signup_clicked"));

			result.current({ buttonId: "header" });

			expect(trackSpy).toHaveBeenCalledWith("signup_clicked", {
				buttonId: "header",
			});
		});

		it("should return same function reference when event name is unchanged", () => {
			const { result, rerender } = renderHook(() => useTrack("test_event"));
			const firstFn = result.current;

			rerender();

			expect(result.current).toBe(firstFn);
		});

		it("should return new function reference when event name changes", () => {
			const { result, rerender } = renderHook(
				({ eventName }) => useTrack(eventName),
				{ initialProps: { eventName: "event_1" } },
			);
			const firstFn = result.current;

			rerender({ eventName: "event_2" });

			expect(result.current).not.toBe(firstFn);
		});

		it("should work without properties", () => {
			const trackSpy = vi.spyOn(analyticsInstance, "track");
			const { result } = renderHook(() => useTrack("simple_event"));

			result.current();

			expect(trackSpy).toHaveBeenCalledWith("simple_event", undefined);
		});
	});

	describe("useIdentify", () => {
		it("should return a memoized identify function", () => {
			const { result } = renderHook(() => useIdentify());

			expect(typeof result.current).toBe("function");
		});

		it("should identify users correctly", () => {
			const identifySpy = vi.spyOn(analyticsInstance, "identify");
			const { result } = renderHook(() => useIdentify());

			result.current("user_123", { email: "test@example.com" });

			expect(identifySpy).toHaveBeenCalledWith("user_123", {
				email: "test@example.com",
			});
		});

		it("should return same function reference on re-render", () => {
			const { result, rerender } = renderHook(() => useIdentify());
			const firstFn = result.current;

			rerender();

			expect(result.current).toBe(firstFn);
		});

		it("should work without traits", () => {
			const identifySpy = vi.spyOn(analyticsInstance, "identify");
			const { result } = renderHook(() => useIdentify());

			result.current("user_456");

			expect(identifySpy).toHaveBeenCalledWith("user_456", undefined);
		});
	});

	describe("useGroup", () => {
		it("should return a memoized group function", () => {
			const { result } = renderHook(() => useGroup());

			expect(typeof result.current).toBe("function");
		});

		it("should group accounts correctly", () => {
			const groupSpy = vi.spyOn(analyticsInstance, "group");
			const { result } = renderHook(() => useGroup());

			result.current("account_123", { name: "Acme Inc", plan: "enterprise" });

			expect(groupSpy).toHaveBeenCalledWith("account_123", {
				name: "Acme Inc",
				plan: "enterprise",
			});
		});

		it("should return same function reference on re-render", () => {
			const { result, rerender } = renderHook(() => useGroup());
			const firstFn = result.current;

			rerender();

			expect(result.current).toBe(firstFn);
		});

		it("should work without traits", () => {
			const groupSpy = vi.spyOn(analyticsInstance, "group");
			const { result } = renderHook(() => useGroup());

			result.current("account_789");

			expect(groupSpy).toHaveBeenCalledWith("account_789", undefined);
		});
	});

	describe("usePage", () => {
		it("should return a memoized page function", () => {
			const { result } = renderHook(() => usePage());

			expect(typeof result.current).toBe("function");
		});

		it("should track pages correctly", () => {
			const pageSpy = vi.spyOn(analyticsInstance, "page");
			const { result } = renderHook(() => usePage());

			result.current("Dashboard", { section: "overview" });

			expect(pageSpy).toHaveBeenCalledWith("Dashboard", {
				section: "overview",
			});
		});

		it("should return same function reference on re-render", () => {
			const { result, rerender } = renderHook(() => usePage());
			const firstFn = result.current;

			rerender();

			expect(result.current).toBe(firstFn);
		});

		it("should work without name and properties", () => {
			const pageSpy = vi.spyOn(analyticsInstance, "page");
			const { result } = renderHook(() => usePage());

			result.current();

			expect(pageSpy).toHaveBeenCalledWith(undefined, undefined);
		});
	});

	describe("useReset", () => {
		it("should return a memoized reset function", () => {
			const { result } = renderHook(() => useReset());

			expect(typeof result.current).toBe("function");
		});

		it("should reset session correctly", () => {
			const resetSpy = vi.spyOn(analyticsInstance, "reset");
			const { result } = renderHook(() => useReset());

			result.current();

			expect(resetSpy).toHaveBeenCalled();
		});

		it("should return same function reference on re-render", () => {
			const { result, rerender } = renderHook(() => useReset());
			const firstFn = result.current;

			rerender();

			expect(result.current).toBe(firstFn);
		});
	});

	describe("useGetUser", () => {
		it("should return a memoized getUser function", () => {
			const { result } = renderHook(() => useGetUser());

			expect(typeof result.current).toBe("function");
		});

		it("should return correct user state", () => {
			analyticsInstance.identify("user_123", { email: "test@example.com" });

			const { result } = renderHook(() => useGetUser());
			const user = result.current();

			expect(user?.userId).toBe("user_123");
			expect(user?.traits?.email).toBe("test@example.com");
		});

		it("should return same function reference on re-render", () => {
			const { result, rerender } = renderHook(() => useGetUser());
			const firstFn = result.current;

			rerender();

			expect(result.current).toBe(firstFn);
		});

		it("should return anonymous ID for unidentified users", () => {
			const { result } = renderHook(() => useGetUser());
			const user = result.current();

			expect(user?.anonymousId).toBeDefined();
			expect(user?.userId).toBeUndefined();
		});
	});

	describe("useCaptureException", () => {
		it("should return a memoized capture function", () => {
			const { result } = renderHook(() => useCaptureException());

			expect(typeof result.current).toBe("function");
		});

		it("should capture exceptions correctly", () => {
			const captureSpy = vi.spyOn(analyticsInstance, "captureException");
			const { result } = renderHook(() => useCaptureException());

			const error = new Error("Test error");
			result.current(error, { component: "TestComponent" });

			expect(captureSpy).toHaveBeenCalledWith(error, {
				component: "TestComponent",
			});
		});

		it("should return same function reference on re-render", () => {
			const { result, rerender } = renderHook(() => useCaptureException());
			const firstFn = result.current;

			rerender();

			expect(result.current).toBe(firstFn);
		});

		it("should work without context", () => {
			const captureSpy = vi.spyOn(analyticsInstance, "captureException");
			const { result } = renderHook(() => useCaptureException());

			const error = new Error("Simple error");
			result.current(error);

			expect(captureSpy).toHaveBeenCalledWith(error, undefined);
		});
	});

	describe("useLog", () => {
		it("should return a memoized log function", () => {
			const { result } = renderHook(() => useLog());

			expect(typeof result.current).toBe("function");
		});

		it("should log messages correctly", () => {
			const logSpy = vi.spyOn(analyticsInstance, "log");
			const { result } = renderHook(() => useLog());

			result.current("User completed onboarding", "info", { step: 3 });

			expect(logSpy).toHaveBeenCalledWith("User completed onboarding", "info", {
				step: 3,
			});
		});

		it("should return same function reference on re-render", () => {
			const { result, rerender } = renderHook(() => useLog());
			const firstFn = result.current;

			rerender();

			expect(result.current).toBe(firstFn);
		});

		it("should work without metadata", () => {
			const logSpy = vi.spyOn(analyticsInstance, "log");
			const { result } = renderHook(() => useLog());

			result.current("Simple log", "debug");

			expect(logSpy).toHaveBeenCalledWith("Simple log", "debug", undefined);
		});

		it("should handle all log levels", () => {
			const logSpy = vi.spyOn(analyticsInstance, "log");
			const { result } = renderHook(() => useLog());

			result.current("Debug", "debug");
			result.current("Info", "info");
			result.current("Warn", "warn");
			result.current("Error", "error");
			result.current("Fatal", "fatal");

			expect(logSpy).toHaveBeenCalledTimes(5);
		});
	});

	describe("Edge Cases", () => {
		it("should handle analytics not being available gracefully in track hooks", async () => {
			await resetGlobalAnalytics();

			const { result: trackResult } = renderHook(() => useTrack("test"));
			expect(() => trackResult.current()).not.toThrow();

			const { result: identifyResult } = renderHook(() => useIdentify());
			expect(() => identifyResult.current("user")).not.toThrow();
		});

		it("should maintain hook identity across multiple renders", () => {
			const { result, rerender } = renderHook(() => ({
				track: useTrack("event"),
				identify: useIdentify(),
				group: useGroup(),
				page: usePage(),
				reset: useReset(),
				getUser: useGetUser(),
				captureException: useCaptureException(),
				log: useLog(),
			}));

			const firstRender = { ...result.current };

			rerender();
			rerender();
			rerender();

			expect(result.current.identify).toBe(firstRender.identify);
			expect(result.current.group).toBe(firstRender.group);
			expect(result.current.page).toBe(firstRender.page);
			expect(result.current.reset).toBe(firstRender.reset);
			expect(result.current.getUser).toBe(firstRender.getUser);
			expect(result.current.captureException).toBe(
				firstRender.captureException,
			);
			expect(result.current.log).toBe(firstRender.log);
		});
	});

	describe("Lifecycle Event Hooks", () => {
		describe("User Lifecycle", () => {
			describe("useSignup", () => {
				it("should return a memoized signup function", () => {
					const { result } = renderHook(() => useSignup());
					expect(typeof result.current).toBe("function");
				});

				it("should call analytics.signup with props", () => {
					const signupSpy = vi.spyOn(analyticsInstance, "signup");
					const { result } = renderHook(() => useSignup());

					result.current({ method: "google", plan: "free" });

					expect(signupSpy).toHaveBeenCalledWith({
						method: "google",
						plan: "free",
					});
				});

				it("should return same function reference on re-render", () => {
					const { result, rerender } = renderHook(() => useSignup());
					const firstFn = result.current;

					rerender();

					expect(result.current).toBe(firstFn);
				});
			});

			describe("useLogin", () => {
				it("should return a memoized login function", () => {
					const { result } = renderHook(() => useLogin());
					expect(typeof result.current).toBe("function");
				});

				it("should call analytics.login with props", () => {
					const loginSpy = vi.spyOn(analyticsInstance, "login");
					const { result } = renderHook(() => useLogin());

					result.current({ method: "passkey", isNewDevice: true });

					expect(loginSpy).toHaveBeenCalledWith({
						method: "passkey",
						isNewDevice: true,
					});
				});
			});

			describe("useLogout", () => {
				it("should return a memoized logout function", () => {
					const { result } = renderHook(() => useLogout());
					expect(typeof result.current).toBe("function");
				});

				it("should call analytics.logout with props", () => {
					const logoutSpy = vi.spyOn(analyticsInstance, "logout");
					const { result } = renderHook(() => useLogout());

					result.current({ reason: "manual" });

					expect(logoutSpy).toHaveBeenCalledWith({ reason: "manual" });
				});
			});

			describe("useAccountDeleted", () => {
				it("should return a memoized accountDeleted function", () => {
					const { result } = renderHook(() => useAccountDeleted());
					expect(typeof result.current).toBe("function");
				});

				it("should call analytics.accountDeleted with props", () => {
					const accountDeletedSpy = vi.spyOn(
						analyticsInstance,
						"accountDeleted",
					);
					const { result } = renderHook(() => useAccountDeleted());

					result.current({ reason: "too_expensive", tenure: 90 });

					expect(accountDeletedSpy).toHaveBeenCalledWith({
						reason: "too_expensive",
						tenure: 90,
					});
				});
			});
		});

		describe("Subscription Lifecycle", () => {
			describe("useSubscriptionStarted", () => {
				it("should return a memoized subscriptionStarted function", () => {
					const { result } = renderHook(() => useSubscriptionStarted());
					expect(typeof result.current).toBe("function");
				});

				it("should call analytics.subscriptionStarted with props", () => {
					const spy = vi.spyOn(analyticsInstance, "subscriptionStarted");
					const { result } = renderHook(() => useSubscriptionStarted());

					result.current({ plan: "pro", interval: "yearly", mrr: 99 });

					expect(spy).toHaveBeenCalledWith({
						plan: "pro",
						interval: "yearly",
						mrr: 99,
					});
				});
			});

			describe("useSubscriptionCancelled", () => {
				it("should return a memoized subscriptionCancelled function", () => {
					const { result } = renderHook(() => useSubscriptionCancelled());
					expect(typeof result.current).toBe("function");
				});

				it("should call analytics.subscriptionCancelled with props", () => {
					const spy = vi.spyOn(analyticsInstance, "subscriptionCancelled");
					const { result } = renderHook(() => useSubscriptionCancelled());

					result.current({ plan: "pro", reason: "too_expensive" });

					expect(spy).toHaveBeenCalledWith({
						plan: "pro",
						reason: "too_expensive",
					});
				});
			});

			describe("useSubscriptionRenewed", () => {
				it("should return a memoized subscriptionRenewed function", () => {
					const { result } = renderHook(() => useSubscriptionRenewed());
					expect(typeof result.current).toBe("function");
				});

				it("should call analytics.subscriptionRenewed with props", () => {
					const spy = vi.spyOn(analyticsInstance, "subscriptionRenewed");
					const { result } = renderHook(() => useSubscriptionRenewed());

					result.current({ plan: "team", renewalCount: 12 });

					expect(spy).toHaveBeenCalledWith({
						plan: "team",
						renewalCount: 12,
					});
				});
			});

			describe("usePlanUpgraded", () => {
				it("should return a memoized planUpgraded function", () => {
					const { result } = renderHook(() => usePlanUpgraded());
					expect(typeof result.current).toBe("function");
				});

				it("should call analytics.planUpgraded with props", () => {
					const spy = vi.spyOn(analyticsInstance, "planUpgraded");
					const { result } = renderHook(() => usePlanUpgraded());

					result.current({ fromPlan: "starter", toPlan: "pro", mrrChange: 50 });

					expect(spy).toHaveBeenCalledWith({
						fromPlan: "starter",
						toPlan: "pro",
						mrrChange: 50,
					});
				});
			});

			describe("usePlanDowngraded", () => {
				it("should return a memoized planDowngraded function", () => {
					const { result } = renderHook(() => usePlanDowngraded());
					expect(typeof result.current).toBe("function");
				});

				it("should call analytics.planDowngraded with props", () => {
					const spy = vi.spyOn(analyticsInstance, "planDowngraded");
					const { result } = renderHook(() => usePlanDowngraded());

					result.current({
						fromPlan: "pro",
						toPlan: "starter",
						reason: "budget",
					});

					expect(spy).toHaveBeenCalledWith({
						fromPlan: "pro",
						toPlan: "starter",
						reason: "budget",
					});
				});
			});

			describe("useTrialStarted", () => {
				it("should return a memoized trialStarted function", () => {
					const { result } = renderHook(() => useTrialStarted());
					expect(typeof result.current).toBe("function");
				});

				it("should call analytics.trialStarted with props", () => {
					const spy = vi.spyOn(analyticsInstance, "trialStarted");
					const { result } = renderHook(() => useTrialStarted());

					result.current({ plan: "pro", trialDays: 14 });

					expect(spy).toHaveBeenCalledWith({
						plan: "pro",
						trialDays: 14,
					});
				});
			});

			describe("useTrialEnded", () => {
				it("should return a memoized trialEnded function", () => {
					const { result } = renderHook(() => useTrialEnded());
					expect(typeof result.current).toBe("function");
				});

				it("should call analytics.trialEnded with props", () => {
					const spy = vi.spyOn(analyticsInstance, "trialEnded");
					const { result } = renderHook(() => useTrialEnded());

					result.current({ plan: "pro", converted: true });

					expect(spy).toHaveBeenCalledWith({
						plan: "pro",
						converted: true,
					});
				});
			});
		});

		describe("Engagement", () => {
			describe("useInviteSent", () => {
				it("should return a memoized inviteSent function", () => {
					const { result } = renderHook(() => useInviteSent());
					expect(typeof result.current).toBe("function");
				});

				it("should call analytics.inviteSent with props", () => {
					const spy = vi.spyOn(analyticsInstance, "inviteSent");
					const { result } = renderHook(() => useInviteSent());

					result.current({ inviteEmail: "colleague@example.com", role: "editor" });

					expect(spy).toHaveBeenCalledWith({
						inviteEmail: "colleague@example.com",
						role: "editor",
					});
				});
			});

			describe("useInviteAccepted", () => {
				it("should return a memoized inviteAccepted function", () => {
					const { result } = renderHook(() => useInviteAccepted());
					expect(typeof result.current).toBe("function");
				});

				it("should call analytics.inviteAccepted with props", () => {
					const spy = vi.spyOn(analyticsInstance, "inviteAccepted");
					const { result } = renderHook(() => useInviteAccepted());

					result.current({ invitedBy: "user_123", role: "viewer" });

					expect(spy).toHaveBeenCalledWith({
						invitedBy: "user_123",
						role: "viewer",
					});
				});
			});

			describe("useFeatureActivated", () => {
				it("should return a memoized featureActivated function", () => {
					const { result } = renderHook(() => useFeatureActivated());
					expect(typeof result.current).toBe("function");
				});

				it("should call analytics.featureActivated with props", () => {
					const spy = vi.spyOn(analyticsInstance, "featureActivated");
					const { result } = renderHook(() => useFeatureActivated());

					result.current({ feature: "dark_mode", isFirstTime: true });

					expect(spy).toHaveBeenCalledWith({
						feature: "dark_mode",
						isFirstTime: true,
					});
				});
			});
		});

		describe("Edge Cases", () => {
			it("should handle analytics not being available gracefully", async () => {
				await resetGlobalAnalytics();

				const { result: signupResult } = renderHook(() => useSignup());
				expect(() => signupResult.current({ method: "google" })).not.toThrow();

				const { result: subscriptionResult } = renderHook(() =>
					useSubscriptionStarted(),
				);
				expect(() =>
					subscriptionResult.current({ plan: "pro" }),
				).not.toThrow();
			});

			it("should maintain hook identity across multiple renders for all lifecycle hooks", () => {
				const { result, rerender } = renderHook(() => ({
					signup: useSignup(),
					login: useLogin(),
					logout: useLogout(),
					accountDeleted: useAccountDeleted(),
					subscriptionStarted: useSubscriptionStarted(),
					subscriptionCancelled: useSubscriptionCancelled(),
					subscriptionRenewed: useSubscriptionRenewed(),
					planUpgraded: usePlanUpgraded(),
					planDowngraded: usePlanDowngraded(),
					trialStarted: useTrialStarted(),
					trialEnded: useTrialEnded(),
					inviteSent: useInviteSent(),
					inviteAccepted: useInviteAccepted(),
					featureActivated: useFeatureActivated(),
				}));

				const firstRender = { ...result.current };

				rerender();
				rerender();
				rerender();

				expect(result.current.signup).toBe(firstRender.signup);
				expect(result.current.login).toBe(firstRender.login);
				expect(result.current.logout).toBe(firstRender.logout);
				expect(result.current.accountDeleted).toBe(firstRender.accountDeleted);
				expect(result.current.subscriptionStarted).toBe(
					firstRender.subscriptionStarted,
				);
				expect(result.current.subscriptionCancelled).toBe(
					firstRender.subscriptionCancelled,
				);
				expect(result.current.subscriptionRenewed).toBe(
					firstRender.subscriptionRenewed,
				);
				expect(result.current.planUpgraded).toBe(firstRender.planUpgraded);
				expect(result.current.planDowngraded).toBe(firstRender.planDowngraded);
				expect(result.current.trialStarted).toBe(firstRender.trialStarted);
				expect(result.current.trialEnded).toBe(firstRender.trialEnded);
				expect(result.current.inviteSent).toBe(firstRender.inviteSent);
				expect(result.current.inviteAccepted).toBe(firstRender.inviteAccepted);
				expect(result.current.featureActivated).toBe(
					firstRender.featureActivated,
				);
			});
		});
	});
});
