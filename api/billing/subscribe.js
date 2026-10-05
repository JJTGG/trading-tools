import {
    authenticateRequest,
    BillingHttpError,
    createNowPaymentsSubscription,
    getLaunchPlan,
    getSupabaseAdmin
} from "../_lib/billing.js";

const sendJson = (response, status, body) => {
    response.status(status).json(body);
};

export default async function handler(request, response) {
    if (request.method !== "POST") {
        response.setHeader("Allow", "POST");
        return sendJson(response, 405, {
            error: "Method not allowed."
        });
    }

    try {
        const { user, email } =
            await authenticateRequest(request);

        const plan = request.body?.plan;
        const launchPlan = getLaunchPlan(plan);
        const supabase = getSupabaseAdmin();

        const { data: existingSubscription, error: existingError } =
            await supabase
                .from("subscriptions")
                .select(
                    [
                        "id",
                        "plan",
                        "provider",
                        "provider_subscription_id",
                        "status",
                        "current_period_end"
                    ].join(",")
                )
                .eq("user_id", user.id)
                .in("status", [
                    "pending",
                    "active",
                    "past_due"
                ])
                .order("updated_at", {
                    ascending: false
                })
                .limit(1)
                .maybeSingle();

        if (existingError) {
            console.error(
                "Failed to check existing subscription",
                existingError
            );

            throw new BillingHttpError(
                500,
                "Unable to check your current subscription."
            );
        }

        if (existingSubscription) {
            if (
                existingSubscription.plan ===
                launchPlan.plan
            ) {
                return sendJson(response, 200, {
                    subscriptionId:
                        existingSubscription.id,
                    status:
                        existingSubscription.status,
                    plan:
                        existingSubscription.plan,
                    providerSubscriptionId:
                        existingSubscription.provider_subscription_id,
                    currentPeriodEnd:
                        existingSubscription.current_period_end
                });
            }

            throw new BillingHttpError(
                409,
                "You already have an open subscription. Cancel it before changing plans."
            );
        }

        const { data: subscription, error: insertError } =
            await supabase
                .from("subscriptions")
                .insert({
                    user_id: user.id,
                    plan: launchPlan.plan,
                    provider: "nowpayments",
                    provider_plan_id:
                        launchPlan.providerPlanId,
                    status: "pending"
                })
                .select(
                    [
                        "id",
                        "plan",
                        "status"
                    ].join(",")
                )
                .single();

        if (insertError || !subscription) {
            console.error(
                "Failed to create pending subscription",
                insertError
            );

            throw new BillingHttpError(
                500,
                "Unable to start your subscription."
            );
        }

        try {
            const providerSubscription =
                await createNowPaymentsSubscription({
                    planNumber:
                        launchPlan.providerPlanNumber,
                    email
                });

            const { data: updatedSubscription, error: updateError } =
                await supabase
                    .from("subscriptions")
                    .update({
                        provider_subscription_id:
                            providerSubscription.providerSubscriptionId,
                        provider_customer_id:
                            null,
                        status: "pending"
                    })
                    .eq("id", subscription.id)
                    .eq("user_id", user.id)
                    .select(
                        [
                            "id",
                            "plan",
                            "status",
                            "provider_subscription_id",
                            "current_period_end"
                        ].join(",")
                    )
                    .single();

            if (updateError || !updatedSubscription) {
                console.error(
                    "Failed to link provider subscription",
                    updateError
                );

                throw new BillingHttpError(
                    502,
                    "The payment provider subscription was created, but we could not finish linking it."
                );
            }

            return sendJson(response, 200, {
                subscriptionId:
                    updatedSubscription.id,
                status:
                    updatedSubscription.status,
                plan:
                    updatedSubscription.plan,
                providerSubscriptionId:
                    updatedSubscription.provider_subscription_id,
                currentPeriodEnd:
                    updatedSubscription.current_period_end
            });
        } catch (error) {
            await supabase
                .from("subscriptions")
                .update({
                    status: "failed",
                    ended_at: new Date().toISOString()
                })
                .eq("id", subscription.id)
                .eq("user_id", user.id)
                .eq("status", "pending");

            throw error;
        }
    } catch (error) {
        if (error instanceof BillingHttpError) {
            return sendJson(response, error.status, {
                error: error.message
            });
        }

        console.error(
            "Unexpected billing subscription error",
            error
        );

        return sendJson(response, 500, {
            error: "Unable to start your subscription."
        });
    }
}