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
	AccountTraits,
	Analytics as AnalyticsInstance,
	AnalyticsConfig,
	UserState,
	UserTraits,
} from "./core/types";

export type { NextAnalyticsProps } from "./next/analytics";
export { Analytics } from "./next/analytics";

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
