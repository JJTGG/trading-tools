import "../styles/tokens.css";
import "../styles/base.css";
import "./pnl.css";

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

interface PnLInputs {
    symbol: string;
    timeframe: string;
    direction: "long" | "short";
    entryPrice: number;
    exitPrice: number;
    positionSize: number;
    fees: number;
}

interface PnLResult {
    priceDifference: number;
    grossPnL: number;
    fees: number;
    netPnL: number;
    percentageReturn: number;
    positionValue: number;
}

declare global {
    interface Window {
        supabaseClient: SupabaseClientLike;
    }
}

const supabaseClient =
    window.supabaseClient;

const calculator =
    document.querySelector<HTMLFormElement>(
        "#pnl-calculator"
    );

const symbolInput =
    document.querySelector<HTMLInputElement>(
        "#pnl-symbol"
    );

const timeframeInput =
    document.querySelector<HTMLSelectElement>(
        "#pnl-timeframe"
    );

const directionInput =
    document.querySelector<HTMLInputElement>(
        "#pnl-direction"
    );

const directionButtons =
    document.querySelectorAll<HTMLButtonElement>(
        ".direction-button"
    );

const entryInput =
    document.querySelector<HTMLInputElement>(
        "#pnl-entry"
    );

const exitInput =
    document.querySelector<HTMLInputElement>(
        "#pnl-exit"
    );

const sizeInput =
    document.querySelector<HTMLInputElement>(
        "#pnl-size"
    );

const feesInput =
    document.querySelector<HTMLInputElement>(
        "#pnl-fees"
    );

const calculateButton =
    document.querySelector<HTMLButtonElement>(
        "#calculate-pnl"
    );

const resetButton =
    document.querySelector<HTMLButtonElement>(
        "#reset-pnl"
    );

const saveButton =
    document.querySelector<HTMLButtonElement>(
        "#save-pnl"
    );

const marketReference =
    document.querySelector<HTMLElement>(
        "#market-reference"
    );

const priceDifferenceResult =
    document.querySelector<HTMLElement>(
        "#pnl-price-difference"
    );

const entryValueResult =
    document.querySelector<HTMLElement>(
        "#pnl-entry-value"
    );

const calculationState =
    document.querySelector<HTMLElement>(
        "#calculation-state"
    );

const result =
    document.querySelector<HTMLElement>(
        "#pnl-result"
    );

const grossResult =
    document.querySelector<HTMLElement>(
        "#pnl-gross"
    );

const feesResult =
    document.querySelector<HTMLElement>(
        "#pnl-fees-result"
    );

const positionValueResult =
    document.querySelector<HTMLElement>(
        "#pnl-position-value"
    );

const returnResult =
    document.querySelector<HTMLElement>(
        "#pnl-return"
    );

const resultState =
    document.querySelector<HTMLElement>(
        "#pnl-state"
    );

const saveMessage =
    document.querySelector<HTMLElement>(
        "#pnl-save-message"
    );

let lastCalculation: {
    inputs: PnLInputs;
    result: PnLResult;
} | null = null;

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

const getErrorMessage = (
    error: unknown
): string => {
    if (
        error instanceof Error &&
        error.message
    ) {
        return error.message;
    }

    if (
        typeof error === "object" &&
        error !== null &&
        "message" in error &&
        typeof error.message === "string"
    ) {
        return error.message;
    }

    return "Unknown error";
};

const readNumber = (
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

const getInputs = (): PnLInputs => {
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

        entryPrice:
            readNumber(entryInput),

        exitPrice:
            readNumber(exitInput),

        positionSize:
            readNumber(sizeInput),

        fees:
            readNumber(feesInput)
    };
};

const getValidationMessage = (
    inputs: PnLInputs
): string => {
    if (
        !Number.isFinite(inputs.entryPrice) ||
        !Number.isFinite(inputs.exitPrice) ||
        !Number.isFinite(inputs.positionSize)
    ) {
        return "Enter entry, exit, and position size.";
    }

    if (
        !Number.isFinite(inputs.fees)
    ) {
        return "Enter a valid fee amount.";
    }

    if (
        inputs.entryPrice <= 0 ||
        inputs.exitPrice <= 0 ||
        inputs.positionSize <= 0
    ) {
        return "Entry, exit, and position size must be greater than zero.";
    }

    if (inputs.fees < 0) {
        return "Fees cannot be negative.";
    }

    return "";
};

