import "../styles/tokens.css";
import "../styles/base.css";
import "../styles/app-shell.css";
import "./account.css";
import "./billing.css";

import {
    getClient,
    requireAccountProfile
} from "../auth/runtime";

import {
    getBillingState,
    type BillingState
} from "../data/billing";

import {
    startBillingSubscription
} from "../data/billing-actions";

import {
    getFeatureLimit,
    type LaunchTradingToolsPlan
} from "../data/entitlements";

interface BillingPlan {
    plan: Exclude<
        LaunchTradingToolsPlan,
        "free"
    >;
    title: string;
    amount: number | null;
    currency: string | null;
    intervalDays: number | null;
}

interface BillingPlansResponse {
    plans: BillingPlan[];
}

const message =
    document.querySelector<HTMLElement>(
        "#billing-message"
    );

const status =
    document.querySelector<HTMLElement>(
        "#billing-status"
    );

const currentPlan =
    document.querySelector<HTMLElement>(
        "#current-plan"
    );

const currentPlanStatus =
    document.querySelector<HTMLElement>(
        "#current-plan-status"
    );

const currentPlanName =
    document.querySelector<HTMLElement>(
        "#current-plan-name"
    );

const currentSubscriptionStatus =
    document.querySelector<HTMLElement>(
        "#current-subscription-status"
    );

const currentPeriodEnd =
    document.querySelector<HTMLElement>(
        "#current-period-end"
    );

const planGrid =
    document.querySelector<HTMLElement>(
        "#plan-grid"
    );

const logoutButton =
    document.querySelector<HTMLButtonElement>(
        "#logout-button"
    );

let billingState:
    BillingState | null = null;

const setMessage = (
    text: string,
    state:
        | "error"
        | "success"
        | "neutral"
): void => {
    if (!message) {
        return;
    }

    message.hidden = false;
    message.textContent = text;
    message.dataset.state = state;
};

const clearMessage = (): void => {
    if (!message) {
        return;
    }

    message.hidden = true;
    message.textContent = "";
    delete message.dataset.state;
};

const formatPlanName = (
    plan: string
): string => {
    switch (plan) {
        case "pro":
            return "Pro";

        case "lite":
            return "Lite";

        case "pro_plus":
            return "Pro+";

        case "enterprise":
            return "Enterprise";

        default:
            return "Free";
    }
};

const formatStatus = (
    value: string
): string => {
    return value
        .replaceAll("_", " ")
        .replace(
            /\b\w/g,
            (character) =>
                character.toUpperCase()
        );
};

const formatLimit = (
    plan: LaunchTradingToolsPlan,
    feature:
        | "trade_setups"
        | "saved_calculations"
        | "watchlist_items"
): string => {
    const limit =
        getFeatureLimit(
            plan,
            feature
        );

    return limit === null
        ? "Unlimited"
        : limit.toLocaleString();
};

const formatPrice = (
    plan: BillingPlan
): string => {
    if (
        plan.amount === null
    ) {
        return "Price unavailable";
    }

    const amount =
        plan.amount.toLocaleString(
            undefined,
            {
                minimumFractionDigits:
                    plan.amount % 1 === 0
                        ? 0
                        : 2,
                maximumFractionDigits:
                    2
            }
        );

    const currency =
        plan.currency ||
        "USD";

    return `${currency} ${amount}`;
};

const formatPeriod = (
    days: number | null
): string => {
    if (!days) {
        return "";
    }

    if (days === 31) {
        return "31 days";
    }

    return `${days} days`;
};

const formatDate = (
    value: string | null
): string => {
    if (!value) {
        return "—";
    }

    const date =
        new Date(value);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return "—";
    }

    return date.toLocaleDateString(
        undefined,
        {
            year: "numeric",
            month: "short",
            day: "numeric"
        }
    );
};

const isCurrentPlan = (
    plan: BillingPlan
): boolean => {
    if (!billingState) {
        return false;
    }

    return (
        billingState.entitlement.plan ===
        plan.plan
    );
};

const isPendingPlan = (
    plan: BillingPlan
): boolean => {
    return (
        billingState?.subscription?.plan ===
            plan.plan &&
        billingState.subscription.status ===
            "pending"
    );
};

const renderCurrentPlan = (): void => {
    if (
        !billingState ||
        !currentPlan ||
        !currentPlanName ||
        !currentSubscriptionStatus ||
        !currentPeriodEnd ||
        !currentPlanStatus
    ) {
        return;
    }

    const entitlement =
        billingState.entitlement;

    const subscription =
        billingState.subscription;

    if (
        entitlement.ownerOverride
    ) {
        currentPlan.hidden = false;
        currentPlanName.textContent =
            "Owner";

        currentSubscriptionStatus.textContent =
            "Full access";

        currentPeriodEnd.textContent =
            "No billing limit";

        currentPlanStatus.textContent =
            "Full access";

        return;
    }

    if (
        entitlement.plan ===
        "free" &&
        !subscription
    ) {
        currentPlan.hidden = true;
        return;
    }

    currentPlan.hidden = false;

    currentPlanName.textContent =
        formatPlanName(
            entitlement.plan
        );

    currentSubscriptionStatus.textContent =
        subscription
            ? formatStatus(
                subscription.status
            )
            : "Active";

    currentPeriodEnd.textContent =
        formatDate(
            subscription?.currentPeriodEnd ||
            null
        );

    currentPlanStatus.textContent =
        subscription
            ? formatStatus(
                subscription.status
            )
            : "Active";
};

