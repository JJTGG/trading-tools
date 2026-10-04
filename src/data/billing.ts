import {
    getAccountEntitlementState,
    type AccountEntitlementState,
    type TradingToolsPlan
} from "./entitlements";
import { supabaseClient } from "./supabase";

export type SubscriptionStatus =
    | "pending"
    | "active"
    | "past_due"
    | "cancelled"
    | "expired"
    | "failed";

export interface BillingSubscription {
    id: string;
    userId: string;
    plan: TradingToolsPlan;
    provider: string;
    providerCustomerId: string | null;
    providerSubscriptionId: string | null;
    providerPlanId: string | null;
    status: SubscriptionStatus;
    currentPeriodStart: string | null;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
    startedAt: string | null;
    endedAt: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface BillingState {
    entitlement: AccountEntitlementState;
    subscription: BillingSubscription | null;
}

interface BillingSubscriptionRow {
    id: string;
    user_id: string;
    plan: TradingToolsPlan;
    provider: string;
    provider_customer_id: string | null;
    provider_subscription_id: string | null;
    provider_plan_id: string | null;
    status: SubscriptionStatus;
    current_period_start: string | null;
    current_period_end: string | null;
    cancel_at_period_end: boolean;
    started_at: string | null;
    ended_at: string | null;
    created_at: string;
    updated_at: string;
}

const selectColumns = [
    "id",
    "user_id",
    "plan",
    "provider",
    "provider_customer_id",
    "provider_subscription_id",
    "provider_plan_id",
    "status",
    "current_period_start",
    "current_period_end",
    "cancel_at_period_end",
    "started_at",
    "ended_at",
    "created_at",
    "updated_at"
].join(", ");

const mapSubscription = (
    row: BillingSubscriptionRow
): BillingSubscription => {
    return {
        id:
            row.id,

        userId:
            row.user_id,

        plan:
            row.plan,

        provider:
            row.provider,

        providerCustomerId:
            row.provider_customer_id,

        providerSubscriptionId:
            row.provider_subscription_id,

        providerPlanId:
            row.provider_plan_id,

        status:
            row.status,

        currentPeriodStart:
            row.current_period_start,

        currentPeriodEnd:
            row.current_period_end,

        cancelAtPeriodEnd:
            row.cancel_at_period_end,

        startedAt:
            row.started_at,

        endedAt:
            row.ended_at,

        createdAt:
            row.created_at,

        updatedAt:
            row.updated_at
    };
};

export const getSubscriptionHistory =
    async (
        userId: string
    ): Promise<BillingSubscription[]> => {
        const {
            data,
            error
        } =
            await supabaseClient
                .from(
                    "subscriptions"
                )
                .select(
                    selectColumns
                )
                .eq(
                    "user_id",
                    userId
                )
                .order(
                    "created_at",
                    {
                        ascending:
                            false
                    }
                );

        if (error) {
            throw error;
        }

        return (
            (data ||
                []) as BillingSubscriptionRow[]
        ).map(
            mapSubscription
        );
    };

export const getCurrentSubscription =
    async (
        userId: string
    ): Promise<BillingSubscription | null> => {
        const {
            data,
            error
        } =
            await supabaseClient
                .from(
                    "subscriptions"
                )
                .select(
                    selectColumns
                )
                .eq(
                    "user_id",
                    userId
                )
                .in(
                    "status",
                    [
                        "pending",
                        "active",
                        "past_due"
                    ]
                )
                .order(
                    "created_at",
                    {
                        ascending:
                            false
                    }
                )
                .limit(1)
                .maybeSingle();

        if (error) {
            throw error;
        }

        if (!data) {
            return null;
        }

        return mapSubscription(
            data as BillingSubscriptionRow
        );
    };

export const getBillingState =
    async (
        userId: string
    ): Promise<BillingState> => {
        const [
            entitlement,
            subscription
        ] = await Promise.all([
            getAccountEntitlementState(
                userId
            ),
            getCurrentSubscription(
                userId
            )
        ]);

        return {
            entitlement,
            subscription
        };
    };