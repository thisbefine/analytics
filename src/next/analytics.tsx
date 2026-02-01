"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef } from "react";
import { getAnalytics, initAnalytics } from "../core/analytics";
import type { AnalyticsConfig } from "../core/types";

export interface NextAnalyticsProps {
	/**
	 * Your Thisbefine API key.
	 * If not provided, reads from NEXT_PUBLIC_TBF_API_KEY environment variable.
	 */
	apiKey?: string;

	/**
	 * API host URL.
	 * Defaults to https://thisbefine.com
	 * For local development, use http://localhost:3000
	 */
	host?: string;

	/**
	 * Enable debug logging to console.
	 * @default false
	 */
	debug?: boolean;

	/**
	 * Automatically track page views on route changes.
	 * @default true
	 */
	trackPageviews?: boolean;

	/**
	 * Additional configuration options
	 */
	config?: Omit<AnalyticsConfig, "apiKey" | "host" | "debug">;
}

/**
 * Internal component that tracks page views using Next.js navigation hooks
 */
const PageTracker = () => {
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const previousPath = useRef<string | null>(null);
	const hasTrackedInitial = useRef(false);

	useEffect(() => {
		const analytics = getAnalytics();
		if (!analytics) return;

		const search = searchParams?.toString();
		const fullPath = search ? `${pathname}?${search}` : pathname;

		if (previousPath.current === fullPath && hasTrackedInitial.current) {
			return;
		}

		analytics.page(pathname ?? undefined, {
			path: pathname,
			search: search || undefined,
			url: typeof window !== "undefined" ? window.location.href : undefined,
		});

		previousPath.current = fullPath;
		hasTrackedInitial.current = true;
	}, [pathname, searchParams]);

	return null;
};

/**
 * Next.js Analytics component - initializes Thisbefine analytics
 *
 * Optimized for the Next.js App Router with automatic pageview tracking
 * on client-side navigations using usePathname/useSearchParams.
 *
 * Add this component once at the root of your app (e.g., in layout.tsx).
 *
 * @example
 * ```tsx
 * // app/layout.tsx
 * // Zero config - reads from NEXT_PUBLIC_TBF_API_KEY
 * import { Analytics } from '@thisbefine/analytics/next';
 *
 * export default function RootLayout({ children }) {
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
 * // With explicit config
 * <Analytics apiKey="tbf_xxx" host="http://localhost:3000" debug />
 * ```
 */
export const Analytics = ({
	apiKey,
	host,
	debug = false,
	trackPageviews = true,
	config,
}: NextAnalyticsProps) => {
	const initialized = useRef(false);

	useEffect(() => {
		if (initialized.current) return;
		if (typeof window === "undefined") return;

		const resolvedApiKey = apiKey ?? process.env.NEXT_PUBLIC_TBF_API_KEY ?? "";

		if (!resolvedApiKey) {
			console.warn(
				"[Thisbefine] No API key provided. Set NEXT_PUBLIC_TBF_API_KEY or pass apiKey prop.",
			);
			return;
		}

		initAnalytics({
			apiKey: resolvedApiKey,
			host,
			debug,
			...config,
		});

		initialized.current = true;
	}, [apiKey, host, debug, config]);

	if (!trackPageviews) {
		return null;
	}

	return (
		<Suspense fallback={null}>
			<PageTracker />
		</Suspense>
	);
};