const clearResults = (
    message =
        "Enter entry, exit, and position size."
): void => {
    setText(
        priceDifferenceResult,
        "—"
    );

    setText(
        entryValueResult,
        "—"
    );

    setText(
        result,
        "—"
    );

    setText(
        grossResult,
        "—"
    );

    setText(
        feesResult,
        "—"
    );

    setText(
        positionValueResult,
        "—"
    );

    setText(
        returnResult,
        "Return —"
    );

    setText(
        calculationState,
        "Ready"
    );

    setText(
        resultState,
        message
    );

    resultState?.classList.toggle(
        "invalid",
        message !==
            "Enter entry, exit, and position size."
    );

    if (saveButton) {
        saveButton.disabled = true;
    }

    lastCalculation = null;
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

const calculate = (): void => {
    const inputs =
        getInputs();

    const validationMessage =
        getValidationMessage(
            inputs
        );

    if (validationMessage) {
        clearResults(
            validationMessage
        );

        return;
    }

    const difference =
        inputs.direction === "long"
            ? inputs.exitPrice -
              inputs.entryPrice
            : inputs.entryPrice -
              inputs.exitPrice;

    const grossPnL =
        difference *
        inputs.positionSize;

    const netPnL =
        grossPnL -
        inputs.fees;

    const positionValue =
        inputs.entryPrice *
        inputs.positionSize;

    const percentageReturn =
        positionValue > 0
            ? (netPnL / positionValue) *
              100
            : 0;

    const calculationResult: PnLResult = {
        priceDifference: difference,
        grossPnL,
        fees: inputs.fees,
        netPnL,
        percentageReturn,
        positionValue
    };

    lastCalculation = {
        inputs,
        result:
            calculationResult
    };

    setText(
        priceDifferenceResult,
        formatNumber(difference)
    );

    setText(
        entryValueResult,
        formatNumber(positionValue)
    );

    setText(
        grossResult,
        formatNumber(grossPnL)
    );

    setText(
        feesResult,
        formatNumber(inputs.fees)
    );

    setText(
        positionValueResult,
        formatNumber(positionValue)
    );

    setText(
        result,
        formatNumber(netPnL)
    );

    setText(
        returnResult,
        `Return ${formatNumber(
            percentageReturn
        )}%`
    );

    setText(
        calculationState,
        "Calculated"
    );

    setText(
        resultState,
        `${inputs.direction === "long" ? "Long" : "Short"} · ${formatNumber(
            percentageReturn
        )}% return`
    );

    resultState?.classList.remove(
        "invalid"
    );

    if (saveButton) {
        saveButton.disabled = false;
    }
};

const saveCalculation = async (): Promise<void> => {
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

        if (userError) {
            setText(
                saveMessage,
                `Session check failed: ${userError.message}`
            );

            saveButton.disabled =
                false;

            return;
        }

        if (!user) {
            setText(
                saveMessage,
                "Sign in to save calculations."
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
                    tool: "pnl-calculator",
                    inputs:
                        lastCalculation.inputs,
                    result:
                        lastCalculation.result
                });

        if (error) {
            setText(
                saveMessage,
                `Save failed: ${error.message}`
            );

            saveButton.disabled =
                false;

            return;
        }

        setText(
            saveMessage,
            "Calculation saved."
        );
    } catch (error) {
        console.error(
            "Save PnL calculation error:",
            error
        );

        setText(
            saveMessage,
            `Save failed: ${getErrorMessage(error)}`
        );

        saveButton.disabled =
            false;
    }
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
        exitInput &&
        !exitInput.value
    ) {
        exitInput.value =
            String(price);
    }

    calculate();
};

const reset = (): void => {
    if (symbolInput) {
        symbolInput.value = "";
    }

    if (timeframeInput) {
        timeframeInput.value =
            "1H";
    }

    if (entryInput) {
        entryInput.value = "";
    }

    if (exitInput) {
        exitInput.value = "";
    }

    if (sizeInput) {
        sizeInput.value = "";
    }

    if (feesInput) {
        feesInput.value = "0";
    }

    setText(
        marketReference,
        "Market —"
    );

    setText(
        saveMessage,
        ""
    );

    setDirection("long");

    clearResults();
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

    const entry =
        params.get("entryPrice");

    const exit =
        params.get("exitPrice");

    const positionSize =
        params.get("positionSize");

    const fees =
        params.get("fees");

    if (
        symbol &&
        symbolInput
    ) {
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
        setDirection(
            direction
        );
    }

    if (
        entry &&
        entryInput
    ) {
        entryInput.value =
            entry;
    }

    if (
        exit &&
        exitInput
    ) {
        exitInput.value =
            exit;
    }

    if (
        positionSize &&
        sizeInput
    ) {
        sizeInput.value =
            positionSize;
    }

    if (
        fees &&
        feesInput
    ) {
        feesInput.value =
            fees;
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
    entryInput,
    exitInput,
    sizeInput,
    feesInput
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
    saveCalculation
);

calculator?.addEventListener(
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