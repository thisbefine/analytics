import { describe, expectTypeOf, it } from "vitest";
import type {
	AccountDeletedProps,
	Analytics,
	AnalyticsConfig,
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
} from "../core/types";
import { createAnalytics } from "../core/analytics";
import type { AnalyticsProps } from "../react/analytics";

describe("Public Type Surface", () => {
	it("should expose AnalyticsConfig shape", () => {
		expectTypeOf<AnalyticsConfig>().toMatchTypeOf({ apiKey: "tbf_test_key" });
	});

it("should create Analytics instance with correct methods", async () => {
	const instance = createAnalytics({ apiKey: "tbf_test_key" });
	expectTypeOf(instance).toMatchTypeOf<Analytics>();
	await instance.destroy();
});

	it("should enforce lifecycle prop types", () => {
		expectTypeOf<SignupProps>().toMatchTypeOf({});
		expectTypeOf<LoginProps>().toMatchTypeOf({});
		expectTypeOf<LogoutProps>().toMatchTypeOf({});
		expectTypeOf<AccountDeletedProps>().toMatchTypeOf({});
		expectTypeOf<SubscriptionStartedProps>().toMatchTypeOf({ plan: "pro" });
		expectTypeOf<SubscriptionCancelledProps>().toMatchTypeOf({ plan: "pro" });
		expectTypeOf<SubscriptionRenewedProps>().toMatchTypeOf({ plan: "pro" });
		expectTypeOf<PlanUpgradedProps>().toMatchTypeOf({
			fromPlan: "basic",
			toPlan: "pro",
		});
		expectTypeOf<PlanDowngradedProps>().toMatchTypeOf({
			fromPlan: "pro",
			toPlan: "basic",
		});
		expectTypeOf<TrialStartedProps>().toMatchTypeOf({ plan: "trial" });
		expectTypeOf<TrialEndedProps>().toMatchTypeOf({
			plan: "trial",
			converted: false,
		});
		expectTypeOf<InviteSentProps>().toMatchTypeOf({});
		expectTypeOf<InviteAcceptedProps>().toMatchTypeOf({});
		expectTypeOf<FeatureActivatedProps>().toMatchTypeOf({
			feature: "new-feature",
		});
	});

	it("should type Analytics React component props", () => {
		expectTypeOf<AnalyticsProps>().toMatchTypeOf({});
	});
});