const createFeatureList = (
    plan:
        | LaunchTradingToolsPlan
): string => {
    return `
        <li>
            ${formatLimit(
                plan,
                "trade_setups"
            )}
            trade setups
        </li>

        <li>
            ${formatLimit(
                plan,
                "saved_calculations"
            )}
            saved calculations
        </li>

        <li>
            ${formatLimit(
                plan,
                "watchlist_items"
            )}
            watchlist items
        </li>
    `;
};

const renderPlans = (
    plans: BillingPlan[]
): void => {
    if (!planGrid) {
        return;
    }

    planGrid.innerHTML =
        plans
            .map(
                (plan) => {
                    const current =
                        isCurrentPlan(
                            plan
                        );

                    const pending =
                        isPendingPlan(
                            plan
                        );

                    const disabled =
                        current ||
                        pending;

                    return `
                        <article
                            class="billing-plan ${
                                plan.plan ===
                                "pro"
                                    ? "billing-plan-featured"
                                    : ""
                            }"
                        >

                            <div class="billing-plan-header">

                                <div>
                                    <span class="billing-plan-kicker">
                                        Trading Tools
                                    </span>

                                    <h2>
                                        ${formatPlanName(
                                            plan.plan
                                        )}
                                    </h2>
                                </div>

                                ${
                                    plan.plan ===
                                    "pro"
                                        ? `
                                            <span class="billing-plan-badge">
                                                Full workspace
                                            </span>
                                        `
                                        : ""
                                }

                            </div>

                            <div class="billing-price">
                                <strong>
                                    ${formatPrice(
                                        plan
                                    )}
                                </strong>

                                <span>
                                    ${
                                        formatPeriod(
                                            plan.intervalDays
                                        )
                                    }
                                </span>
                            </div>

                            <ul class="billing-features">
                                ${createFeatureList(
                                    plan.plan
                                )}
                            </ul>

                            <button
                                type="button"
                                class="primary-button billing-plan-button"
                                data-plan="${
                                    plan.plan
                                }"
                                ${
                                    disabled
                                        ? "disabled"
                                        : ""
                                }
                            >
                                ${
                                    current
                                        ? "Current plan"
                                        : pending
                                            ? "Payment pending"
                                            : `Choose ${formatPlanName(
                                                plan.plan
                                            )}`
                                }
                            </button>

                            ${
                                pending
                                    ? `
                                        <p class="billing-plan-note">
                                            Check your verified email for the
                                            NOWPayments payment link.
                                        </p>
                                    `
                                    : ""
                            }

                        </article>
                    `;
                }
            )
            .join("");

    planGrid
        .querySelectorAll<HTMLButtonElement>(
            "[data-plan]"
        )
        .forEach(
            (button) => {
                button.addEventListener(
                    "click",
                    () => {
                        const plan =
                            button.dataset.plan;

                        if (
                            plan !==
                                "lite" &&
                            plan !==
                                "pro"
                        ) {
                            return;
                        }

                        void subscribe(
                            plan,
                            button
                        );
                    }
                );
            }
        );
};

const loadPlans =
    async (): Promise<void> => {
        const response =
            await fetch(
                "/api/billing/plans",
                {
                    method: "GET",
                    headers: {
                        Accept:
                            "application/json"
                    }
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
                    : "Unable to load billing plans."
            );
        }

        const result =
            data as BillingPlansResponse;

        if (
            !Array.isArray(
                result.plans
            )
        ) {
            throw new Error(
                "The billing plans response is invalid."
            );
        }

        return renderPlans(
            result.plans
        );
    };

const subscribe = async (
    plan:
        | "lite"
        | "pro",
    button:
        HTMLButtonElement
): Promise<void> => {
    clearMessage();

    const originalText =
        button.textContent ||
        `Choose ${formatPlanName(
            plan
        )}`;

    button.disabled = true;
    button.textContent =
        "Starting…";

    try {
        const result =
            await startBillingSubscription(
                plan
            );

        setMessage(
            "Subscription created. Check your verified email for the NOWPayments payment link.",
            "success"
        );

        button.textContent =
            "Payment email sent";

        if (
            billingState
        ) {
            billingState =
                await getBillingState(
                    billingState.entitlement.userId
                );

            renderCurrentPlan();

            await loadPlans();
        }

        void result;
    } catch (error) {
        console.error(
            "Billing subscription error:",
            error
        );

        setMessage(
            error instanceof Error
                ? error.message
                : "Unable to start your subscription.",
            "error"
        );

        button.disabled = false;
        button.textContent =
            originalText;
    }
};

const loadBilling =
    async (): Promise<void> => {
        const context =
            await requireAccountProfile();

        if (!context) {
            return;
        }

        billingState =
            await getBillingState(
                context.user.id
            );

        if (status) {
            status.textContent =
                billingState.entitlement
                    .ownerOverride
                    ? "Full access"
                    : formatPlanName(
                        billingState.entitlement.plan
                    );
        }

        renderCurrentPlan();
        await loadPlans();
    };

logoutButton?.addEventListener(
    "click",
    async () => {
        logoutButton.disabled =
            true;

        logoutButton.textContent =
            "Signing out…";

        const {
            error
        } =
            await getClient()
                .auth
                .signOut({
                    scope: "local"
                });

        if (error) {
            console.error(
                "Logout error:",
                error
            );

            logoutButton.disabled =
                false;

            logoutButton.textContent =
                "Sign out";

            return;
        }

        window.location.href =
            "login.html";
    }
);

void loadBilling().catch(
    (error) => {
        console.error(
            "Billing page error:",
            error
        );

        if (status) {
            status.textContent =
                "Unavailable";
        }

        if (planGrid) {
            planGrid.innerHTML = `
                <p class="billing-loading">
                    Unable to load billing information.
                </p>
            `;
        }

        setMessage(
            error instanceof Error
                ? error.message
                : "Unable to load billing information.",
            "error"
        );
    }
);