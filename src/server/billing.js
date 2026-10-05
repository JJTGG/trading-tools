import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const PLAN_ENV_NAMES = {
    lite: "NOWPAYMENTS_LITE_PLAN_ID",
    pro: "NOWPAYMENTS_PRO_PLAN_ID"
};

const PLAN_NAMES = new Set(["lite", "pro"]);

const NOWPAYMENTS_JWT_TTL_MS = 4 * 60 * 1000;

let nowPaymentsJwt = null;
let nowPaymentsJwtExpiresAt = 0;
let nowPaymentsAuthPromise = null;

export class BillingHttpError extends Error {
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}

const getRequiredEnv = (name) => {
    const value = process.env[name]?.trim();

    if (!value) {
        throw new BillingHttpError(
            500,
            "Billing is not configured."
        );
    }

    return value;
};

export const getSupabaseAdmin = () =>
    createClient(
        getRequiredEnv("SUPABASE_URL"),
        getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        }
    );

export const normalizeEmail = (email) =>
    String(email || "").trim().toLowerCase();

export const authenticateRequest = async (request) => {
    const authorization =
        request.headers.authorization ||
        request.headers.Authorization;

    if (
        typeof authorization !== "string" ||
        !authorization.startsWith("Bearer ")
    ) {
        throw new BillingHttpError(
            401,
            "Authentication is required."
        );
    }

    const token = authorization.slice(7).trim();

    if (!token) {
        throw new BillingHttpError(
            401,
            "Authentication is required."
        );
    }

    const supabase = getSupabaseAdmin();

    const {
        data: { user },
        error
    } = await supabase.auth.getUser(token);

    if (error || !user) {
        throw new BillingHttpError(
            401,
            "Your session is invalid or expired."
        );
    }

    if (!user.email) {
        throw new BillingHttpError(
            400,
            "A verified email address is required for billing."
        );
    }

    if (!user.email_confirmed_at) {
        throw new BillingHttpError(
            403,
            "Confirm your email before starting a paid plan."
        );
    }

    return {
        user,
        email: normalizeEmail(user.email)
    };
};

export const getLaunchPlan = (plan) => {
    const normalized = String(plan || "")
        .trim()
        .toLowerCase();

    if (!PLAN_NAMES.has(normalized)) {
        throw new BillingHttpError(
            400,
            "Only Lite and Pro plans are available for billing right now."
        );
    }

    const envName = PLAN_ENV_NAMES[normalized];
    const rawId = getRequiredEnv(envName);
    const numericId = Number(rawId);

    if (
        !Number.isSafeInteger(numericId) ||
        numericId <= 0
    ) {
        throw new BillingHttpError(
            500,
            `${envName} is invalid.`
        );
    }

    return {
        plan: normalized,
        providerPlanId: rawId,
        providerPlanNumber: numericId
    };
};

export const getNowPaymentsBaseUrl = () =>
    (
        process.env.NOWPAYMENTS_API_BASE_URL?.trim() ||
        "https://api.nowpayments.io"
    ).replace(/\/$/, "");

const parseProviderResponse = async (response) => {
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

const getNowPaymentsCredentials = () => ({
    email: getRequiredEnv("NOWPAYMENTS_EMAIL"),
    password: getRequiredEnv("NOWPAYMENTS_PASSWORD")
});

const clearNowPaymentsJwt = () => {
    nowPaymentsJwt = null;
    nowPaymentsJwtExpiresAt = 0;
};

const getNowPaymentsJwt = async ({
    forceRefresh = false
} = {}) => {
    if (
        !forceRefresh &&
        nowPaymentsJwt &&
        Date.now() < nowPaymentsJwtExpiresAt
    ) {
        return nowPaymentsJwt;
    }

    if (nowPaymentsAuthPromise) {
        return nowPaymentsAuthPromise;
    }

    nowPaymentsAuthPromise = (async () => {
        const {
            email,
            password
        } = getNowPaymentsCredentials();

        const response = await fetch(
            `${getNowPaymentsBaseUrl()}/v1/auth`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    email,
                    password
                })
            }
        );

        const data = await parseProviderResponse(response);

        if (!response.ok) {
            console.error(
                "NOWPayments authentication failed",
                {
                    status: response.status,
                    code: data?.code
                }
            );

            throw new BillingHttpError(
                502,
                "The payment provider authentication failed."
            );
        }

        const token = data?.token;

        if (
            typeof token !== "string" ||
            !token.trim()
        ) {
            console.error(
                "NOWPayments authentication response did not contain a token"
            );

            throw new BillingHttpError(
                502,
                "The payment provider returned an invalid authentication response."
            );
        }

        nowPaymentsJwt = token.trim();
        nowPaymentsJwtExpiresAt =
            Date.now() + NOWPAYMENTS_JWT_TTL_MS;

        return nowPaymentsJwt;
    })();

    try {
        return await nowPaymentsAuthPromise;
    } finally {
        nowPaymentsAuthPromise = null;
    }
};

