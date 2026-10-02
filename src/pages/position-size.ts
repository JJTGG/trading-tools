import "../styles/tokens.css";
import "../styles/base.css";
import "./position-size.css";

import { mountMarketStrip } from "../components/market-strip";

interface SupabaseError {
    message: string;
}

interface SupabaseUser {
    id: string;
    email?: string;
}

interface SupabaseClientLike {
    auth: {
        getUser(): Promise<{
            data: {
                user: SupabaseUser | null;
            };
            error: SupabaseError | null;
        }>;
    };
    from(table: string): {
        insert(values: Record<string, unknown>): Promise<{
            error: SupabaseError | null;
        }>;
    };
}

interface MarketSelectionDetail {
    symbol: string;
    price: number;
}

interface PositionSizeInputs {
    symbol: string;
    timeframe: string;
    direction: "long" | "short";
    accountBalance: number;
    riskPercent: number;
    entryPrice: number;
    stopLoss: number;
}

interface PositionSizeResult {
    riskAmount: number;
    riskPerUnit: number;
    positionSize: number;
    positionValue: number;
}

interface CalculationState {
    inputs: PositionSizeInputs;
    result: PositionSizeResult;
}

declare const supabaseClient: SupabaseClientLike;

const symbolInput =
    document.querySelector<HTMLInputElement>(
        "#trade-symbol"
    );

const timeframeInput =
    document.querySelector<HTMLSelectElement>(
        "#trade-timeframe"
    );

const directionInput =
    document.querySelector<HTMLInputElement>(
        "#position-direction"
    );

const directionButtons =
    document.querySelectorAll<HTMLButtonElement>(
        ".direction-button"
    );

const accountBalanceInput =
    document.querySelector<HTMLInputElement>(
        "#account-balance"
    );

const riskPercentInput =
    document.querySelector<HTMLInputElement>(
        "#risk-percent"
    );

const entryPriceInput =
    document.querySelector<HTMLInputElement>(
        "#entry-price"
    );

const stopLossInput =
    document.querySelector<HTMLInputElement>(
        "#stop-loss"
    );

const calculateButton =
    document.querySelector<HTMLButtonElement>(
        "#calculate-position-size"
    );

const resetButton =
    document.querySelector<HTMLButtonElement>(
        "#reset-position-size"
    );

const saveButton =
    document.querySelector<HTMLButtonElement>(
        "#save-position-size"
    );

const useRiskRewardButton =
    document.querySelector<HTMLButtonElement>(
        "#use-risk-reward"
    );

const openWorkspaceButton =
    document.querySelector<HTMLButtonElement>(
        "#open-workspace"
    );

const positionSizeResult =
    document.querySelector<HTMLElement>(
        "#position-size-result"
    );

const riskAmountResult =
    document.querySelector<HTMLElement>(
        "#risk-amount"
    );

const riskPerUnitResult =
    document.querySelector<HTMLElement>(
        "#risk-per-unit"
    );

const positionValueResult =
    document.querySelector<HTMLElement>(
        "#position-value"
    );

const calculationState =
    document.querySelector<HTMLElement>(
        "#calculation-state"
    );

const positionSizeState =
    document.querySelector<HTMLElement>(
        "#position-size-state"
    );

const saveMessage =
    document.querySelector<HTMLElement>(
        "#position-size-save-message"
    );

const contextSummary =
    document.querySelector<HTMLElement>(
        "#context-summary"
    );

const marketReference =
    document.querySelector<HTMLElement>(
        "#market-reference"
    );

const riskDistanceLabel =
    document.querySelector<HTMLElement>(
        "#risk-distance-label"
    );

const riskMapStop =
    document.querySelector<HTMLElement>(
        "#risk-map-stop"
    );

const riskMapEntry =
    document.querySelector<HTMLElement>(
        "#risk-map-entry"
    );

const riskMapStopLabel =
    document.querySelector<HTMLElement>(
        "#risk-map-stop-label"
    );

const riskMapEntryLabel =
    document.querySelector<HTMLElement>(
        "#risk-map-entry-label"
    );

let lastCalculation: CalculationState | null =
    null;

