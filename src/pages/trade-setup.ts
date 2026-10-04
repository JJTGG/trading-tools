import "../styles/tokens.css";
import "../styles/base.css";
import "../styles/app-shell.css";
import "./trade-setup.css";

import { mountMarketStrip } from "../components/market-strip";
import {
    buildTradeContextUrl,
    readTradeContextFromUrl,
    type TradeContext
} from "../data/trade-context";
import {
    getTradeSetup,
    updateTradeSetup,
    type TradeSetup
} from "../data/trade-setups";
import {
    getClient,
    requireAccountProfile
} from "../auth/runtime";

const setupHeading =
    document.querySelector<HTMLElement>(
        "#setup-heading"
    );

const setupMeta =
    document.querySelector<HTMLElement>(
        "#setup-meta"
    );

const setupDirection =
    document.querySelector<HTMLElement>(
        "#setup-direction"
    );

const setupDirectionValue =
    document.querySelector<HTMLElement>(
        "#setup-direction-value"
    );

const setupSymbol =
    document.querySelector<HTMLElement>(
        "#setup-symbol"
    );

const setupTimeframe =
    document.querySelector<HTMLElement>(
        "#setup-timeframe"
    );

const setupEntry =
    document.querySelector<HTMLElement>(
        "#setup-entry"
    );

const setupStop =
    document.querySelector<HTMLElement>(
        "#setup-stop"
    );

const setupTarget =
    document.querySelector<HTMLElement>(
        "#setup-target"
    );

const setupAccountBalance =
    document.querySelector<HTMLElement>(
        "#setup-account-balance"
    );

const setupRiskPercent =
    document.querySelector<HTMLElement>(
        "#setup-risk-percent"
    );

const setupPositionSize =
    document.querySelector<HTMLElement>(
        "#setup-position-size"
    );

const setupExit =
    document.querySelector<HTMLElement>(
        "#setup-exit"
    );

const setupFees =
    document.querySelector<HTMLElement>(
        "#setup-fees"
    );

const setupNotes =
    document.querySelector<HTMLTextAreaElement>(
        "#setup-notes"
    );

const setupThesis =
    document.querySelector<HTMLTextAreaElement>(
        "#setup-thesis"
    );

const setupEntryPlan =
    document.querySelector<HTMLTextAreaElement>(
        "#setup-entry-plan"
    );

const setupInvalidation =
    document.querySelector<HTMLTextAreaElement>(
        "#setup-invalidation"
    );

const setupManagementPlan =
    document.querySelector<HTMLTextAreaElement>(
        "#setup-management-plan"
    );

const setupTitle =
    document.querySelector<HTMLInputElement>(
        "#setup-title"
    );

const saveSetupButton =
    document.querySelector<HTMLButtonElement>(
        "#save-setup-button"
    );

const saveTitleButton =
    document.querySelector<HTMLButtonElement>(
        "#save-title-button"
    );

const saveMessage =
    document.querySelector<HTMLElement>(
        "#setup-save-message"
    );

const titleMessage =
    document.querySelector<HTMLElement>(
        "#setup-title-message"
    );

const positionSizeLink =
    document.querySelector<HTMLAnchorElement>(
        "#position-size-link"
    );

const riskRewardLink =
    document.querySelector<HTMLAnchorElement>(
        "#risk-reward-link"
    );

const planningLink =
    document.querySelector<HTMLAnchorElement>(
        "#planning-link"
    );

const pnlLink =
    document.querySelector<HTMLAnchorElement>(
        "#pnl-link"
    );

const positionSizeStatus =
    document.querySelector<HTMLElement>(
        "#position-size-status"
    );

const riskRewardStatus =
    document.querySelector<HTMLElement>(
        "#risk-reward-status"
    );

const planningStatus =
    document.querySelector<HTMLElement>(
        "#planning-status"
    );

const pnlStatus =
    document.querySelector<HTMLElement>(
        "#pnl-status"
    );

const nextStepTitle =
    document.querySelector<HTMLElement>(
        "#next-step-title"
    );

