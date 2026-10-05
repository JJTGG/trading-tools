import {
    authenticateRequest,
    BillingHttpError,
    createNowPaymentsSubscription,
    getLaunchPlan,
    getSupabaseAdmin
} from "../_lib/billing.js";

const json = (
    response,
    status,
    body
) => {
    return response
        .status(status)
        .json(body);
};

export default async function handler(
    request,
    response
) {
    if (request.method !== "POST") {
        response.setHeader(
            "Allow",
            "POST"
        );

        return json(
            response,
            405,
            {
                error:
                    "Method not allowed."
            }
        );
    }

    try {
        const {
            user,
            email
        } =
            await authenticateRequest(
                request
            );

        const body =
            request.body &&
            typeof request.body === "object"
                ? request.body
                : {};

        const selectedPlan =
            getLaunchPlan(
                body.plan
            );

        const supabase =
            getSupabaseAdmin();

        const {
            data: existingRows,
            error: existingError
        } = await supabase
            .from("subscriptions")
            .select(
                [
                    "id",
                    "plan",
                    "status",
                    "provider_subscription_id",
                    "current_period_end"
                ].join(", ")
            )
            .eq(
                "user_id",
                user.id
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
                    ascending: false
                }
            )
            .limit(1);

        if (existingError) {
            throw existingError;
        }

        const existing =
            existingRows?.[0] ||
            null;

        if (existing) {
            if (
                String(
                    existing.plan
                ) !== selectedPlan.plan
            ) {
                throw new BillingHttpError(
                    409,
                    "You already have an open billing subscription."
                );
            }

            return json(
                response,
                200,
                {
                    subscriptionId:
                        existing.id,
                    status:
                        existing.status,
                    plan:
                        existing.plan,
                    providerSubscriptionId:
                        existing.provider_subscription_id,
                    currentPeriodEnd:
                        existing.current_period_end
                }
            );
        }

        const {
            data: createdRows,
            error: createError
        } =
            await supabase
                .from("subscriptions")
                .insert({
                    user_id:
                        user.id,
                    plan:
                        selectedPlan.plan,
                    provider:
                        "nowpayments",
                    provider_customer_id:
                        email,
                    provider_plan_id:
                        selectedPlan.providerPlanId,
                    status:
                        "pending"
                })
                .select(
                    [
                        "id",
                        "plan",
                        "status"
                    ].join(", ")
                );

        if (createError) {
            if (
                createError.code ===
                "23505"
            ) {
                throw new BillingHttpError(
                    409,
                    "A billing subscription is already being started."
                );
            }

            throw createError;
        }

        const created =
            createdRows?.[0];

        if (!created) {
            throw new BillingHttpError(
                500,
                "The billing subscription could not be created."
            );
        }

        let provider;

        try {
            provider =
                await createNowPaymentsSubscription(
                    {
                        planNumber:
                            selectedPlan.providerPlanNumber,
                        email
                    }
                );
        } catch (error) {
            await supabase
                .from("subscriptions")
                .update({
                    status:
                        "failed",
                    ended_at:
                        new Date()
                            .toISOString(),
                    updated_at:
                        new Date()
                            .toISOString()
                })
                .eq(
                    "id",
                    created.id
                )
                .eq(
                    "user_id",
                    user.id
                )
                .eq(
                    "status",
                    "pending"
                );

            throw error;
        }

        const {
            data: updatedRows,
            error: updateError
        } =
            await supabase
                .from("subscriptions")
                .update({
                    provider_subscription_id:
                        provider.providerSubscriptionId,
                    updated_at:
                        new Date()
                            .toISOString()
                })
                .eq(
                    "id",
                    created.id
                )
                .eq(
                    "user_id",
                    user.id
                )
                .select(
                    [
                        "id",
                        "plan",
                        "status",
                        "provider_subscription_id",
                        "current_period_end"
                    ].join(", ")
                );

        if (updateError) {
            console.error(
                "Local billing subscription could not store provider id",
                updateError
            );

            throw new BillingHttpError(
                500,
                "The billing subscription could not be finalized."
            );
        }

        const updated =
            updatedRows?.[0];

        return json(
            response,
            201,
            {
                subscriptionId:
                    updated.id,
                status:
                    updated.status,
                plan:
                    updated.plan,
                providerSubscriptionId:
                    updated.provider_subscription_id,
                currentPeriodEnd:
                    updated.current_period_end
            }
        );
    } catch (error) {
        const status =
            error instanceof
            BillingHttpError
                ? error.status
                : 500;

        if (
            !(error instanceof
                BillingHttpError)
        ) {
            console.error(
                "Billing subscription endpoint failed",
                error
            );
        }

        return json(
            response,
            status,
            {
                error:
                    error instanceof
                    BillingHttpError
                        ? error.message
                        : "Unable to start your paid subscription."
            }
        );
    }
}