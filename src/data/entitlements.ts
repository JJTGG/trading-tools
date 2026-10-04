import { loadAuthorization } from "../auth/authorization";
import { supabaseClient } from "./supabase";

export type TradingToolsPlan =
    | "free"
    | "lite"
    | "pro";

export interface AccountEntitlementState {
    userId: string;
    plan: TradingToolsPlan;
    ownerOverride: boolean;
    updatedAt: string | null;
}

interface AccountEntitlementRow {
    plan:
        | TradingToolsPlan
        | null;
    updated_at:
        | string
        | null;
}

const planRank: Record<
    TradingToolsPlan,
    number
> = {
    free: 0,
    lite: 1,
    pro: 2
};

const isTradingToolsPlan = (
    value: unknown
): value is TradingToolsPlan => {
    return (
        value === "free" ||
        value === "lite" ||
        value === "pro"
    );
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