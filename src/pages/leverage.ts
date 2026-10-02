import "../styles/tokens.css";
import "../styles/base.css";
import "./leverage.css";

import { mountMarketStrip } from "../components/market-strip";

const calculator =
    document.querySelector<HTMLFormElement>(
        "#leverage-calculator"
    );

const positionInput =
    document.querySelector<HTMLInputElement>(
        "#leverage-position-value"
    );

const equityInput =
    document.querySelector<HTMLInputElement>(
        "#leverage-account-equity"
    );

const calculateButton =
    document.querySelector<HTMLButtonElement>(
        "#calculate-leverage"
    );

const resetButton =
    document.querySelector<HTMLButtonElement>(
        "#reset-leverage"
    );

const leverageResult =
    document.querySelector<HTMLElement>(
        "#leverage-ratio"
    );

const positionResult =
    document.querySelector<HTMLElement>(
        "#leverage-position-value-result"
    );

const equityResult =
    document.querySelector<HTMLElement>(
        "#leverage-equity-result"
    );

const marginResult =
    document.querySelector<HTMLElement>(
        "#margin-requirement"
    );

const calculationState =
    document.querySelector<HTMLElement>(
        "#calculation-state"
    );

const leverageState =
    document.querySelector<HTMLElement>(
        "#leverage-state"
    );

const exposureContext =
    document.querySelector<HTMLElement>(
        "#exposure-context"
    );

const coverageContext =
    document.querySelector<HTMLElement>(
        "#coverage-context"
    );

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

const clearResults = (
    message =
        "Enter valid position value and account equity."
): void => {
    setText(
        leverageResult,
        "—"
    );

    setText(
        positionResult,
        "—"
    );

    setText(
        equityResult,
        "—"
    );

    setText(
        marginResult,
        "—"
    );

    setText(
        calculationState,
        "Ready"
    );

    setText(
        leverageState,
        message
    );

    leverageState?.classList.toggle(
        "invalid",
        message !==
            "Enter valid position value and account equity."
    );

    setText(
        exposureContext,
        "Incomplete"
    );

    setText(
        coverageContext,
        "—"
    );
};

const calculate = (): void => {
    const positionValue =
        readNumber(positionInput);

    const accountEquity =
        readNumber(equityInput);

    if (
        !Number.isFinite(positionValue) ||
        !Number.isFinite(accountEquity) ||
        positionValue <= 0 ||
        accountEquity <= 0
    ) {
        clearResults();

        return;
    }

    const leverage =
        positionValue /
        accountEquity;

    const marginRequirement =
        (accountEquity /
            positionValue) *
        100;

    setText(
        leverageResult,
        `${formatNumber(leverage)}:1`
    );

    setText(
        positionResult,
        formatNumber(
            positionValue
        )
    );

    setText(
        equityResult,
        formatNumber(
            accountEquity
        )
    );

    setText(
        marginResult,
        `${formatNumber(
            marginRequirement
        )}%`
    );

    setText(
        calculationState,
        "Calculated"
    );

    setText(
        leverageState,
        `${formatNumber(leverage)}× exposure · ${formatNumber(
            marginRequirement
        )}% capital coverage`
    );

    leverageState?.classList.remove(
        "invalid"
    );

    setText(
        exposureContext,
        `${formatNumber(leverage)}×`
    );

    setText(
        coverageContext,
        `${formatNumber(
            marginRequirement
        )}%`
    );
};

const reset = (): void => {
    if (positionInput) {
        positionInput.value = "";
    }

    if (equityInput) {
        equityInput.value = "";
    }

    clearResults();
};

[
    positionInput,
    equityInput
].forEach(
    (input) => {
        input?.addEventListener(
            "input",
            calculate
        );

        input?.addEventListener(
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

calculator?.addEventListener(
    "submit",
    (event) => {
        event.preventDefault();
        calculate();
    }
);

mountMarketStrip();

calculate();