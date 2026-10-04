import { loadAuthorization } from "../auth/authorization";
import { supabaseClient } from "./supabase";

export type TradingToolsPlan =
    | "free"
    | "lite"
    | "pro"
    | "pro_plus"
    | "enterprise";

export type LaunchTradingToolsPlan =
    | "free"
    | "lite"
    | "pro";

export type EntitlementFeature =
    | "trade_setups"
    | "saved_calculations"
    | "watchlist_items";

export interface AccountEntitlementState {
    userId: string;
    plan: TradingToolsPlan;
    ownerOverride: boolean;
    updatedAt: string | null;
}

export interface AccountUsageState {
    tradeSetups: number;
    savedCalculations: number;
    watchlistItems: number;
}

interface AccountEntitlementRow {
    plan:
        | TradingToolsPlan
        | null;
    updated_at:
        | string
        | null;
}

type FeatureLimits = Record<
    EntitlementFeature,
    number | null
>;

const planRank: Record<
    TradingToolsPlan,
    number
> = {
    free: 0,
    lite: 1,
    pro: 2,
    pro_plus: 3,
    enterprise: 4
};

const planLimits: Record<
    TradingToolsPlan,
    FeatureLimits
> = {
    free: {
        trade_setups: 10,
        saved_calculations: 50,
        watchlist_items: 10
    },

    lite: {
        trade_setups: 100,
        saved_calculations: 500,
        watchlist_items: 50
    },

    pro: {
        trade_setups: null,
        saved_calculations: null,
        watchlist_items: null
    },

    pro_plus: {
        trade_setups: null,
        saved_calculations: null,
        watchlist_items: null
    },

    enterprise: {
        trade_setups: null,
        saved_calculations: null,
        watchlist_items: null
    }
};

const isTradingToolsPlan = (
    value: unknown
): value is TradingToolsPlan => {
    return (
        value === "free" ||
        value === "lite" ||
        value === "pro" ||
        value === "pro_plus" ||
        value === "enterprise"
    );
};

export const getFeatureLimit = (
    plan: TradingToolsPlan,
    feature: EntitlementFeature
): number | null => {
    return planLimits[
        plan
    ][feature];
};

export const getFeatureUsage = (
    usage: AccountUsageState,
    feature: EntitlementFeature
): number => {
    switch (feature) {
        case "trade_setups":
            return usage.tradeSetups;

        case "saved_calculations":
            return usage.savedCalculations;

        case "watchlist_items":
            return usage.watchlistItems;
    }
};

export const getAccountEntitlementState =
    async (
        userId: string
    ): Promise<AccountEntitlementState> => {
        const [
            entitlementResult,
            authorization
        ] = await Promise.all([
            supabaseClient
                .from(
                    "account_entitlements"
                )
                .select(
                    "plan, updated_at"
                )
                .eq(
                    "user_id",
                    userId
                )
                .maybeSingle(),

            loadAuthorization(
                userId
            )
        ]);

        if (
            entitlementResult.error
        ) {
            throw entitlementResult.error;
        }

        const row =
            entitlementResult.data as
                | AccountEntitlementRow
                | null;

        return {
            userId,

            plan:
                isTradingToolsPlan(
                    row?.plan
                )
                    ? row.plan
                    : "free",

            ownerOverride:
                authorization.permissions.has(
                    "system.full_control"
                ),

            updatedAt:
                row?.updated_at ??
                null
        };
    };

export const getAccountUsage =
    async (
        userId: string
    ): Promise<AccountUsageState> => {
        const [
            tradeSetupsResult,
            calculationsResult,
            watchlistResult
        ] = await Promise.all([
            supabaseClient
                .from(
                    "trade_setups"
                )
                .select(
                    "id",
                    {
                        count: "exact",
                        head: true
                    }
                )
                .eq(
                    "user_id",
                    userId
                ),

            supabaseClient
                .from(
                    "saved_calculations"
                )
                .select(
                    "id",
                    {
                        count: "exact",
                        head: true
                    }
                )
                .eq(
                    "user_id",
                    userId
                ),

            supabaseClient
                .from(
                    "watchlist_items"
                )
                .select(
                    "id",
                    {
                        count: "exact",
                        head: true
                    }
                )
                .eq(
                    "user_id",
                    userId
                )
        ]);

        if (
            tradeSetupsResult.error
        ) {
            throw tradeSetupsResult.error;
        }

        if (
            calculationsResult.error
        ) {
            throw calculationsResult.error;
        }

        if (
            watchlistResult.error
        ) {
            throw watchlistResult.error;
        }

        return {
            tradeSetups:
                tradeSetupsResult.count ??
                0,

            savedCalculations:
                calculationsResult.count ??
                0,

            watchlistItems:
                watchlistResult.count ??
                0
        };
    };

export const planSatisfies =
    (
        currentPlan: TradingToolsPlan,
        requiredPlan: TradingToolsPlan
    ): boolean => {
        return (
            planRank[currentPlan] >=
            planRank[requiredPlan]
        );
    };

export const hasPlanAccess =
    (
        entitlement:
            AccountEntitlementState,
        requiredPlan:
            TradingToolsPlan
    ): boolean => {
        return (
            entitlement.ownerOverride ||
            planSatisfies(
                entitlement.plan,
                requiredPlan
            )
        );
    };

export const canCreateWithinLimit =
    (
        entitlement:
            AccountEntitlementState,
        usage:
            AccountUsageState,
        feature:
            EntitlementFeature
    ): boolean => {
        if (
            entitlement.ownerOverride
        ) {
            return true;
        }

        const limit =
            getFeatureLimit(
                entitlement.plan,
                feature
            );

        if (
            limit === null
        ) {
            return true;
        }

        return (
            getFeatureUsage(
                usage,
                feature
            ) < limit
        );
    };