const formatNumber = (
    value: number
): string => {
    return new Intl.NumberFormat(undefined, {
        maximumFractionDigits: 8
    }).format(value);
};

const setText = (
    element: HTMLElement | null,
    value: string
): void => {
    if (element) {
        element.textContent = value;
    }
};

const readNumberInput = (
    input: HTMLInputElement | null
): number => {
    if (!input) {
        return Number.NaN;
    }

    const value =
        input.value.trim();

    if (!value) {
        return Number.NaN;
    }

    const parsed =
        Number(value);

    return Number.isFinite(parsed)
        ? parsed
        : Number.NaN;
};

const getInputs = (): PositionSizeInputs => {
    return {
        symbol:
            symbolInput?.value
                .trim()
                .toUpperCase() || "",

        timeframe:
            timeframeInput?.value || "1H",

        direction:
            directionInput?.value === "short"
                ? "short"
                : "long",

        accountBalance:
            readNumberInput(
                accountBalanceInput
            ),

        riskPercent:
            readNumberInput(
                riskPercentInput
            ),

        entryPrice:
            readNumberInput(
                entryPriceInput
            ),

        stopLoss:
            readNumberInput(
                stopLossInput
            )
    };
};

const getValidationMessage = (
    inputs: PositionSizeInputs
): string => {
    const {
        accountBalance,
        riskPercent,
        entryPrice,
        stopLoss,
        direction
    } = inputs;

    const hasMissingValue = [
        accountBalance,
        riskPercent,
        entryPrice,
        stopLoss
    ].some(
        (value) =>
            !Number.isFinite(value)
    );

    if (hasMissingValue) {
        return "Enter account, risk, entry, and stop.";
    }

    if (
        accountBalance <= 0 ||
        entryPrice <= 0 ||
        stopLoss <= 0
    ) {
        return "Account and prices must be greater than zero.";
    }

    if (
        riskPercent <= 0 ||
        riskPercent >= 100
    ) {
        return "Risk must be greater than 0% and below 100%.";
    }

    if (
        direction === "long" &&
        stopLoss >= entryPrice
    ) {
        return "Long positions require the stop below entry.";
    }

    if (
        direction === "short" &&
        stopLoss <= entryPrice
    ) {
        return "Short positions require the stop above entry.";
    }

    return "";
};

const clearResults = (
    message = "Enter account, risk, entry, and stop."
): void => {
    setText(
        positionSizeResult,
        "—"
    );

    setText(
        riskAmountResult,
        "—"
    );

    setText(
        riskPerUnitResult,
        "—"
    );

    setText(
        positionValueResult,
        "—"
    );

    setText(
        calculationState,
        "Ready"
    );

    setText(
        positionSizeState,
        message
    );

    positionSizeState?.classList.toggle(
        "invalid",
        message !== "Enter account, risk, entry, and stop."
    );

    if (saveButton) {
        saveButton.disabled = true;
    }

    lastCalculation = null;
};

const updateContextSummary = (
    inputs: PositionSizeInputs
): void => {
    const parts: string[] = [];

    if (inputs.symbol) {
        parts.push(inputs.symbol);
    }

    parts.push(
        inputs.direction === "long"
            ? "Long"
            : "Short"
    );

    if (Number.isFinite(inputs.entryPrice)) {
        parts.push(
            `Entry ${formatNumber(
                inputs.entryPrice
            )}`
        );
    }

    if (Number.isFinite(inputs.stopLoss)) {
        parts.push(
            `Stop ${formatNumber(
                inputs.stopLoss
            )}`
        );
    }

    setText(
        contextSummary,
        parts.length > 1
            ? parts.join(" · ")
            : "Incomplete"
    );
};