const nextStepDescription =
    document.querySelector<HTMLElement>(
        "#next-step-description"
    );

const nextStepLink =
    document.querySelector<HTMLAnchorElement>(
        "#next-step-link"
    );

const logoutButton =
    document.querySelector<HTMLButtonElement>(
        "#logout-button"
    );

let currentSetup:
    TradeSetup | null = null;

const setText = (
    element: HTMLElement | null,
    value: string
): void => {
    if (element) {
        element.textContent = value;
    }
};

const formatNumber = (
    value: number
): string => {
    return new Intl.NumberFormat(
        undefined,
        {
            maximumFractionDigits: 8
        }
    ).format(value);
};

const formatDate = (
    value: string
): string => {
    const date =
        new Date(value);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return "Unknown";
    }

    return new Intl.DateTimeFormat(
        undefined,
        {
            dateStyle: "medium",
            timeStyle: "short"
        }
    ).format(date);
};

const formatValue = (
    value: number | null,
    suffix = ""
): string => {
    if (
        value === null ||
        !Number.isFinite(value)
    ) {
        return "—";
    }

    return `${formatNumber(
        value
    )}${suffix}`;
};

const buildContext =
    (
        setup: TradeSetup
    ): TradeContext => {
        return {
            setupId:
                setup.id,

            symbol:
                setup.symbol ||
                undefined,

            timeframe:
                setup.timeframe ||
                undefined,

            direction:
                setup.direction ||
                undefined,

            entryPrice:
                setup.entryPrice ??
                undefined,

            stopLoss:
                setup.stopLoss ??
                undefined,

            targetPrice:
                setup.targetPrice ??
                undefined,

            accountBalance:
                setup.accountBalance ??
                undefined,

            riskPercent:
                setup.riskPercent ??
                undefined,

            positionSize:
                setup.positionSize ??
                undefined,

            exitPrice:
                setup.exitPrice ??
                undefined,

            fees:
                setup.fees ??
                undefined
        };
    };

const buildToolUrl = (
    path: string,
    setup: TradeSetup
): string => {
    return buildTradeContextUrl(
        path,
        buildContext(setup)
    );
};

const hasPositionSizeContext = (
    setup: TradeSetup
): boolean => {
    return [
        setup.accountBalance,
        setup.riskPercent,
        setup.entryPrice,
        setup.stopLoss,
        setup.positionSize
    ].every(
        (value) =>
            value !== null
    );
};

const hasRiskRewardContext = (
    setup: TradeSetup
): boolean => {
    return [
        setup.entryPrice,
        setup.stopLoss,
        setup.targetPrice
    ].every(
        (value) =>
            value !== null
    );
};

const hasPlanningContext = (
    setup: TradeSetup
): boolean => {
    return [
        setup.planning.thesis,
        setup.planning.entryPlan,
        setup.planning.invalidation,
        setup.planning.managementPlan
    ].every(
        (value) =>
            Boolean(
                value?.trim()
            )
    );
};

const hasPnlContext = (
    setup: TradeSetup
): boolean => {
    return [
        setup.entryPrice,
        setup.exitPrice,
        setup.positionSize,
        setup.fees
    ].every(
        (value) =>
            value !== null
    );
};

const updateWorkflowItem =
    (
        link: HTMLAnchorElement | null,
        status:
            | HTMLElement
            | null,
        complete: boolean
    ): void => {
        if (!link) {
            return;
        }

        link.classList.toggle(
            "complete",
            complete
        );

        setText(
            status,
            complete
                ? "Ready"
                : "Open"
        );
    };

