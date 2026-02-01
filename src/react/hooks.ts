"use client";

import { useCallback } from "react";
import { getAnalytics } from "../core/analytics";
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