const executeNowPaymentsRequest = async ({
    path,
    method = "GET",
    body
}) => {
    const apiKey = getRequiredEnv("NOWPAYMENTS_API_KEY");
    const jwt = await getNowPaymentsJwt();

    return fetch(
        `${getNowPaymentsBaseUrl()}${path}`,
        {
            method,
            headers: {
                "x-api-key": apiKey,
                "Authorization": `Bearer ${jwt}`,
                ...(body === undefined
                    ? {}
                    : {
                        "Content-Type": "application/json"
                    })
            },
            ...(body === undefined
                ? {}
                : {
                    body: JSON.stringify(body)
                })
        }
    );
};

const executeNowPaymentsRequestWithRefresh = async ({
    path,
    method = "GET",
    body
}) => {
    let response = await executeNowPaymentsRequest({
        path,
        method,
        body
    });

    if (!response.ok) {
        const firstData = await parseProviderResponse(response);

        const shouldRefresh =
            response.status === 401 ||
            (
                response.status === 403 &&
                firstData?.code === "INVALID_AUTH_TOKEN"
            );

        if (shouldRefresh) {
            clearNowPaymentsJwt();

            await getNowPaymentsJwt({
                forceRefresh: true
            });

            response = await executeNowPaymentsRequest({
                path,
                method,
                body
            });
        } else {
            return {
                response,
                data: firstData
            };
        }
    }

    return {
        response,
        data: await parseProviderResponse(response)
    };
};

const getProviderResultItems = (data) => {
    const result =
        data?.result ??
        data?.subscriptions ??
        data?.items ??
        data;

    if (Array.isArray(result)) {
        return result.filter(
            (item) =>
                item &&
                typeof item === "object"
        );
    }

    if (
        result &&
        typeof result === "object"
    ) {
        return [result];
    }

    return [];
};

const getProviderPlanIdFromPayload = (payload) => {
    const value =
        payload?.subscription_plan_id ??
        payload?.plan_id ??
        payload?.subscription?.subscription_plan_id ??
        payload?.subscription?.plan_id;

    return value === null || value === undefined
        ? null
        : String(value);
};

const getProviderSubscriptionIdFromPayload = (
    payload
) => {
    const value =
        payload?.id ??
        payload?.subscription_id ??
        payload?.sub_id ??
        payload?.subscription?.id;

    return value === null || value === undefined
        ? null
        : String(value);
};

const getProviderEmailFromPayload = (payload) => {
    const value =
        payload?.email ??
        payload?.subscriber_email ??
        payload?.subscriber?.email;

    return value
        ? normalizeEmail(value)
        : null;
};

const findProviderSubscriptionCandidate = ({
    data,
    planNumber,
    email
}) => {
    const expectedPlanId = String(planNumber);
    const expectedEmail = normalizeEmail(email);

    const candidates =
        getProviderResultItems(data);

    return candidates.find((candidate) => {
        const candidatePlanId =
            getProviderPlanIdFromPayload(candidate);

        const candidateEmail =
            getProviderEmailFromPayload(candidate);

        const candidateSubscriptionId =
            getProviderSubscriptionIdFromPayload(
                candidate
            );

        return (
            candidatePlanId === expectedPlanId &&
            candidateEmail === expectedEmail &&
            Boolean(candidateSubscriptionId)
        );
    }) || null;
};

const findNowPaymentsSubscription = async ({
    planNumber,
    email
}) => {
    const params = new URLSearchParams({
        subscription_plan_id: String(planNumber),
        limit: "100",
        offset: "0"
    });

    const {
        response,
        data
    } = await executeNowPaymentsRequestWithRefresh({
        path: `/v1/subscriptions?${params.toString()}`,
        method: "GET"
    });

    if (!response.ok) {
        console.error(
            "NOWPayments subscription reconciliation lookup failed",
            {
                status: response.status,
                code: data?.code,
                planNumber
            }
        );

        throw new BillingHttpError(
            502,
            "The payment provider subscription could not be reconciled."
        );
    }

    return findProviderSubscriptionCandidate({
        data,
        planNumber,
        email
    });
};

const isDuplicateSubscriptionError = ({
    response,
    data
}) =>
    response.status === 500 &&
    data?.code === "INTERNAL_ERROR" &&
    /already subscribed/i.test(
        String(data?.message || "")
    );

export const createNowPaymentsSubscription = async ({
    planNumber,
    email
}) => {
    const {
        response,
        data
    } = await executeNowPaymentsRequestWithRefresh({
        path: "/v1/subscriptions",
        method: "POST",
        body: {
            subscription_plan_id: planNumber,
            email
        }
    });

    if (!response.ok) {
        if (
            isDuplicateSubscriptionError({
                response,
                data
            })
        ) {
            const existingSubscription =
                await findNowPaymentsSubscription({
                    planNumber,
                    email
                });

            if (existingSubscription) {
                const providerSubscriptionId =
                    getProviderSubscriptionIdFromPayload(
                        existingSubscription
                    );

                console.info(
                    "Recovered existing NOWPayments subscription",
                    {
                        providerSubscriptionId,
                        planNumber
                    }
                );

                return {
                    providerSubscriptionId,
                    providerPayload:
                        existingSubscription
                };
            }
        }

        console.error(
            "NOWPayments subscription creation failed",
            {
                status: response.status,
                code: data?.code,
                planNumber
            }
        );

        throw new BillingHttpError(
            502,
            "The payment provider could not start your subscription."
        );
    }

    const result = getProviderResultItems(data).find(
        (item) =>
            getProviderSubscriptionIdFromPayload(
                item
            )
    );

    const providerSubscriptionId =
        getProviderSubscriptionIdFromPayload(
            result
        );

    if (!providerSubscriptionId) {
        console.error(
            "NOWPayments subscription response did not contain an id",
            {
                resultShape: Array.isArray(data?.result)
                    ? "array"
                    : typeof data?.result
            }
        );

        throw new BillingHttpError(
            502,
            "The payment provider returned an invalid subscription response."
        );
    }

    return {
        providerSubscriptionId,
        providerPayload: result
    };
};