const renderSetup = (
    setup: TradeSetup
): void => {
    if (setupHeading) {
        setupHeading.textContent =
            setup.title;
    }

    setText(
        setupMeta,
        `Updated ${formatDate(
            setup.updatedAt
        )}`
    );

    const direction =
        setup.direction ===
        "short"
            ? "Short"
            : setup.direction ===
                "long"
            ? "Long"
            : "—";

    setText(
        setupDirection,
        direction
    );

    setText(
        setupDirectionValue,
        direction
    );

    setText(
        setupSymbol,
        setup.symbol ||
            "—"
    );

    setText(
        setupTimeframe,
        setup.timeframe ||
            "—"
    );

    setText(
        setupEntry,
        formatValue(
            setup.entryPrice
        )
    );

    setText(
        setupStop,
        formatValue(
            setup.stopLoss
        )
    );

    setText(
        setupTarget,
        formatValue(
            setup.targetPrice
        )
    );

    setText(
        setupAccountBalance,
        formatValue(
            setup.accountBalance
        )
    );

    setText(
        setupRiskPercent,
        formatValue(
            setup.riskPercent,
            "%"
        )
    );

    setText(
        setupPositionSize,
        formatValue(
            setup.positionSize
        )
    );

    setText(
        setupExit,
        formatValue(
            setup.exitPrice
        )
    );

    setText(
        setupFees,
        formatValue(
            setup.fees
        )
    );

    if (setupTitle) {
        setupTitle.value =
            setup.title;
    }

    if (setupNotes) {
        setupNotes.value =
            setup.notes ||
            "";
    }

    if (setupThesis) {
        setupThesis.value =
            setup.planning.thesis ||
            "";
    }

    if (setupEntryPlan) {
        setupEntryPlan.value =
            setup.planning.entryPlan ||
            "";
    }

    if (setupInvalidation) {
        setupInvalidation.value =
            setup.planning.invalidation ||
            "";
    }

    if (setupManagementPlan) {
        setupManagementPlan.value =
            setup.planning.managementPlan ||
            "";
    }

    const positionReady =
        hasPositionSizeContext(
            setup
        );

    const riskRewardReady =
        hasRiskRewardContext(
            setup
        );

    const planningReady =
        hasPlanningContext(
            setup
        );

    const pnlReady =
        hasPnlContext(
            setup
        );

    updateWorkflowItem(
        positionSizeLink,
        positionSizeStatus,
        positionReady
    );

    updateWorkflowItem(
        riskRewardLink,
        riskRewardStatus,
        riskRewardReady
    );

    updateWorkflowItem(
        planningLink,
        planningStatus,
        planningReady
    );

    updateWorkflowItem(
        pnlLink,
        pnlStatus,
        pnlReady
    );

    if (positionSizeLink) {
        positionSizeLink.href =
            buildToolUrl(
                "position-size.html",
                setup
            );
    }

    if (riskRewardLink) {
        riskRewardLink.href =
            buildToolUrl(
                "risk-reward.html",
                setup
            );
    }

    if (planningLink) {
        planningLink.href =
            "#planning-panel";
    }

    if (pnlLink) {
        pnlLink.href =
            buildToolUrl(
                "pnl-calculator.html",
                setup
            );
    }

    if (!positionReady) {
        setText(
            nextStepTitle,
            "Complete Position Size"
        );

        setText(
            nextStepDescription,
            "Define the entry, stop, account risk, and position size for this setup."
        );

        if (nextStepLink) {
            nextStepLink.href =
                buildToolUrl(
                    "position-size.html",
                    setup
                );
        }

        return;
    }

    if (!riskRewardReady) {
        setText(
            nextStepTitle,
            "Map Risk / Reward"
        );

        setText(
            nextStepDescription,
            "Add the target price and evaluate the setup's risk-to-reward relationship."
        );

        if (nextStepLink) {
            nextStepLink.href =
                buildToolUrl(
                    "risk-reward.html",
                    setup
                );
        }

        return;
    }

    if (!planningReady) {
        setText(
            nextStepTitle,
            "Complete the Trade Plan"
        );

        setText(
            nextStepDescription,
            "Define the thesis, entry conditions, invalidation, and management plan before treating the setup as planned."
        );

        if (nextStepLink) {
            nextStepLink.href =
                "#planning-panel";
        }

        return;
    }

    if (!pnlReady) {
        setText(
            nextStepTitle,
            "Review PnL"
        );

        setText(
            nextStepDescription,
            "Add the exit price and fees when you want to review the resulting outcome."
        );

        if (nextStepLink) {
            nextStepLink.href =
                buildToolUrl(
                    "pnl-calculator.html",
                    setup
                );
        }

        return;
    }

    setText(
        nextStepTitle,
        "Review the setup"
    );

    setText(
        nextStepDescription,
        "The main context, risk, plan, and outcome fields are complete. Reassess any stage as needed."
    );

    if (nextStepLink) {
        nextStepLink.href =
            "#planning-panel";
    }
};

