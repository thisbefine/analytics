"use client";

import { useEffect, useRef } from "react";
import type { BugReportWidgetOptions } from "../widget/bug-report";
import { createBugReportWidget } from "../widget/bug-report";
import { useAnalytics } from "./hooks";

export interface BugReportFABProps extends BugReportWidgetOptions {}

/**
 * React component that mounts the bug report FAB widget.
 *
 * @example
 * ```tsx
 * import { BugReportFAB } from '@thisbefine/analytics/react';
 *
 * const App = () => (
 *   <>
 *     <Analytics apiKey="tbf_xxx" />
 *     <MyApp />
 *     <BugReportFAB position="bottom-right" />
 *   </>
 * );
 * ```
 */
export const BugReportFAB = (props: BugReportFABProps) => {
	const analytics = useAnalytics();
	const destroyRef = useRef<(() => void) | null>(null);

	useEffect(() => {
		const widget = createBugReportWidget(analytics, props);
		destroyRef.current = widget.destroy;

		return () => {
			widget.destroy();
			destroyRef.current = null;
		};
	}, [analytics, props.position, props.buttonColor, props.buttonText, props]);

	return null;
};
