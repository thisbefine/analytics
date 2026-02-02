"use client";

import { useCallback } from "react";
import { getAnalytics } from "../core/analytics";
import type {
	AccountDeletedProps,
	FeatureActivatedProps,
	InviteAcceptedProps,
	InviteSentProps,
	LoginProps,
	LogoutProps,
	PlanDowngradedProps,
	PlanUpgradedProps,
	SignupProps,
	SubscriptionCancelledProps,
	SubscriptionRenewedProps,
	SubscriptionStartedProps,
	TrialEndedProps,
	TrialStartedProps,
} from "../core/lifecycle";
import type { LogLevel } from "../core/logging";
import type { AccountTraits, Analytics, UserTraits } from "../core/types";

/**
 * Get the analytics instance, throwing if not initialized
 */
const getAnalyticsOrThrow = (): Analytics => {
	const analytics = getAnalytics();

	if (!analytics) {
		throw new Error(
			"Analytics not initialized. Make sure you have added <Analytics /> to your app.",
		);
	}

	return analytics;
};

/**
 * Hook to access the Analytics instance
 *
 * @throws Error if Analytics component has not been mounted
 *
 * @example
 * ```tsx
 * const analytics = useAnalytics();
 *
 * const handleClick = () => {
 *   analytics.track('button_clicked', { buttonId: 'signup' });
 * };
 * ```
 */
export const useAnalytics = (): Analytics => {
	return getAnalyticsOrThrow();
};

/**
 * Hook to get a memoized track function for a specific event
 *
 * This is useful for event handlers where you want to avoid
 * creating new function references on each render.
 *
 * @param eventName - The name of the event to track
 *
 * @example
 * ```tsx
 * const trackSignup = useTrack('signup_clicked');
 *
 * return (
 *   <button onClick={() => trackSignup({ location: 'header' })}>
 *     Sign Up
 *   </button>
 * );
 * ```
 */
export const useTrack = (eventName: string) => {
	return useCallback(
		(properties?: Record<string, unknown>) => {
			getAnalytics()?.track(eventName, properties);
		},
		[eventName],
	);
};

/**
 * Hook to identify the current user
 *
 * Returns a memoized identify function.
 *
 * @example
 * ```tsx
 * const identify = useIdentify();
 *
 * // After login
 * identify(user.id, {
 *   email: user.email,
 *   name: user.name,
 *   plan: user.plan,
 * });
 * ```
 */
export const useIdentify = () => {
	return useCallback((userId: string, traits?: UserTraits) => {
		getAnalytics()?.identify(userId, traits);
	}, []);
};

/**
 * Hook to associate the current user with an account/company
 *
 * Returns a memoized group function.
 *
 * @example
 * ```tsx
 * const group = useGroup();
 *
 * // After user selects workspace/company
 * group(workspace.id, {
 *   name: workspace.name,
 *   plan: workspace.plan,
 *   mrr: workspace.mrr,
 * });
 * ```
 */
export const useGroup = () => {
	return useCallback((accountId: string, traits?: AccountTraits) => {
		getAnalytics()?.group(accountId, traits);
	}, []);
};

/**
 * Hook to track page views
 *
 * Returns a memoized page function.
 *
 * @example
 * ```tsx
 * const trackPage = usePage();
 *
 * useEffect(() => {
 *   trackPage('/dashboard', { section: 'overview' });
 * }, [trackPage]);
 * ```
 */
export const usePage = () => {
	return useCallback((name?: string, properties?: Record<string, unknown>) => {
		getAnalytics()?.page(name, properties);
	}, []);
};

/**
 * Hook to reset the analytics session (call on logout)
 *
 * @example
 * ```tsx
 * const resetAnalytics = useReset();
 *
 * const handleLogout = () => {
 *   resetAnalytics();
 *   // ... other logout logic
 * };
 * ```
 */
export const useReset = () => {
	return useCallback(() => {
		getAnalytics()?.reset();
	}, []);
};

/**
 * Hook to get the current user state
 *
 * @example
 * ```tsx
 * const getUser = useGetUser();
 *
 * const handleDebug = () => {
 *   console.log(getUser());
 *   // { anonymousId: '...', userId: '...', traits: { ... } }
 * };
 * ```
 */
export const useGetUser = () => {
	return useCallback(() => {
		return getAnalytics()?.getUser();
	}, []);
};

/**
 * Hook to capture exceptions
 *
 * @example
 * ```tsx
 * const captureException = useCaptureException();
 *
 * try { ... } catch (error) {
 *   captureException(error as Error, { component: 'Checkout' });
 * }
 * ```
 */
export const useCaptureException = () => {
	return useCallback((error: Error, context?: Record<string, unknown>) => {
		getAnalytics()?.captureException(error, context);
	}, []);
};

/**
 * Hook to send structured log events
 *
 * @example
 * ```tsx
 * const log = useLog();
 *
 * log('User completed onboarding', 'info', { step: 3 });
 * ```
 */
