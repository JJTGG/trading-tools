import {
    BillingHttpError,
    getLaunchPlan,
    getNowPaymentsBaseUrl
} from "../../src/server/billing.js";

const parseProviderResponse = async (
    response
) => {
    const text = await response.text();

    if (!text) {
        return null;
    }

    try {
        return JSON.parse(text);
    } catch {
        return {
            raw: text
        };
    }
};

const getRequiredApiKey = () => {
    const value =
        process.env.NOWPAYMENTS_API_KEY?.trim();

    if (!value) {
        throw new BillingHttpError(
            500,
            "Billing is not configured."
        );
    }

    return value;
};

const getPlan = async (plan) => {
    const {
        providerPlanId
    } = getLaunchPlan(plan);

    const response =
        await fetch(
            `${getNowPaymentsBaseUrl()}/v1/subscriptions/plans/${encodeURIComponent(
                providerPlanId
            )}`,
            {
                method: "GET",
                headers: {
                    "x-api-key":
                        getRequiredApiKey()
                }
            }
        );

    const data =
        await parseProviderResponse(
            response
        );

    if (!response.ok) {
        console.error(
            "NOWPayments plan lookup failed",
            {
                plan,
                status:
                    response.status,
                data
            }
        );

        throw new BillingHttpError(
            502,
            "The payment provider plans could not be loaded."
        );
    }

    const result =
        data?.result || data;

    return {
        plan,
        title:
            typeof result?.title ===
            "string"
                ? result.title
                : plan === "lite"
                    ? "Trading Tools Lite"
                    : "Trading Tools Pro",
        amount:
            Number.isFinite(
                Number(
                    result?.amount
                )
            )
                ? Number(
                    result.amount
                )
                : null,
        currency:
            typeof result?.currency ===
            "string"
                ? result.currency
                    .trim()
                    .toUpperCase()
                : null,
        intervalDays:
            Number.isFinite(
                Number(
                    result?.interval_day
                )
            )
                ? Number(
                    result.interval_day
                )
                : null
    };
};

export default async (
    request,
    response
) => {
    if (
        request.method !==
        "GET"
    ) {
        response.setHeader(
            "Allow",
            "GET"
        );

        response.status(405).json({
            error:
                "Method not allowed."
        });

        return;
    }

    try {
        const plans =
            await Promise.all([
                getPlan("lite"),
                getPlan("pro")
            ]);

        response.status(200).json({
            plans
        });
    } catch (error) {
        if (
            error instanceof
            BillingHttpError
        ) {
            response
                .status(
                    error.status
                )
                .json({
                    error:
                        error.message
                });

            return;
        }

        console.error(
            "Billing plans error:",
            error
        );

        response.status(500).json({
            error:
                "Unable to load billing plans."
        });
    }
};