import {
    BillingHttpError,
    getNowPaymentsSubscription,
    getProviderAmount,
    getProviderCurrency,
    getProviderPaymentId,
    getProviderPaymentStatus,
    getProviderPeriodEnd,
    getProviderPlanId,
    getProviderSubscriptionId,
    getRequestJson,
    getSupabaseAdmin,
    verifyNowPaymentsSignature
} from "../../src/server/billing.js";

const sendJson = (response, status, body) => {
    response.status(status).json(body);
};

const getSignature = (request) =>
    request.headers["x-nowpayments-sig"] ||
    request.headers["X-NOWPayments-Sig"] ||
    request.headers["X-Nowpayments-Sig"] ||
    null;

export default async function handler(request, response) {
    if (request.method !== "POST") {
        response.setHeader("Allow", "POST");

        return sendJson(response, 405, {
            error: "Method not allowed."
        });
    }

    try {
        const signature = getSignature(request);

        if (
            typeof signature !== "string" ||
            !signature.trim()
        ) {
            throw new BillingHttpError(
                401,
                "Invalid payment notification."
            );
        }

        const payload = await getRequestJson(request);

        if (!verifyNowPaymentsSignature(payload, signature)) {
            throw new BillingHttpError(
                401,
                "Invalid payment notification."
            );
        }

        const providerSubscriptionId =
            getProviderSubscriptionId(payload);

        if (!providerSubscriptionId) {
            throw new BillingHttpError(
                400,
                "Payment notification is missing its subscription id."
            );
        }

        const providerPaymentStatus =
            getProviderPaymentStatus(payload);

        if (!providerPaymentStatus) {
            throw new BillingHttpError(
                400,
                "Payment notification is missing its payment status."
            );
        }

        const providerPaymentId =
            getProviderPaymentId(payload);

        const amount =
            getProviderAmount(payload);

        const currency =
            getProviderCurrency(payload);

        let periodEnd =
            getProviderPeriodEnd(payload);

        const providerPlanId =
            getProviderPlanId(payload);

        if (
            (
                providerPaymentStatus === "paid" ||
                providerPaymentStatus === "finished"
            ) &&
            !periodEnd
        ) {
            const providerSubscription =
                await getNowPaymentsSubscription(
                    providerSubscriptionId
                );

            periodEnd =
                getProviderPeriodEnd(
                    providerSubscription
                );

            if (!periodEnd) {
                throw new BillingHttpError(
                    502,
                    "The payment provider did not return a subscription period end."
                );
            }
        }

        const supabase = getSupabaseAdmin();

        const { data: subscription, error: lookupError } =
            await supabase
                .from("subscriptions")
                .select(
                    [
                        "id",
                        "plan",
                        "provider",
                        "provider_plan_id",
                        "provider_subscription_id",
                        "status"
                    ].join(",")
                )
                .eq(
                    "provider",
                    "nowpayments"
                )
                .eq(
                    "provider_subscription_id",
                    providerSubscriptionId
                )
                .maybeSingle();

        if (lookupError) {
            console.error(
                "Failed to find NOWPayments subscription",
                lookupError
            );

            throw new BillingHttpError(
                500,
                "Unable to process the payment notification."
            );
        }

        if (!subscription) {
            console.error(
                "NOWPayments subscription was not found",
                {
                    providerSubscriptionId
                }
            );

            throw new BillingHttpError(
                404,
                "Subscription was not found."
            );
        }

        if (providerPlanId !== null) {
            const localPlanId =
                subscription.provider_plan_id === null
                    ? null
                    : String(
                        subscription.provider_plan_id
                    );

            if (
                localPlanId !== null &&
                localPlanId !== providerPlanId
            ) {
                console.error(
                    "NOWPayments plan mismatch",
                    {
                        subscriptionId:
                            subscription.id,
                        localPlanId,
                        providerPlanId
                    }
                );

                throw new BillingHttpError(
                    400,
                    "Payment notification does not match the subscription plan."
                );
            }
        }

        const { data: result, error: rpcError } =
            await supabase.rpc(
                "apply_nowpayments_subscription_event",
                {
                    p_subscription_id:
                        subscription.id,
                    p_provider_payment_id:
                        providerPaymentId,
                    p_provider_status:
                        providerPaymentStatus,
                    p_payment_status:
                        providerPaymentStatus,
                    p_amount:
                        amount,
                    p_currency:
                        currency,
                    p_period_end:
                        periodEnd,
                    p_provider_payload:
                        payload
                }
            );

        if (rpcError) {
            console.error(
                "Failed to apply NOWPayments subscription event",
                {
                    subscriptionId:
                        subscription.id,
                    rpcError
                }
            );

            throw new BillingHttpError(
                500,
                "Unable to apply the payment notification."
            );
        }

        return sendJson(response, 200, {
            received: true,
            result
        });
    } catch (error) {
        if (error instanceof BillingHttpError) {
            return sendJson(
                response,
                error.status,
                {
                    error: error.message
                }
            );
        }

        console.error(
            "Unexpected NOWPayments webhook error",
            error
        );

        return sendJson(response, 500, {
            error:
                "Unable to process the payment notification."
        });
    }
}