const updateRiskMap = (
    inputs: PositionSizeInputs
): void => {
    if (
        !Number.isFinite(inputs.entryPrice) ||
        !Number.isFinite(inputs.stopLoss)
    ) {
        return;
    }

    if (
        inputs.entryPrice <= 0 ||
        inputs.stopLoss <= 0 ||
        inputs.entryPrice ===
            inputs.stopLoss
    ) {
        return;
    }

    const distance =
        Math.abs(
            inputs.entryPrice -
            inputs.stopLoss
        );

    setText(
        riskDistanceLabel,
        formatNumber(distance)
    );

    const isLong =
        inputs.direction === "long";

    const stopPosition =
        isLong ? 18 : 82;

    const entryPosition =
        isLong ? 82 : 18;

    riskMapStop?.style.setProperty(
        "left",
        `${stopPosition}%`
    );

    riskMapEntry?.style.setProperty(
        "left",
        `${entryPosition}%`
    );

    setText(
        riskMapStopLabel,
        `Stop ${formatNumber(
            inputs.stopLoss
        )}`
    );

    setText(
        riskMapEntryLabel,
        `Entry ${formatNumber(
            inputs.entryPrice
        )}`
    );
};

const calculate = (): void => {
    const inputs = getInputs();

    updateContextSummary(inputs);
    updateRiskMap(inputs);

    const validationMessage =
        getValidationMessage(inputs);

    if (validationMessage) {
        clearResults(
            validationMessage
        );

        updateContextSummary(inputs);
        updateRiskMap(inputs);

        return;
    }

    const riskAmount =
        inputs.accountBalance *
        (inputs.riskPercent / 100);

    const riskPerUnit =
        Math.abs(
            inputs.entryPrice -
            inputs.stopLoss
        );

    const positionSize =
        riskAmount /
        riskPerUnit;

    const positionValue =
        positionSize *
        inputs.entryPrice;

    const result: PositionSizeResult = {
        riskAmount,
        riskPerUnit,
        positionSize,
        positionValue
    };

    lastCalculation = {
        inputs,
        result
    };

    setText(
        positionSizeResult,
        formatNumber(
            positionSize
        )
    );

    setText(
        riskAmountResult,
        formatNumber(
            riskAmount
        )
    );

    setText(
        riskPerUnitResult,
        formatNumber(
            riskPerUnit
        )
    );

    setText(
        positionValueResult,
        formatNumber(
            positionValue
        )
    );

    setText(
        calculationState,
        "Calculated"
    );

    setText(
        positionSizeState,
        `${inputs.direction === "long" ? "Long" : "Short"} · ${inputs.riskPercent}% account risk`
    );

    positionSizeState?.classList.remove(
        "invalid"
    );

    if (saveButton) {
        saveButton.disabled = false;
    }
};

const setDirection = (
    direction: "long" | "short"
): void => {
    if (directionInput) {
        directionInput.value =
            direction;
    }

    directionButtons.forEach(
        (button) => {
            const active =
                button.dataset.direction ===
                direction;

            button.classList.toggle(
                "active",
                active
            );

            button.setAttribute(
                "aria-pressed",
                String(active)
            );
        }
    );

    calculate();
};

const applyContextFromUrl = (): void => {
    const params =
        new URLSearchParams(
            window.location.search
        );

    const symbol =
        params.get("symbol");

    const timeframe =
        params.get("timeframe");

    const direction =
        params.get("direction");

    const accountBalance =
        params.get("accountBalance");

    const riskPercent =
        params.get("riskPercent");

    const entryPrice =
        params.get("entryPrice");

    const stopLoss =
        params.get("stopLoss");

    if (symbol && symbolInput) {
        symbolInput.value =
            symbol;
    }

    if (
        timeframe &&
        timeframeInput
    ) {
        timeframeInput.value =
            timeframe;
    }

    if (
        direction === "long" ||
        direction === "short"
    ) {
        if (directionInput) {
            directionInput.value =
                direction;
        }

        directionButtons.forEach(
            (button) => {
                const active =
                    button.dataset.direction ===
                    direction;

                button.classList.toggle(
                    "active",
                    active
                );

                button.setAttribute(
                    "aria-pressed",
                    String(active)
                );
            }
        );
    }

    if (
        accountBalance &&
        accountBalanceInput
    ) {
        accountBalanceInput.value =
            accountBalance;
    }

    if (
        riskPercent &&
        riskPercentInput
    ) {
        riskPercentInput.value =
            riskPercent;
    }

    if (
        entryPrice &&
        entryPriceInput
    ) {
        entryPriceInput.value =
            entryPrice;
    }

    if (
        stopLoss &&
        stopLossInput
    ) {
        stopLossInput.value =
            stopLoss;
    }

    calculate();
};

