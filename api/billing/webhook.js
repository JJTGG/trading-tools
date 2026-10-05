import {
    BillingHttpError,
    getProviderAmount,
    getProviderCurrency,
    getProviderEmail,
    getProviderPaymentId,
    getProviderPaymentStatus,
    getProviderPeriodEnd,
    getProviderPlanId,
    getProviderSubscriptionId,
    getRequestJson,
    getSupabaseAdmin,
    isOpenBillingStatus,
    verifyNowPaymentsSignature
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

const findSubscription = async (
    supabase,
    payload
) => {
    const providerSubscriptionId =
        getProviderSubscriptionId(
            payload
        );

    if (providerSubscriptionId) {
        const {
            data,
            error
        } =
            await supabase
                .from("subscriptions")
                .select(
                    "id, user_id, plan, provider"
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

        if (error) {
            throw error;
        }

        if (data) {
            return data;
        }
    }

    const email =
        getProviderEmail(
            payload
        );

    const providerPlanId =
        getProviderPlanId(
            payload
        );

    if (!email) {
        return null;
    }

    let query =
        supabase
            .from("subscriptions")
            .select(
                [
                    "id",
                    "user_id",
                    "plan",
                    "provider",
                    "provider_plan_id",
                    "status",
                    "updated_at"
                ].join(", ")
            )
            .eq(
                "provider",
                "nowpayments"
            )
            .eq(
                "provider_customer_id",
                email
            )
            .order(
                "updated_at",
                {
                    ascending: false
                }
            )
            .limit(25);

    if (providerPlanId) {
        query =
            query.eq(
                "provider_plan_id",
                providerPlanId
            );
    }

    const {
        data,
        error
    } = await query;

    if (error) {
        throw error;
    }

    if (!data?.length) {
        return null;
    }

    const open =
        data.find((row) =>
            isOpenBillingStatus(
                row.status
            )
        );

    return open || data[0];
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
        const payload =
            await getRequestJson(
                request
            );

        const signature =
            request.headers[
                "x-nowpayments-sig"
            ] ||
            request.headers[
                "X-NOWPayments-Sig"
            ];

        if (
            !verifyNowPaymentsSignature(
                payload,
                signature
            )
        ) {
            throw new BillingHttpError(
                401,
                "Invalid payment notification signature."
            );
        }

        const supabase =
            getSupabaseAdmin();

        const subscription =
            await findSubscription(
                supabase,
                payload
            );

        if (!subscription) {
            throw new BillingHttpError(
                422,
                "The payment notification could not be matched to a billing subscription."
            );
        }

        const providerPaymentId =
            getProviderPaymentId(
                payload
            );

        const providerStatus =
            payload?.payment_status ??
            payload?.status ??
            null;

        const paymentStatus =
            getProviderPaymentStatus(
                payload
            );

        const amount =
            getProviderAmount(
                payload
            );

        const currency =
            getProviderCurrency(
                payload
            );

        const periodEnd =
            getProviderPeriodEnd(
                payload
            );

        const {
            data,
            error
        } = await supabase.rpc(
            "apply_nowpayments_subscription_event",
            {
                p_subscription_id:
                    subscription.id,
                p_provider_payment_id:
                    providerPaymentId,
                p_provider_status:
                    providerStatus
                        ? String(
                              providerStatus
                          )
                        : null,
                p_payment_status:
                    paymentStatus,
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

        if (error) {
            throw error;
        }

        return json(
            response,
            200,
            {
                received: true,
                result: data
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
                "NOWPayments webhook failed",
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
                        : "Unable to process the payment notification."
            }
        );
    }
}