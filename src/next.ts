/**
 * @thisbefine/analytics/next
 *
 * Next.js integration for Thisbefine Analytics.
 *
 * Optimized for the App Router with automatic pageview tracking
 * on client-side navigations using usePathname/useSearchParams.
 *
 * @example
 * ```tsx
 * // app/layout.tsx
 * import { Analytics } from '@thisbefine/analytics/next';
 *
 * export default function RootLayout({ children }) {
 *   return (
 *     <html lang="en">
 *       <body>
 *         {children}
 *         <Analytics />
 *       </body>
 *     </html>
 *   );
 * }
 *
 * // components/signup-button.tsx
 * 'use client';
 * import { useTrack } from '@thisbefine/analytics/next';
 *
 * export function SignupButton() {
 *   const trackSignup = useTrack('signup_clicked');
 *
 *   return (
 *     <button onClick={() => trackSignup({ location: 'header' })}>
 *       Sign Up
 *     </button>
 *   );
 * }
 * ```
 *
 * @packageDocumentation
 */

export type {
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
} from "./core/lifecycle";
export type {
	AccountTraits,
	Analytics as AnalyticsInstance,
	AnalyticsConfig,
	UserState,
	UserTraits,
} from "./core/types";

export type { NextAnalyticsProps } from "./next/analytics";
export { Analytics } from "./next/analytics";

export type {
	AnalyticsContextValue,
	AnalyticsProviderProps,
} from "./react/context";
export {
	AnalyticsContext,
	AnalyticsProvider,
	useAnalyticsContext,
	useAnalyticsReady,
	useIsClient,
} from "./react/context";

export {
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
} from "./react/hooks";