export const getNowPaymentsSubscription = async (
    subscriptionId
) => {
    const providerSubscriptionId =
        String(subscriptionId || "").trim();

    if (!providerSubscriptionId) {
        throw new BillingHttpError(
            502,
            "The payment provider subscription ID is missing."
        );
    }

    const {
        response,
        data
    } = await executeNowPaymentsRequestWithRefresh({
        path: `/v1/subscriptions/${encodeURIComponent(
            providerSubscriptionId
        )}`,
        method: "GET"
    });

    if (!response.ok) {
        console.error(
            "NOWPayments subscription lookup failed",
            {
                status: response.status,
                subscriptionId: providerSubscriptionId,
                code: data?.code
            }
        );

        throw new BillingHttpError(
            502,
            "The payment provider subscription could not be verified."
        );
    }

    const items =
        getProviderResultItems(data);

    return items[0] || data;
};

const sortObject = (value) => {
    if (Array.isArray(value)) {
        return value.map(sortObject);
    }

    if (
        value !== null &&
        typeof value === "object"
    ) {
        return Object.keys(value)
            .sort()
            .reduce((result, key) => {
                result[key] = sortObject(value[key]);
                return result;
            }, {});
    }

    return value;
};

export const verifyNowPaymentsSignature = (
    payload,
    signature
) => {
    const secret = getRequiredEnv(
        "NOWPAYMENTS_IPN_SECRET"
    );

    const received = String(signature || "")
        .trim()
        .toLowerCase();

    if (!/^[a-f0-9]{128}$/.test(received)) {
        return false;
    }

    const canonicalPayload =
        JSON.stringify(sortObject(payload));

    const expected = crypto
        .createHmac("sha512", secret)
        .update(canonicalPayload)
        .digest("hex");

    return crypto.timingSafeEqual(
        Buffer.from(expected, "hex"),
        Buffer.from(received, "hex")
    );
};

export const getRequestJson = async (request) => {
    if (
        request.body !== undefined &&
        request.body !== null
    ) {
        if (
            typeof request.body === "object" &&
            !Buffer.isBuffer(request.body)
        ) {
            return request.body;
        }

        if (typeof request.body === "string") {
            try {
                return JSON.parse(request.body);
            } catch {
                throw new BillingHttpError(
                    400,
                    "Request body must be valid JSON."
                );
            }
        }
    }

    let raw = "";

    for await (const chunk of request) {
        raw += chunk;
    }

    if (!raw) {
        throw new BillingHttpError(
            400,
            "Request body is required."
        );
    }

    try {
        return JSON.parse(raw);
    } catch {
        throw new BillingHttpError(
            400,
            "Request body must be valid JSON."
        );
    }
};

export const getProviderPlanId = (payload) =>
    getProviderPlanIdFromPayload(payload);

export const getProviderSubscriptionId = (payload) =>
    getProviderSubscriptionIdFromPayload(payload);

export const getProviderEmail = (payload) =>
    getProviderEmailFromPayload(payload);

export const getProviderPaymentId = (payload) => {
    const value =
        payload?.payment_id ??
        payload?.invoice_id;

    return value === null || value === undefined
        ? null
        : String(value);
};

export const getProviderPaymentStatus = (
    payload
) =>
    String(
        payload?.payment_status ??
        payload?.status ??
        ""
    )
        .trim()
        .toLowerCase();

export const getProviderAmount = (payload) => {
    const value =
        payload?.price_amount ??
        payload?.amount;

    const amount = Number(value);

    return Number.isFinite(amount) && amount > 0
        ? amount
        : null;
};

export const getProviderCurrency = (payload) => {
    const value =
        payload?.price_currency ??
        payload?.currency;

    return value
        ? String(value).trim().toLowerCase()
        : null;
};

export const getProviderPeriodEnd = (payload) => {
    const value =
        payload?.expire_date ??
        payload?.subscription_expire_date ??
        payload?.next_payment_date;

    if (!value) {
        return null;
    }

    const date = new Date(value);

    return Number.isNaN(date.getTime())
        ? null
        : date.toISOString();
};

export const isOpenBillingStatus = (status) =>
    new Set([
        "pending",
        "active",
        "past_due"
    ]).has(status);