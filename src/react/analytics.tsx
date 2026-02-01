"use client";

import { useEffect, useRef } from "react";
import { initAnalytics } from "../core/analytics";
import type { AnalyticsConfig } from "../core/types";

export interface AnalyticsProps {
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
	 * Automatically track page views.
	 * @default true
	 */
	trackPageviews?: boolean;

	/**
	 * Additional configuration options
	 */
	config?: Omit<AnalyticsConfig, "apiKey" | "host" | "debug">;
}

/**
 * Analytics component - initializes Thisbefine analytics
 *
 * Add this component once at the root of your app (e.g., in layout.tsx).
 * It will automatically initialize analytics and track page views.
 *
 * @example
 * ```tsx
 * // Zero config - reads from NEXT_PUBLIC_TBF_API_KEY
 * <Analytics />
 *
 * // With explicit API key
 * <Analytics apiKey="tbf_xxx" />
 *
 * // For local development
 * <Analytics apiKey="tbf_xxx" host="http://localhost:3000" />
 *
 * // With debug mode
 * <Analytics debug />
 * ```
 */
export const Analytics = ({
	apiKey,
	host,
	debug = false,
	trackPageviews = true,
	config,
}: AnalyticsProps) => {
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

		const analytics = initAnalytics({
			apiKey: resolvedApiKey,
			host,
			debug,
			...config,
		});

		initialized.current = true;

		if (trackPageviews) {
			analytics.page();
		}
	}, [apiKey, host, debug, trackPageviews, config]);

	useEffect(() => {
		if (!trackPageviews) return;
		if (typeof window === "undefined") return;

		const handlePopState = () => {
			import("../core/analytics").then(({ getAnalytics }) => {
				getAnalytics()?.page();
			});
		};

		window.addEventListener("popstate", handlePopState);
		return () => window.removeEventListener("popstate", handlePopState);
	}, [trackPageviews]);

	return null;
};