const reset = (): void => {
    if (symbolInput) {
        symbolInput.value = "";
    }

    if (timeframeInput) {
        timeframeInput.value = "1H";
    }

    if (accountBalanceInput) {
        accountBalanceInput.value = "";
    }

    if (riskPercentInput) {
        riskPercentInput.value = "";
    }

    if (entryPriceInput) {
        entryPriceInput.value = "";
    }

    if (stopLossInput) {
        stopLossInput.value = "";
    }

    setText(
        marketReference,
        "Market —"
    );

    setDirection("long");

    setText(
        saveMessage,
        ""
    );

    clearResults();

    updateContextSummary(
        getInputs()
    );
};

const saveSetup = async (): Promise<void> => {
    if (
        !lastCalculation ||
        !saveButton
    ) {
        return;
    }

    saveButton.disabled = true;

    setText(
        saveMessage,
        "Saving..."
    );

    try {
        const {
            data: { user },
            error: userError
        } =
            await supabaseClient.auth.getUser();

        if (
            userError ||
            !user
        ) {
            setText(
                saveMessage,
                "Sign in to save this setup."
            );

            saveButton.disabled =
                false;

            return;
        }

        const { error } =
            await supabaseClient
                .from(
                    "saved_calculations"
                )
                .insert({
                    user_id: user.id,
                    tool: "position-size",
                    inputs:
                        lastCalculation.inputs,
                    result:
                        lastCalculation.result
                });

        if (error) {
            throw new Error(
                error.message
            );
        }

        setText(
            saveMessage,
            "Saved to Workspace."
        );
    } catch (error) {
        console.error(
            "Save position size error:",
            error
        );

        setText(
            saveMessage,
            "Unable to save setup."
        );

        saveButton.disabled =
            false;
    }
};

const openRiskReward = (): void => {
    if (!lastCalculation) {
        calculate();
    }

    if (!lastCalculation) {
        return;
    }

    const params =
        new URLSearchParams({
            direction:
                lastCalculation
                    .inputs.direction,

            entryPrice:
                String(
                    lastCalculation
                        .inputs
                        .entryPrice
                ),

            stopLoss:
                String(
                    lastCalculation
                        .inputs
                        .stopLoss
                )
        });

    window.location.href =
        `risk-reward.html?${params.toString()}`;
};

const openWorkspace = (): void => {
    window.location.href =
        "workspace.html";
};

const handleMarketSelection = (
    event: Event
): void => {
    const customEvent =
        event as CustomEvent<MarketSelectionDetail>;

    const {
        symbol,
        price
    } = customEvent.detail;

    if (symbolInput) {
        symbolInput.value =
            symbol;
    }

    setText(
        marketReference,
        `Live ${formatNumber(price)}`
    );

    if (
        entryPriceInput &&
        !entryPriceInput.value
    ) {
        entryPriceInput.value =
            String(price);
    }

    calculate();
};

directionButtons.forEach(
    (button) => {
        button.addEventListener(
            "click",
            () => {
                const direction =
                    button.dataset.direction;

                if (
                    direction === "long" ||
                    direction === "short"
                ) {
                    setDirection(
                        direction
                    );
                }
            }
        );
    }
);

[
    symbolInput,
    timeframeInput,
    accountBalanceInput,
    riskPercentInput,
    entryPriceInput,
    stopLossInput
].forEach(
    (element) => {
        element?.addEventListener(
            "input",
            calculate
        );

        element?.addEventListener(
            "change",
            calculate
        );
    }
);

calculateButton?.addEventListener(
    "click",
    calculate
);

resetButton?.addEventListener(
    "click",
    reset
);

saveButton?.addEventListener(
    "click",
    saveSetup
);

useRiskRewardButton?.addEventListener(
    "click",
    openRiskReward
);

openWorkspaceButton?.addEventListener(
    "click",
    openWorkspace
);

document
    .querySelector<HTMLFormElement>(
        "#position-size-calculator"
    )
    ?.addEventListener(
        "submit",
        (event) => {
            event.preventDefault();
            calculate();
        }
    );

document.addEventListener(
    "trading-tools:market-selected",
    handleMarketSelection
);

mountMarketStrip();

applyContextFromUrl();