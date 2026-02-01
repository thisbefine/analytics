/**
 * @thisbefine/analytics/react
 *
 * React integration for Thisbefine Analytics.
 *
 * @example
 * ```tsx
 * import { Analytics, useTrack } from '@thisbefine/analytics/react';
 *
 * // Add to your root layout (reads from NEXT_PUBLIC_TBF_API_KEY)
 * function RootLayout({ children }) {
 *   return (
 *     <html>
 *       <body>
 *         {children}
 *         <Analytics />
 *       </body>
 *     </html>
 *   );
 * }
 *
 * // Use in components
 * function SignupButton() {
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
	AccountTraits,
	Analytics as AnalyticsInstance,
	AnalyticsConfig,
	UserState,
	UserTraits,
} from "./core/types";

export type { AnalyticsProps } from "./react/analytics";
export { Analytics } from "./react/analytics";

export type { BugReportFABProps } from "./react/bug-report-widget";
export { BugReportFAB } from "./react/bug-report-widget";

export {
	useAnalytics,
	useCaptureException,
	useGetUser,
	useGroup,
	useIdentify,
	useLog,
	usePage,
	useReset,
	useTrack,
} from "./react/hooks";
