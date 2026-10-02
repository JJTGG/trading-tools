import "../styles/tokens.css";
import "../styles/base.css";
import "./risk-reward.css";

import { mountMarketStrip } from "../components/market-strip";

interface MarketSelectionDetail {
    symbol: string;
    price: number;
}

interface RiskRewardInputs {
    symbol: string;
    timeframe: string;
    direction: "long" | "short";
    entry: number;
    stop: number;
    target: number;
}

interface RiskRewardResult {
    risk: number;
    reward: number;
    ratio: number;
    breakevenWinRate: number;
}

const symbolInput =
    document.querySelector<HTMLInputElement>(
        "#risk-reward-symbol"
    );

const timeframeInput =
    document.querySelector<HTMLSelectElement>(
        "#risk-reward-timeframe"
    );

const directionInput =
    document.querySelector<HTMLInputElement>(
        "#risk-reward-direction"
    );

const directionButtons =
    document.querySelectorAll<HTMLButtonElement>(
        ".direction-button"
    );

const entryInput =
    document.querySelector<HTMLInputElement>(
        "#risk-reward-entry"
    );

const stopInput =
    document.querySelector<HTMLInputElement>(
        "#risk-reward-stop"
    );

const targetInput =
    document.querySelector<HTMLInputElement>(
        "#risk-reward-target"
    );

const calculateButton =
    document.querySelector<HTMLButtonElement>(
        "#calculate-risk-reward"
    );

const resetButton =
    document.querySelector<HTMLButtonElement>(
        "#reset-risk-reward"
    );

const positionSizeButton =
    document.querySelector<HTMLButtonElement>(
        "#use-position-size"
    );

const marketReference =
    document.querySelector<HTMLElement>(
        "#market-reference"
    );

const contextSummary =
    document.querySelector<HTMLElement>(
        "#context-summary"
    );

const footerContext =
    document.querySelector<HTMLElement>(
        "#footer-context"
    );

const calculationState =
    document.querySelector<HTMLElement>(
        "#calculation-state"
    );

const ratioResult =
    document.querySelector<HTMLElement>(
        "#risk-reward-ratio"
    );

const riskResult =
    document.querySelector<HTMLElement>(
        "#risk-per-unit"
    );

const rewardResult =
    document.querySelector<HTMLElement>(
        "#reward-per-unit"
    );

const breakevenResult =
    document.querySelector<HTMLElement>(
        "#breakeven-win-rate"
    );

const resultState =
    document.querySelector<HTMLElement>(
        "#risk-reward-state"
    );

const levelMapState =
    document.querySelector<HTMLElement>(
        "#level-map-state"
    );

const levelMapStop =
    document.querySelector<HTMLElement>(
        "#level-map-stop"
    );

const levelMapEntry =
    document.querySelector<HTMLElement>(
        "#level-map-entry"
    );

const levelMapTarget =
    document.querySelector<HTMLElement>(
        "#level-map-target"
    );

const levelMapRisk =
    document.querySelector<HTMLElement>(
        "#level-map-risk"
    );

const levelMapReward =
    document.querySelector<HTMLElement>(
        "#level-map-reward"
    );

const levelMapStopLabel =
    document.querySelector<HTMLElement>(
        "#level-map-stop-label"
    );

const levelMapEntryLabel =
    document.querySelector<HTMLElement>(
        "#level-map-entry-label"
    );

const levelMapTargetLabel =
    document.querySelector<HTMLElement>(
        "#level-map-target-label"
    );

let lastResult: RiskRewardResult | null =
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

const getInputs = (): RiskRewardInputs => {
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

        entry:
            readNumber(entryInput),

        stop:
            readNumber(stopInput),

        target:
            readNumber(targetInput)
    };
};

const getValidationMessage = (
    inputs: RiskRewardInputs
): string => {
    if (
        !Number.isFinite(inputs.entry) ||
        !Number.isFinite(inputs.stop) ||
        !Number.isFinite(inputs.target)
    ) {
        return "Enter entry, stop, and target.";
    }

    if (
        inputs.entry <= 0 ||
        inputs.stop <= 0 ||
        inputs.target <= 0
    ) {
        return "All price levels must be greater than zero.";
    }

    if (
        inputs.direction === "long"
    ) {
        if (
            inputs.stop >= inputs.entry
        ) {
            return "Long positions require the stop below entry.";
        }

        if (
            inputs.target <= inputs.entry
        ) {
            return "Long positions require the target above entry.";
        }
    }

    if (
        inputs.direction === "short"
    ) {
        if (
            inputs.stop <= inputs.entry
        ) {
            return "Short positions require the stop above entry.";
        }

        if (
            inputs.target >= inputs.entry
        ) {
            return "Short positions require the target below entry.";
        }
    }

    return "";
};

const updateContext = (
    inputs: RiskRewardInputs
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

    if (Number.isFinite(inputs.entry)) {
        parts.push(
            `Entry ${formatNumber(inputs.entry)}`
        );
    }

    if (Number.isFinite(inputs.stop)) {
        parts.push(
            `Stop ${formatNumber(inputs.stop)}`
        );
    }

    if (Number.isFinite(inputs.target)) {
        parts.push(
            `Target ${formatNumber(inputs.target)}`
        );
    }

    const value =
        parts.length > 1
            ? parts.join(" · ")
            : "Incomplete";

    setText(
        contextSummary,
        value
    );

    setText(
        footerContext,
        value
    );
};

