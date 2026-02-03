"use client";

import {
	createContext,
	type ReactNode,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import {
	getAnalytics as getGlobalAnalytics,
	initAnalytics,
} from "../core/analytics";
import type { Analytics, AnalyticsConfig } from "../core/types";

/**
 * Analytics context value
 */
export interface AnalyticsContextValue {
	/** The Analytics instance (null during SSR or before initialization) */
	analytics: Analytics | null;
	/** Whether analytics is ready to use (false during SSR) */
	isReady: boolean;
	/** Whether we're on the client side (for hydration safety) */
	isClient: boolean;
}

/**
 * React Context for Analytics
 */
export const AnalyticsContext = createContext<AnalyticsContextValue>({
	analytics: null,
	isReady: false,
	isClient: false,
});

/**
 * Props for AnalyticsProvider
 */
export interface AnalyticsProviderProps {
	/**
	 * Your Thisbefine API key.
	 * If not provided, reads from NEXT_PUBLIC_TBF_API_KEY environment variable.
	 */
	apiKey?: string;

	/**
	 * API host URL.
	 * Defaults to https://thisbefine.com
	 */
	host?: string;

	/**
	 * Enable debug logging to console.
	 * @default false
	 */
	debug?: boolean;

	/**
	 * Automatically track page views.
	 * @default true
	 */
	trackPageviews?: boolean;

	/**
	 * Additional configuration options
	 */
	config?: Omit<AnalyticsConfig, "apiKey" | "host" | "debug">;

	/**
	 * Children to render
	 */
	children: ReactNode;
}

/**
 * Analytics Provider - initializes and provides Analytics context
 *
 * Wrap your app with this provider to use analytics hooks.
 *
 * @example
 * ```tsx
 *
 * import { AnalyticsProvider } from '@thisbefine/analytics/react';
 *
 * export default function RootLayout({ children }) {
 *   return (
 *     <html>
 *       <body>
 *         <AnalyticsProvider apiKey="tbf_xxx">
 *           {children}
 *         </AnalyticsProvider>
 *       </body>
 *     </html>
 *   );
 * }
 * ```
 */
export const AnalyticsProvider = ({
	apiKey,
	host,
	debug = false,
	trackPageviews = true,
	config,
	children,
}: AnalyticsProviderProps) => {
	const [analytics, setAnalytics] = useState<Analytics | null>(null);
	const [isReady, setIsReady] = useState(false);
	const [isClient, setIsClient] = useState(false);
	const initialized = useRef(false);

	useEffect(() => {
		setIsClient(true);
	}, []);

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

		const instance = initAnalytics({
			apiKey: resolvedApiKey,
			host,
			debug,
			...config,
		});

		initialized.current = true;
		setAnalytics(instance);
		setIsReady(true);

		if (trackPageviews) {
			instance.page();
		}
	}, [apiKey, host, debug, config, trackPageviews]);

	useEffect(() => {
		if (!trackPageviews || !analytics) return;
		if (typeof window === "undefined") return;

		const handlePopState = () => {
			analytics.page();
		};

		window.addEventListener("popstate", handlePopState);
		return () => window.removeEventListener("popstate", handlePopState);
	}, [trackPageviews, analytics]);

	const value = useMemo(
		() => ({ analytics, isReady, isClient }),
		[analytics, isReady, isClient],
	);

	return (
		<AnalyticsContext.Provider value={value}>
			{children}
		</AnalyticsContext.Provider>
	);
};

/**
 * Hook to access the Analytics context
 *
 * SSR-safe: returns isClient=false and analytics=null during server rendering.
 * Use isReady to check if analytics is initialized.
 *
 * For backward compatibility, falls back to global analytics instance if
 * no AnalyticsProvider is used (e.g., when using the <Analytics /> component).
 */
export const useAnalyticsContext = (): AnalyticsContextValue => {
	const context = useContext(AnalyticsContext);

	if (context.analytics || context.isReady || context.isClient) {
		return context;
	}

	const globalAnalytics = getGlobalAnalytics();
	if (globalAnalytics) {
		return { analytics: globalAnalytics, isReady: true, isClient: true };
	}

	return context;
};

/**
 * Hook to check if we're on the client side
 * Useful for SSR hydration safety
 */
export const useIsClient = (): boolean => {
	const [isClient, setIsClient] = useState(false);

	useEffect(() => {
		setIsClient(true);
	}, []);

	return isClient;
};

/**
 * Hook to check if analytics is ready
 * Combines isClient and isReady checks
 */
export const useAnalyticsReady = (): boolean => {
	const { isReady, isClient } = useAnalyticsContext();
	return isClient && isReady;
};