export const useLog = () => {
	return useCallback(
		(message: string, level: LogLevel, metadata?: Record<string, unknown>) => {
			getAnalytics()?.log(message, level, metadata);
		},
		[],
	);
};

/**
 * Factory helper to create lifecycle hooks
 */
const createLifecycleHook = <T>(method: keyof Analytics) => {
	return () =>
		useCallback((props?: T) => {
			const analytics = getAnalytics();
			if (analytics && method in analytics) {
				(analytics[method] as (p?: T) => void)?.(props);
			}
		}, []);
};

/**
 * Hook to track user signups
 *
 * @example
 * ```tsx
 * const signup = useSignup();
 * signup({ method: 'google', plan: 'free' });
 * ```
 */
export const useSignup = createLifecycleHook<SignupProps>("signup");

/**
 * Hook to track user logins
 *
 * @example
 * ```tsx
 * const login = useLogin();
 * login({ method: 'passkey' });
 * ```
 */
export const useLogin = createLifecycleHook<LoginProps>("login");

/**
 * Hook to track user logouts
 *
 * @example
 * ```tsx
 * const logout = useLogout();
 * logout({ reason: 'manual' });
 * ```
 */
export const useLogout = createLifecycleHook<LogoutProps>("logout");

/**
 * Hook to track account deletion
 *
 * @example
 * ```tsx
 * const accountDeleted = useAccountDeleted();
 * accountDeleted({ reason: 'too_expensive', tenure: 90 });
 * ```
 */
export const useAccountDeleted =
	createLifecycleHook<AccountDeletedProps>("accountDeleted");

/**
 * Hook to track subscription start
 *
 * @example
 * ```tsx
 * const subscriptionStarted = useSubscriptionStarted();
 * subscriptionStarted({ plan: 'pro', interval: 'yearly', mrr: 99 });
 * ```
 */
export const useSubscriptionStarted =
	createLifecycleHook<SubscriptionStartedProps>("subscriptionStarted");

/**
 * Hook to track subscription cancellation
 *
 * @example
 * ```tsx
 * const subscriptionCancelled = useSubscriptionCancelled();
 * subscriptionCancelled({ plan: 'pro', reason: 'too_expensive' });
 * ```
 */
export const useSubscriptionCancelled =
	createLifecycleHook<SubscriptionCancelledProps>("subscriptionCancelled");

/**
 * Hook to track subscription renewal
 *
 * @example
 * ```tsx
 * const subscriptionRenewed = useSubscriptionRenewed();
 * subscriptionRenewed({ plan: 'pro', renewalCount: 12 });
 * ```
 */
export const useSubscriptionRenewed =
	createLifecycleHook<SubscriptionRenewedProps>("subscriptionRenewed");

/**
 * Hook to track plan upgrade
 *
 * @example
 * ```tsx
 * const planUpgraded = usePlanUpgraded();
 * planUpgraded({ fromPlan: 'starter', toPlan: 'pro', mrrChange: 50 });
 * ```
 */
export const usePlanUpgraded =
	createLifecycleHook<PlanUpgradedProps>("planUpgraded");

/**
 * Hook to track plan downgrade
 *
 * @example
 * ```tsx
 * const planDowngraded = usePlanDowngraded();
 * planDowngraded({ fromPlan: 'pro', toPlan: 'starter', reason: 'budget' });
 * ```
 */
export const usePlanDowngraded =
	createLifecycleHook<PlanDowngradedProps>("planDowngraded");

/**
 * Hook to track trial start
 *
 * @example
 * ```tsx
 * const trialStarted = useTrialStarted();
 * trialStarted({ plan: 'pro', trialDays: 14 });
 * ```
 */
export const useTrialStarted =
	createLifecycleHook<TrialStartedProps>("trialStarted");

/**
 * Hook to track trial end
 *
 * @example
 * ```tsx
 * const trialEnded = useTrialEnded();
 * trialEnded({ plan: 'pro', converted: true });
 * ```
 */
export const useTrialEnded = createLifecycleHook<TrialEndedProps>("trialEnded");

/**
 * Hook to track invite sent
 *
 * @example
 * ```tsx
 * const inviteSent = useInviteSent();
 * inviteSent({ inviteEmail: 'colleague@example.com', role: 'editor' });
 * ```
 */
export const useInviteSent = createLifecycleHook<InviteSentProps>("inviteSent");

/**
 * Hook to track invite accepted
 *
 * @example
 * ```tsx
 * const inviteAccepted = useInviteAccepted();
 * inviteAccepted({ invitedBy: 'user_123', role: 'editor' });
 * ```
 */
export const useInviteAccepted =
	createLifecycleHook<InviteAcceptedProps>("inviteAccepted");

/**
 * Hook to track feature activation
 *
 * @example
 * ```tsx
 * const featureActivated = useFeatureActivated();
 * featureActivated({ feature: 'dark_mode', isFirstTime: true });
 * ```
 */
export const useFeatureActivated =
	createLifecycleHook<FeatureActivatedProps>("featureActivated");