const clearResults = (
    message = "Enter entry, stop, and target."
): void => {
    setText(
        ratioResult,
        "—"
    );

    setText(
        riskResult,
        "—"
    );

    setText(
        rewardResult,
        "—"
    );

    setText(
        breakevenResult,
        "—"
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
        message !== "Enter entry, stop, and target."
    );

    lastResult = null;
};

const updateLevelMap = (
    inputs: RiskRewardInputs
): void => {
    if (
        !Number.isFinite(inputs.entry) ||
        !Number.isFinite(inputs.stop) ||
        !Number.isFinite(inputs.target)
    ) {
        return;
    }

    const prices = [
        inputs.entry,
        inputs.stop,
        inputs.target
    ];

    const minimum =
        Math.min(...prices);

    const maximum =
        Math.max(...prices);

    const range =
        maximum - minimum;

    if (range <= 0) {
        return;
    }

    const toPosition = (
        price: number
    ): number => {
        return (
            ((price - minimum) / range) *
            100
        );
    };

    const stopPosition =
        toPosition(inputs.stop);

    const entryPosition =
        toPosition(inputs.entry);

    const targetPosition =
        toPosition(inputs.target);

    levelMapStop?.style.setProperty(
        "left",
        `${stopPosition}%`
    );

    levelMapEntry?.style.setProperty(
        "left",
        `${entryPosition}%`
    );

    levelMapTarget?.style.setProperty(
        "left",
        `${targetPosition}%`
    );

    const riskStart =
        Math.min(
            stopPosition,
            entryPosition
        );

    const riskWidth =
        Math.abs(
            entryPosition -
            stopPosition
        );

    const rewardStart =
        Math.min(
            entryPosition,
            targetPosition
        );

    const rewardWidth =
        Math.abs(
            targetPosition -
            entryPosition
        );

    levelMapRisk?.style.setProperty(
        "left",
        `${riskStart}%`
    );

    levelMapRisk?.style.setProperty(
        "width",
        `${riskWidth}%`
    );

    levelMapReward?.style.setProperty(
        "left",
        `${rewardStart}%`
    );

    levelMapReward?.style.setProperty(
        "width",
        `${rewardWidth}%`
    );

    setText(
        levelMapStopLabel,
        `Stop ${formatNumber(inputs.stop)}`
    );

    setText(
        levelMapEntryLabel,
        `Entry ${formatNumber(inputs.entry)}`
    );

    setText(
        levelMapTargetLabel,
        `Target ${formatNumber(inputs.target)}`
    );

    setText(
        levelMapState,
        inputs.direction === "long"
            ? "Stop ← Entry → Target"
            : "Target ← Entry → Stop"
    );
};

const calculate = (): void => {
    const inputs =
        getInputs();

    updateContext(inputs);
    updateLevelMap(inputs);

    const validationMessage =
        getValidationMessage(inputs);

    if (validationMessage) {
        clearResults(
            validationMessage
        );

        updateContext(inputs);
        updateLevelMap(inputs);

        return;
    }

    const risk =
        Math.abs(
            inputs.entry -
            inputs.stop
        );

    const reward =
        Math.abs(
            inputs.target -
            inputs.entry
        );

    if (risk <= 0) {
        clearResults(
            "Entry and stop must be different."
        );

        return;
    }

    const ratio =
        reward / risk;

    const breakevenWinRate =
        (
            1 /
            (1 + ratio)
        ) *
        100;

    lastResult = {
        risk,
        reward,
        ratio,
        breakevenWinRate
    };

    setText(
        ratioResult,
        `1 : ${formatNumber(ratio)}`
    );

    setText(
        riskResult,
        formatNumber(risk)
    );

    setText(
        rewardResult,
        formatNumber(reward)
    );

    setText(
        breakevenResult,
        `${formatNumber(
            breakevenWinRate
        )}%`
    );

    setText(
        calculationState,
        "Calculated"
    );

    setText(
        resultState,
        `${inputs.direction === "long" ? "Long" : "Short"} · ${formatNumber(ratio)}R`
    );

    resultState?.classList.remove(
        "invalid"
    );
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

    const entry =
        params.get("entryPrice");

    const stop =
        params.get("stopLoss");

    const target =
        params.get("targetPrice");

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
        stop &&
        stopInput
    ) {
        stopInput.value =
            stop;
    }

    if (
        target &&
        targetInput
    ) {
        targetInput.value =
            target;
    }

    calculate();
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
        entryInput &&
        !entryInput.value
    ) {
        entryInput.value =
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

    if (stopInput) {
        stopInput.value = "";
    }

    if (targetInput) {
        targetInput.value = "";
    }

    setText(
        marketReference,
        "Market —"
    );

    setDirection("long");

    clearResults();

    updateContext(
        getInputs()
    );
};

const openPositionSize = (): void => {
    const inputs =
        getInputs();

    const params =
        new URLSearchParams();

    if (inputs.symbol) {
        params.set(
            "symbol",
            inputs.symbol
        );
    }

    if (inputs.timeframe) {
        params.set(
            "timeframe",
            inputs.timeframe
        );
    }

    params.set(
        "direction",
        inputs.direction
    );

    if (Number.isFinite(inputs.entry)) {
        params.set(
            "entryPrice",
            String(inputs.entry)
        );
    }

    if (Number.isFinite(inputs.stop)) {
        params.set(
            "stopLoss",
            String(inputs.stop)
        );
    }

    window.location.href =
        `position-size.html?${params.toString()}`;
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
    stopInput,
    targetInput
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

positionSizeButton?.addEventListener(
    "click",
    openPositionSize
);

document.addEventListener(
    "trading-tools:market-selected",
    handleMarketSelection
);

mountMarketStrip();

applyContextFromUrl();