const loadSetup =
    async (): Promise<void> => {
        const context =
            readTradeContextFromUrl();

        if (!context.setupId) {
            window.location.href =
                "workspace.html";

            return;
        }

        const account =
            await requireAccountProfile();

        if (!account) {
            return;
        }

        try {
            const setup =
                await getTradeSetup(
                    context.setupId
                );

            if (!setup) {
                window.location.href =
                    "workspace.html";

                return;
            }

            currentSetup =
                setup;

            renderSetup(
                setup
            );
        } catch (error) {
            console.error(
                "Load trade setup error:",
                error
            );

            setText(
                setupHeading,
                "Unable to load setup"
            );

            setText(
                setupMeta,
                "Return to Workspace and try again."
            );
        }
    };

const saveTitle =
    async (): Promise<void> => {
        if (
            !currentSetup ||
            !setupTitle ||
            !saveTitleButton
        ) {
            return;
        }

        const title =
            setupTitle.value.trim();

        if (!title) {
            setText(
                titleMessage,
                "Enter a setup title."
            );

            return;
        }

        saveTitleButton.disabled =
            true;

        setText(
            titleMessage,
            "Saving..."
        );

        try {
            currentSetup =
                await updateTradeSetup(
                    currentSetup.id,
                    {
                        title
                    }
                );

            renderSetup(
                currentSetup
            );

            setText(
                titleMessage,
                "Title saved."
            );
        } catch (error) {
            console.error(
                "Save setup title error:",
                error
            );

            setText(
                titleMessage,
                error instanceof Error
                    ? error.message
                    : "Unable to save title."
            );
        } finally {
            saveTitleButton.disabled =
                false;
        }
    };

const saveSetup =
    async (): Promise<void> => {
        if (
            !currentSetup ||
            !saveSetupButton ||
            !setupNotes ||
            !setupThesis ||
            !setupEntryPlan ||
            !setupInvalidation ||
            !setupManagementPlan
        ) {
            return;
        }

        saveSetupButton.disabled =
            true;

        setText(
            saveMessage,
            "Saving..."
        );

        try {
            currentSetup =
                await updateTradeSetup(
                    currentSetup.id,
                    {
                        notes:
                            setupNotes.value
                                .trim(),

                        planning: {
                            thesis:
                                setupThesis.value
                                    .trim(),

                            entryPlan:
                                setupEntryPlan.value
                                    .trim(),

                            invalidation:
                                setupInvalidation.value
                                    .trim(),

                            managementPlan:
                                setupManagementPlan.value
                                    .trim()
                        }
                    }
                );

            renderSetup(
                currentSetup
            );

            setText(
                saveMessage,
                "Setup saved."
            );
        } catch (error) {
            console.error(
                "Save trade setup error:",
                error
            );

            setText(
                saveMessage,
                error instanceof Error
                    ? error.message
                    : "Unable to save setup."
            );
        } finally {
            saveSetupButton.disabled =
                false;
        }
    };

logoutButton?.addEventListener(
    "click",
    async () => {
        logoutButton.disabled =
            true;

        logoutButton.textContent =
            "Signing out...";

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

saveTitleButton?.addEventListener(
    "click",
    () => {
        void saveTitle();
    }
);

saveSetupButton?.addEventListener(
    "click",
    () => {
        void saveSetup();
    }
);

mountMarketStrip();

void loadSetup();