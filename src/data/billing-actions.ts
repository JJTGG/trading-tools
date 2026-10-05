import {
    supabaseClient
} from "./supabase";

import type {
    LaunchTradingToolsPlan
} from "./entitlements";

export interface StartBillingSubscriptionResult {
    subscriptionId: string;
    status:
        | "pending"
        | "active"
        | "past_due";
    plan: LaunchTradingToolsPlan;
    providerSubscriptionId:
        | string
        | null;
    currentPeriodEnd:
        | string
        | null;
}

export const startBillingSubscription =
    async (
        plan: Exclude<
            LaunchTradingToolsPlan,
            "free"
        >
    ): Promise<
        StartBillingSubscriptionResult
    > => {
        const {
            data: {
                session
            },
            error: sessionError
        } =
            await supabaseClient.auth.getSession();

        if (sessionError) {
            throw sessionError;
        }

        if (
            !session?.access_token
        ) {
            throw new Error(
                "Your session has expired. Please sign in again."
            );
        }

        const response =
            await fetch(
                "/api/billing/subscribe",
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json",
                        Authorization:
                            `Bearer ${session.access_token}`
                    },
                    body: JSON.stringify({
                        plan
                    })
                }
            );

        const data =
            await response
                .json()
                .catch(
                    () => ({})
                );

        if (!response.ok) {
            throw new Error(
                typeof data?.error ===
                    "string"
                    ? data.error
                    : "Unable to start your paid subscription."
            );
        }

        return data as
            StartBillingSubscriptionResult;
    };